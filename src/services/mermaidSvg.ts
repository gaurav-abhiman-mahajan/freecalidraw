import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawElement, ExcalidrawImageElement, FileId } from "@excalidraw/excalidraw/element/types";
import {
  parseSvgToDiagram,
  convertSvgToConnectedDiagram,
  DiagramBreakabilityReport,
} from "./svgDiagramConverter";

export interface SvgInspectionResult {
  isSvg: boolean;
  hasMermaidSource: boolean;
  mermaidSource: string | null;
  width: number;
  height: number;
  hasForeignObject: boolean;
  warnings: string[];
  isBreakable: boolean;
  breakdown: DiagramBreakabilityReport;
}

/**
 * Inspect an SVG string for compatibility with Excalidraw, detect embedded Mermaid definitions,
 * and test breakability into connected diagram primitives (boxes, arrows, text).
 */
export function inspectMermaidSvg(rawSvg: string): SvgInspectionResult {
  const warnings: string[] = [];
  const trimmed = rawSvg.trim();

  if (!trimmed.includes("<svg") || !trimmed.includes("</svg>")) {
    return {
      isSvg: false,
      hasMermaidSource: false,
      mermaidSource: null,
      width: 0,
      height: 0,
      hasForeignObject: false,
      warnings: ["The provided text is not valid SVG XML."],
      isBreakable: false,
      breakdown: {
        isBreakable: false,
        boxCount: 0,
        connectorCount: 0,
        labelCount: 0,
        hasEmbeddedMermaid: false,
        reason: "Invalid SVG format.",
      },
    };
  }

  // 1. Detect embedded Mermaid definition
  let mermaidSource: string | null = null;

  // Look in <desc class="mermaid">...</desc> or <desc>...</desc>
  const descMatch =
    trimmed.match(/<desc[^>]*class=["'][^"']*mermaid[^"']*["'][^>]*>([\s\S]*?)<\/desc>/i) ||
    trimmed.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
  if (descMatch && descMatch[1]) {
    const candidate = descMatch[1].trim();
    if (isMermaidSyntax(candidate)) {
      mermaidSource = candidate;
    }
  }

  // Look in HTML comments <!-- mermaid: ... -->
  if (!mermaidSource) {
    const commentMatch = trimmed.match(/<!--\s*mermaid(?:-source)?:\s*([\s\S]*?)-->/i);
    if (commentMatch && commentMatch[1]) {
      const candidate = commentMatch[1].trim();
      if (isMermaidSyntax(candidate)) {
        mermaidSource = candidate;
      }
    }
  }

  // Look in data-diagram or data-mermaid attributes
  if (!mermaidSource) {
    const attrMatch = trimmed.match(/data-(?:diagram|mermaid)=["']([\s\S]*?)["']/i);
    if (attrMatch && attrMatch[1]) {
      try {
        const decoded = decodeURIComponent(attrMatch[1]);
        if (isMermaidSyntax(decoded)) {
          mermaidSource = decoded;
        }
      } catch {
        if (isMermaidSyntax(attrMatch[1])) {
          mermaidSource = attrMatch[1];
        }
      }
    }
  }

  // 2. Parse SVG dimensions and attributes
  let width = 800;
  let height = 600;
  const hasForeignObject = trimmed.includes("<foreignObject");

  const viewBoxMatch = trimmed.match(
    /viewBox=["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\s*["']/i
  );
  if (viewBoxMatch) {
    const vbWidth = parseFloat(viewBoxMatch[3]);
    const vbHeight = parseFloat(viewBoxMatch[4]);
    if (!isNaN(vbWidth) && vbWidth > 0 && !isNaN(vbHeight) && vbHeight > 0) {
      width = vbWidth;
      height = vbHeight;
    }
  } else {
    warnings.push("SVG lacks a viewBox attribute. Scaling might be non-standard.");
  }

  const widthMatch = trimmed.match(/\bwidth=["']([\d.]+)(?:px)?["']/i);
  const heightMatch = trimmed.match(/\bheight=["']([\d.]+)(?:px)?["']/i);
  if (widthMatch && parseFloat(widthMatch[1]) > 0) {
    width = parseFloat(widthMatch[1]);
  }
  if (heightMatch && parseFloat(heightMatch[1]) > 0) {
    height = parseFloat(heightMatch[1]);
  }

  if (trimmed.includes('width="100%"') && !viewBoxMatch) {
    warnings.push("SVG width is set to 100% without a viewBox; normalized to fallback dimensions.");
  }

  // 3. Inspect SVG diagram primitives (geometric breakability analysis)
  const { report } = parseSvgToDiagram(trimmed);
  if (mermaidSource) {
    report.isBreakable = true;
    report.hasEmbeddedMermaid = true;
  }

  return {
    isSvg: true,
    hasMermaidSource: Boolean(mermaidSource),
    mermaidSource,
    width,
    height,
    hasForeignObject,
    warnings,
    isBreakable: report.isBreakable,
    breakdown: report,
  };
}

/**
 * Check if a string looks like valid Mermaid diagram definition.
 */
export function isMermaidSyntax(text: string): boolean {
  const firstLines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (firstLines.length === 0) return false;
  const header = firstLines[0].toLowerCase();

  const keywords = [
    "graph ",
    "graph\n",
    "flowchart",
    "sequencediagram",
    "classDiagram",
    "statediagram",
    "erdiagram",
    "gantt",
    "pie",
    "journey",
    "gitgraph",
    "c4context",
    "architecture-beta",
    "quadrantchart",
    "mindmap",
    "timeline",
    "zenuml",
    "sankey-beta",
    "block-beta",
  ];

  return keywords.some((kw) => header.startsWith(kw.toLowerCase()));
}

/**
 * Sanitize and normalize SVG XML so that HTML5 Canvas and Excalidraw can render it without dimension or namespace errors.
 */
export function sanitizeSvg(svgContent: string): { svg: string; width: number; height: number } {
  const cleaned = svgContent.trim();
  const inspection = inspectMermaidSvg(cleaned);

  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, "image/svg+xml");
  const svgEl = doc.querySelector("svg");

  if (!svgEl) {
    throw new Error("Invalid SVG content");
  }

  // Ensure xmlns is present
  if (!svgEl.getAttribute("xmlns")) {
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  // If foreignObject is used, ensure xmlns:xhtml is defined
  if (svgEl.querySelector("foreignObject") && !svgEl.getAttribute("xmlns:xhtml")) {
    svgEl.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
  }

  // Normalize explicit width and height
  const width = inspection.width;
  const height = inspection.height;

  svgEl.setAttribute("width", `${width}`);
  svgEl.setAttribute("height", `${height}`);

  if (!svgEl.getAttribute("viewBox")) {
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  const serializer = new XMLSerializer();
  return {
    svg: serializer.serializeToString(doc),
    width,
    height,
  };
}

/**
 * Insert an SVG into the Excalidraw canvas as a high-fidelity vector image element.
 */
export async function insertSvgAsImage(
  svgContent: string,
  api: ExcalidrawImperativeAPI
): Promise<void> {
  const { svg, width, height } = sanitizeSvg(svgContent);

  // Convert to base64 data URL
  const encoded = unescape(encodeURIComponent(svg));
  const base64 = btoa(encoded);
  const dataURL = `data:image/svg+xml;base64,${base64}` as any;

  const fileId = ("file_" + Math.random().toString(36).substring(2, 10)) as FileId;

  // Add binary file to Excalidraw
  api.addFiles([
    {
      id: fileId,
      dataURL,
      mimeType: "image/svg+xml",
      created: Date.now(),
      lastRetrieved: Date.now(),
    },
  ]);

  // Compute center position in current scene viewport
  const appState = api.getAppState();
  const zoom = appState.zoom.value || 1;
  const centerX = -appState.scrollX + appState.width / 2 / zoom;
  const centerY = -appState.scrollY + appState.height / 2 / zoom;

  // Scale down if larger than reasonable viewport size
  let renderWidth = width;
  let renderHeight = height;
  const maxInitialDim = 800;
  if (renderWidth > maxInitialDim || renderHeight > maxInitialDim) {
    const scale = Math.min(maxInitialDim / renderWidth, maxInitialDim / renderHeight);
    renderWidth = Math.round(renderWidth * scale);
    renderHeight = Math.round(renderHeight * scale);
  }

  const imageElement: ExcalidrawImageElement = {
    id: "img_" + Math.random().toString(36).substring(2, 10),
    type: "image",
    x: Math.round(centerX - renderWidth / 2),
    y: Math.round(centerY - renderHeight / 2),
    width: renderWidth,
    height: renderHeight,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    index: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fileId,
    status: "saved",
    scale: [1, 1],
    crop: null,
  };

  const currentElements = api.getSceneElements();
  api.updateScene({
    elements: [...currentElements, imageElement],
  });
}

/**
 * Converts an SVG into connected native Excalidraw elements (boxes, connectors, bindings, labels).
 * If embedded Mermaid syntax is found, parses with mermaid-to-excalidraw first;
 * otherwise performs full vector SVG geometric diagram decomposition.
 */
export async function insertSvgAsConnectedDiagram(
  svgString: string,
  api: ExcalidrawImperativeAPI
): Promise<void> {
  const inspection = inspectMermaidSvg(svgString);

  // If embedded Mermaid definition exists, try using official mermaid parser
  if (inspection.hasMermaidSource && inspection.mermaidSource) {
    try {
      await insertMermaidTextAsElements(inspection.mermaidSource, api);
      return;
    } catch (err) {
      console.warn("Embedded mermaid syntax parse failed, falling back to SVG vector parser:", err);
    }
  }

  // Geometric decomposition into connected Excalidraw elements
  await convertSvgToConnectedDiagram(svgString, api);
}

/**
 * Parse Mermaid code syntax directly and insert native Excalidraw elements.
 */
export async function insertMermaidTextAsElements(
  mermaidCode: string,
  api: ExcalidrawImperativeAPI
): Promise<void> {
  const { elements } = await parseMermaidToExcalidraw(mermaidCode);

  const convertedElements = convertToExcalidrawElements(elements as any, {
    regenerateIds: false,
  });

  // Calculate center of current viewport to place diagram
  const appState = api.getAppState();
  const zoom = appState.zoom.value || 1;
  const centerX = -appState.scrollX + appState.width / 2 / zoom;
  const centerY = -appState.scrollY + appState.height / 2 / zoom;

  // Find bounding box of generated elements
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  convertedElements.forEach((el) => {
    minX = Math.min(minX, el.x);
    maxX = Math.max(maxX, el.x + el.width);
    minY = Math.min(minY, el.y);
    maxY = Math.max(maxY, el.y + el.height);
  });

  const diagWidth = maxX - minX || 200;
  const diagHeight = maxY - minY || 200;
  const deltaX = centerX - diagWidth / 2 - minX;
  const deltaY = centerY - diagHeight / 2 - minY;

  const shiftedElements = convertedElements.map((el) => ({
    ...el,
    x: Math.round(el.x + deltaX),
    y: Math.round(el.y + deltaY),
  }));

  const currentElements = api.getSceneElements();
  api.updateScene({
    elements: [...currentElements, ...(shiftedElements as ExcalidrawElement[])],
  });
}
