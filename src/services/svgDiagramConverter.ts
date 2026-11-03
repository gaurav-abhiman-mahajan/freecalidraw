import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

type ExcalidrawElementSkeleton = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>[number];

export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function identityMatrix(): TransformMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

export function multiplyMatrix(m1: TransformMatrix, m2: TransformMatrix): TransformMatrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export function applyMatrix(pt: { x: number; y: number }, m: TransformMatrix): { x: number; y: number } {
  return {
    x: m.a * pt.x + m.c * pt.y + m.e,
    y: m.b * pt.x + m.d * pt.y + m.f,
  };
}

export function parseTransform(transformStr: string | null): TransformMatrix {
  if (!transformStr) return identityMatrix();
  let matrix = identityMatrix();
  const regex = /([a-zA-Z]+)\s*\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(transformStr)) !== null) {
    const type = match[1].toLowerCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    let m = identityMatrix();
    if (type === "translate") {
      const tx = args[0] || 0;
      const ty = args[1] !== undefined ? args[1] : 0;
      m = { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
    } else if (type === "scale") {
      const sx = args[0] || 1;
      const sy = args[1] !== undefined ? args[1] : sx;
      m = { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    } else if (type === "matrix" && args.length >= 6) {
      m = {
        a: args[0],
        b: args[1],
        c: args[2],
        d: args[3],
        e: args[4],
        f: args[5],
      };
    } else if (type === "rotate" && args.length >= 1) {
      const angle = (args[0] * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cx = args[1] || 0;
      const cy = args[2] || 0;
      if (cx !== 0 || cy !== 0) {
        // translate(cx, cy) * rotate(angle) * translate(-cx, -cy)
        const t1: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy };
        const rot: TransformMatrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
        const t2: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy };
        m = multiplyMatrix(multiplyMatrix(t1, rot), t2);
      } else {
        m = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      }
    }
    matrix = multiplyMatrix(matrix, m);
  }

  return matrix;
}

export interface SvgParsedNode {
  id: string;
  type: "rectangle" | "ellipse" | "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  roundness: { type: number } | null;
  labelText?: string;
}

export interface SvgParsedConnector {
  id: string;
  type: "arrow" | "line";
  x: number;
  y: number;
  points: [number, number][];
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  startBoxId?: string;
  endBoxId?: string;
  labelText?: string;
  hasArrowhead: boolean;
}

export interface SvgParsedText {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  strokeColor: string;
  associated: boolean;
}

export interface DiagramBreakabilityReport {
  isBreakable: boolean;
  boxCount: number;
  connectorCount: number;
  labelCount: number;
  hasEmbeddedMermaid: boolean;
  reason: string;
}

function cleanColor(val: string | null, fallback: string): string {
  if (!val || val === "none" || val === "transparent") return "transparent";
  val = val.trim();
  if (val.startsWith("#") || val.startsWith("rgb") || val.startsWith("hsl")) {
    return val;
  }
  // Named common colors
  const colorMap: Record<string, string> = {
    black: "#000000",
    white: "#ffffff",
    red: "#e03131",
    blue: "#1971c2",
    green: "#2f9e44",
    gray: "#868e96",
    grey: "#868e96",
    orange: "#f76707",
    yellow: "#fcc419",
  };
  return colorMap[val.toLowerCase()] || fallback;
}

function parsePointsString(pointsStr: string): { x: number; y: number }[] {
  const nums = pointsStr
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !isNaN(n));
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < nums.length - 1; i += 2) {
    result.push({ x: nums[i], y: nums[i + 1] });
  }
  return result;
}

function parsePathPoints(d: string): { points: { x: number; y: number }[]; isClosed: boolean } {
  const points: { x: number; y: number }[] = [];
  let isClosed = false;
  let currX = 0;
  let currY = 0;

  // Simple path parser for M, L, H, V, C, S, Q, T, Z
  const cmdRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match: RegExpExecArray | null;

  while ((match = cmdRegex.exec(d)) !== null) {
    const cmd = match[1];
    const isRel = cmd === cmd.toLowerCase();
    const upper = cmd.toUpperCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (upper === "M") {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRel ? currX + args[i] : args[i];
        const y = isRel ? currY + args[i + 1] : args[i + 1];
        currX = x;
        currY = y;
        points.push({ x, y });
      }
    } else if (upper === "L") {
      for (let i = 0; i < args.length; i += 2) {
        const x = isRel ? currX + args[i] : args[i];
        const y = isRel ? currY + args[i + 1] : args[i + 1];
        currX = x;
        currY = y;
        points.push({ x, y });
      }
    } else if (upper === "H") {
      for (let i = 0; i < args.length; i++) {
        const x = isRel ? currX + args[i] : args[i];
        currX = x;
        points.push({ x: currX, y: currY });
      }
    } else if (upper === "V") {
      for (let i = 0; i < args.length; i++) {
        const y = isRel ? currY + args[i] : args[i];
        currY = y;
        points.push({ x: currX, y: currY });
      }
    } else if (upper === "C") {
      for (let i = 0; i < args.length; i += 6) {
        const endX = isRel ? currX + args[i + 4] : args[i + 4];
        const endY = isRel ? currY + args[i + 5] : args[i + 5];
        currX = endX;
        currY = endY;
        points.push({ x: currX, y: currY });
      }
    } else if (upper === "Q" || upper === "S") {
      for (let i = 0; i < args.length; i += 4) {
        const endX = isRel ? currX + args[i + 2] : args[i + 2];
        const endY = isRel ? currY + args[i + 3] : args[i + 3];
        currX = endX;
        currY = endY;
        points.push({ x: currX, y: currY });
      }
    } else if (upper === "Z") {
      isClosed = true;
    }
  }

  return { points, isClosed };
}

/**
 * Traverses SVG DOM and extracts diagram primitives (boxes, connectors, labels)
 */
export function parseSvgToDiagram(svgString: string): {
  boxes: SvgParsedNode[];
  connectors: SvgParsedConnector[];
  texts: SvgParsedText[];
  report: DiagramBreakabilityReport;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.querySelector("svg");

  const boxes: SvgParsedNode[] = [];
  const connectors: SvgParsedConnector[] = [];
  const texts: SvgParsedText[] = [];

  if (!svgEl) {
    return {
      boxes,
      connectors,
      texts,
      report: {
        isBreakable: false,
        boxCount: 0,
        connectorCount: 0,
        labelCount: 0,
        hasEmbeddedMermaid: false,
        reason: "Invalid SVG: No <svg> root element found.",
      },
    };
  }

  // Check for embedded Mermaid metadata
  const descEl = svgEl.querySelector("desc.mermaid, desc");
  const hasDescMermaid = descEl && (descEl.classList.contains("mermaid") || descEl.textContent?.includes("graph") || descEl.textContent?.includes("flowchart"));
  const hasCommentMermaid = svgString.includes("<!-- mermaid:") || svgString.includes("data-diagram");
  const hasEmbeddedMermaid = Boolean(hasDescMermaid || hasCommentMermaid);

  // SVG overall dimensions
  const viewBoxAttr = svgEl.getAttribute("viewBox");
  let svgW = 1000;
  let svgH = 800;
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4) {
      svgW = parts[2];
      svgH = parts[3];
    }
  }

  let elementCounter = 0;

  // Recursive tree traversal accumulating transform matrices
  function walk(el: Element, currentMatrix: TransformMatrix) {
    const elTransform = parseTransform(el.getAttribute("transform"));
    const localMatrix = multiplyMatrix(currentMatrix, elTransform);
    const tagName = el.tagName.toLowerCase();

    // 1. RECT
    if (tagName === "rect") {
      const rxAttr = Number(el.getAttribute("rx") || 0);
      const ryAttr = Number(el.getAttribute("ry") || 0);
      const rawX = Number(el.getAttribute("x") || 0);
      const rawY = Number(el.getAttribute("y") || 0);
      const rawW = Number(el.getAttribute("width") || 0);
      const rawH = Number(el.getAttribute("height") || 0);

      // Filter out canvas background rectangles
      const isBackground =
        (rawW >= svgW * 0.95 && rawH >= svgH * 0.95) ||
        el.getAttribute("id") === "background" ||
        el.classList.contains("background");

      if (rawW > 15 && rawH > 15 && !isBackground) {
        const p1 = applyMatrix({ x: rawX, y: rawY }, localMatrix);
        const p2 = applyMatrix({ x: rawX + rawW, y: rawY + rawH }, localMatrix);
        const width = Math.abs(p2.x - p1.x);
        const height = Math.abs(p2.y - p1.y);
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);

        const fill = cleanColor(el.getAttribute("fill") || el.getAttribute("style"), "#ffffff");
        const stroke = cleanColor(el.getAttribute("stroke") || el.getAttribute("style"), "#1e1e1e");
        const strokeWidth = Number(el.getAttribute("stroke-width") || 1);
        const dash = el.getAttribute("stroke-dasharray");

        elementCounter++;
        boxes.push({
          id: el.getAttribute("id") || `box_${elementCounter}`,
          type: "rectangle",
          x,
          y,
          width,
          height,
          strokeColor: stroke === "transparent" ? "#1e1e1e" : stroke,
          backgroundColor: fill === "transparent" ? "transparent" : fill,
          strokeWidth: strokeWidth > 2 ? 2 : 1,
          strokeStyle: dash ? "dashed" : "solid",
          roundness: rxAttr > 0 || ryAttr > 0 ? { type: 3 } : null,
        });
      }
    }

    // 2. CIRCLE & ELLIPSE
    else if (tagName === "circle" || tagName === "ellipse") {
      let cx = Number(el.getAttribute("cx") || 0);
      let cy = Number(el.getAttribute("cy") || 0);
      let rx = Number(el.getAttribute("rx") || el.getAttribute("r") || 0);
      let ry = Number(el.getAttribute("ry") || el.getAttribute("r") || 0);

      if (rx > 6 && ry > 6) {
        const center = applyMatrix({ x: cx, y: cy }, localMatrix);
        const edge = applyMatrix({ x: cx + rx, y: cy + ry }, localMatrix);
        const width = Math.abs(edge.x - center.x) * 2;
        const height = Math.abs(edge.y - center.y) * 2;

        const fill = cleanColor(el.getAttribute("fill"), "#ffffff");
        const stroke = cleanColor(el.getAttribute("stroke"), "#1e1e1e");

        elementCounter++;
        boxes.push({
          id: el.getAttribute("id") || `ellipse_${elementCounter}`,
          type: "ellipse",
          x: center.x - width / 2,
          y: center.y - height / 2,
          width,
          height,
          strokeColor: stroke === "transparent" ? "#1e1e1e" : stroke,
          backgroundColor: fill === "transparent" ? "transparent" : fill,
          strokeWidth: 1,
          strokeStyle: "solid",
          roundness: null,
        });
      }
    }

    // 3. POLYGON (Diamond nodes or shapes)
    else if (tagName === "polygon") {
      const pointsAttr = el.getAttribute("points");
      if (pointsAttr) {
        const pts = parsePointsString(pointsAttr).map((p) => applyMatrix(p, localMatrix));
        if (pts.length >= 4) {
          const xs = pts.map((p) => p.x);
          const ys = pts.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const w = maxX - minX;
          const h = maxY - minY;

          // Check if diamond (4 points, midpoint vertices)
          const isDiamond = pts.length === 4 && w > 20 && h > 20;
          if (w > 20 && h > 20) {
            const fill = cleanColor(el.getAttribute("fill"), "#ffffff");
            const stroke = cleanColor(el.getAttribute("stroke"), "#1e1e1e");

            elementCounter++;
            boxes.push({
              id: el.getAttribute("id") || `diamond_${elementCounter}`,
              type: isDiamond ? "diamond" : "rectangle",
              x: minX,
              y: minY,
              width: w,
              height: h,
              strokeColor: stroke === "transparent" ? "#1e1e1e" : stroke,
              backgroundColor: fill === "transparent" ? "transparent" : fill,
              strokeWidth: 1,
              strokeStyle: "solid",
              roundness: null,
            });
          }
        }
      }
    }

    // 4. LINE
    else if (tagName === "line") {
      const x1 = Number(el.getAttribute("x1") || 0);
      const y1 = Number(el.getAttribute("y1") || 0);
      const x2 = Number(el.getAttribute("x2") || 0);
      const y2 = Number(el.getAttribute("y2") || 0);

      const p1 = applyMatrix({ x: x1, y: y1 }, localMatrix);
      const p2 = applyMatrix({ x: x2, y: y2 }, localMatrix);

      const markerEnd = el.getAttribute("marker-end") || el.getAttribute("markerEnd");
      const hasArrow = Boolean(markerEnd);

      elementCounter++;
      connectors.push({
        id: el.getAttribute("id") || `line_${elementCounter}`,
        type: hasArrow ? "arrow" : "line",
        x: p1.x,
        y: p1.y,
        points: [
          [0, 0],
          [p2.x - p1.x, p2.y - p1.y],
        ],
        strokeColor: cleanColor(el.getAttribute("stroke"), "#1e1e1e"),
        strokeWidth: 1,
        strokeStyle: el.getAttribute("stroke-dasharray") ? "dashed" : "solid",
        hasArrowhead: hasArrow,
      });
    }

    // 5. POLYLINE
    else if (tagName === "polyline") {
      const pointsAttr = el.getAttribute("points");
      if (pointsAttr) {
        const pts = parsePointsString(pointsAttr).map((p) => applyMatrix(p, localMatrix));
        if (pts.length >= 2) {
          const startPt = pts[0];
          const relPoints: [number, number][] = pts.map((p) => [p.x - startPt.x, p.y - startPt.y]);
          const markerEnd = el.getAttribute("marker-end");

          elementCounter++;
          connectors.push({
            id: el.getAttribute("id") || `polyline_${elementCounter}`,
            type: markerEnd ? "arrow" : "line",
            x: startPt.x,
            y: startPt.y,
            points: relPoints,
            strokeColor: cleanColor(el.getAttribute("stroke"), "#1e1e1e"),
            strokeWidth: 1,
            strokeStyle: el.getAttribute("stroke-dasharray") ? "dashed" : "solid",
            hasArrowhead: Boolean(markerEnd),
          });
        }
      }
    }

    // 6. PATH (Connectors, Edges, or Closed Shapes like Cylinders)
    else if (tagName === "path") {
      const d = el.getAttribute("d");
      const markerEnd = el.getAttribute("marker-end") || el.getAttribute("markerEnd");
      const className = el.getAttribute("class") || "";
      const isEdgeClass =
        className.includes("flowchart-link") ||
        className.includes("edge") ||
        className.includes("path") ||
        className.includes("link") ||
        className.includes("arrow") ||
        className.includes("transition");

      if (d) {
        const { points: rawPts, isClosed } = parsePathPoints(d);
        const pts = rawPts.map((p) => applyMatrix(p, localMatrix));

        if (pts.length >= 2) {
          if (!isClosed || isEdgeClass) {
            // It's a connector / arrow path!
            const startPt = pts[0];
            const relPoints: [number, number][] = pts.map((p) => [p.x - startPt.x, p.y - startPt.y]);
            const hasArrow = Boolean(markerEnd || isEdgeClass || className.includes("arrow"));

            elementCounter++;
            connectors.push({
              id: el.getAttribute("id") || `edge_${elementCounter}`,
              type: hasArrow ? "arrow" : "line",
              x: startPt.x,
              y: startPt.y,
              points: relPoints,
              strokeColor: cleanColor(el.getAttribute("stroke"), "#1e1e1e"),
              strokeWidth: 1,
              strokeStyle: el.getAttribute("stroke-dasharray") ? "dashed" : "solid",
              hasArrowhead: hasArrow,
            });
          } else if (isClosed && pts.length >= 3) {
            // Closed path shape (like database cylinder or rounded container)
            const xs = pts.map((p) => p.x);
            const ys = pts.map((p) => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const w = maxX - minX;
            const h = maxY - minY;

            if (w > 20 && h > 20 && w < svgW * 0.95) {
              const fill = cleanColor(el.getAttribute("fill"), "#ffffff");
              const stroke = cleanColor(el.getAttribute("stroke"), "#1e1e1e");

              elementCounter++;
              boxes.push({
                id: el.getAttribute("id") || `shape_${elementCounter}`,
                type: "rectangle",
                x: minX,
                y: minY,
                width: w,
                height: h,
                strokeColor: stroke === "transparent" ? "#1e1e1e" : stroke,
                backgroundColor: fill === "transparent" ? "transparent" : fill,
                strokeWidth: 1,
                strokeStyle: "solid",
                roundness: { type: 3 },
              });
            }
          }
        }
      }
    }

    // 7. TEXT & TSPANS
    else if (tagName === "text") {
      const rawX = Number(el.getAttribute("x") || 0);
      const rawY = Number(el.getAttribute("y") || 0);
      const textPt = applyMatrix({ x: rawX, y: rawY }, localMatrix);

      // Collect text from direct element and child tspans
      let content = "";
      const tspans = el.querySelectorAll("tspan");
      if (tspans.length > 0) {
        content = Array.from(tspans)
          .map((t) => t.textContent?.trim() || "")
          .filter(Boolean)
          .join("\n");
      } else {
        content = el.textContent?.trim() || "";
      }

      if (content) {
        const fontSizeAttr = el.getAttribute("font-size") || "14";
        const fontSize = Math.max(12, Math.min(28, parseFloat(fontSizeAttr) || 14));
        const fill = cleanColor(el.getAttribute("fill"), "#1e1e1e");

        elementCounter++;
        texts.push({
          id: el.getAttribute("id") || `txt_${elementCounter}`,
          text: content,
          x: textPt.x,
          y: textPt.y,
          fontSize,
          strokeColor: fill === "transparent" ? "#1e1e1e" : fill,
          associated: false,
        });
      }
    }

    // 8. FOREIGN OBJECT (Mermaid HTML labels)
    else if (tagName === "foreignobject") {
      const rawX = Number(el.getAttribute("x") || 0);
      const rawY = Number(el.getAttribute("y") || 0);
      const rawW = Number(el.getAttribute("width") || 100);
      const rawH = Number(el.getAttribute("height") || 40);

      const p = applyMatrix({ x: rawX, y: rawY }, localMatrix);
      const content = el.textContent?.trim().replace(/\s+/g, " ") || "";

      if (content && content.length > 0) {
        elementCounter++;
        texts.push({
          id: el.getAttribute("id") || `fo_txt_${elementCounter}`,
          text: content,
          x: p.x + rawW / 2,
          y: p.y + rawH / 2,
          fontSize: 14,
          strokeColor: "#1e1e1e",
          associated: false,
        });
      }
    }

    // Continue traversing children
    for (let i = 0; i < el.children.length; i++) {
      walk(el.children[i], localMatrix);
    }
  }

  // Walk all children of root SVG
  for (let i = 0; i < svgEl.children.length; i++) {
    walk(svgEl.children[i], identityMatrix());
  }

  // Associate text labels with Box Containers (containment check)
  for (const txt of texts) {
    for (const box of boxes) {
      const padding = 15;
      if (
        txt.x >= box.x - padding &&
        txt.x <= box.x + box.width + padding &&
        txt.y >= box.y - padding &&
        txt.y <= box.y + box.height + padding
      ) {
        box.labelText = box.labelText ? `${box.labelText}\n${txt.text}` : txt.text;
        txt.associated = true;
        break;
      }
    }
  }

  // Associate connectors with start and end boxes (spatial proximity / binding)
  for (const conn of connectors) {
    const startPt = { x: conn.x, y: conn.y };
    const lastRelPt = conn.points[conn.points.length - 1];
    const endPt = { x: conn.x + lastRelPt[0], y: conn.y + lastRelPt[1] };

    let closestStartBox: SvgParsedNode | null = null;
    let minStartDist = 40; // pixel snap threshold

    let closestEndBox: SvgParsedNode | null = null;
    let minEndDist = 40;

    for (const box of boxes) {
      // Distance to box center or bounds
      const boxCenterX = box.x + box.width / 2;
      const boxCenterY = box.y + box.height / 2;

      // Check start point proximity
      const distStart = Math.hypot(startPt.x - boxCenterX, startPt.y - boxCenterY);
      const isStartInside =
        startPt.x >= box.x - 10 &&
        startPt.x <= box.x + box.width + 10 &&
        startPt.y >= box.y - 10 &&
        startPt.y <= box.y + box.height + 10;

      if (isStartInside || distStart < minStartDist + Math.max(box.width, box.height) / 2) {
        closestStartBox = box;
        minStartDist = 0;
      }

      // Check end point proximity
      const distEnd = Math.hypot(endPt.x - boxCenterX, endPt.y - boxCenterY);
      const isEndInside =
        endPt.x >= box.x - 10 &&
        endPt.x <= box.x + box.width + 10 &&
        endPt.y >= box.y - 10 &&
        endPt.y <= box.y + box.height + 10;

      if (isEndInside || distEnd < minEndDist + Math.max(box.width, box.height) / 2) {
        closestEndBox = box;
        minEndDist = 0;
      }
    }

    if (closestStartBox) conn.startBoxId = closestStartBox.id;
    if (closestEndBox) conn.endBoxId = closestEndBox.id;

    // Check for edge label
    const midPt = {
      x: conn.x + lastRelPt[0] / 2,
      y: conn.y + lastRelPt[1] / 2,
    };
    for (const txt of texts) {
      if (!txt.associated) {
        const distToMid = Math.hypot(txt.x - midPt.x, txt.y - midPt.y);
        if (distToMid < 35) {
          conn.labelText = txt.text;
          txt.associated = true;
          break;
        }
      }
    }
  }

  // Assess breakability
  const isBreakable =
    hasEmbeddedMermaid ||
    (boxes.length >= 1 && (boxes.some((b) => Boolean(b.labelText)) || connectors.length >= 1)) ||
    (connectors.length >= 1 && texts.length >= 1);

  let reason = "Diagram structure detected: boxes, connections, and labels.";
  if (!isBreakable) {
    if (boxes.length === 0 && connectors.length === 0) {
      reason = "No diagram shapes or connectors found. This appears to be an icon, photo, or decorative artwork.";
    } else {
      reason = "Insufficient diagram primitives found to reconstruct a connected flow.";
    }
  }

  return {
    boxes,
    connectors,
    texts,
    report: {
      isBreakable,
      boxCount: boxes.length,
      connectorCount: connectors.length,
      labelCount: texts.length,
      hasEmbeddedMermaid,
      reason,
    },
  };
}

/**
 * Compiles parsed SVG primitives into Excalidraw native elements and adds them to the active scene
 */
export async function convertSvgToConnectedDiagram(
  svgString: string,
  api: ExcalidrawImperativeAPI
): Promise<void> {
  const { boxes, connectors, texts } = parseSvgToDiagram(svgString);

  if (boxes.length === 0 && connectors.length === 0 && texts.length === 0) {
    throw new Error("Cannot convert SVG: No diagram elements or text were detected.");
  }

  // Center calculation in current scene
  const appState = api.getAppState();
  const zoom = appState.zoom.value || 1;
  const centerX = -appState.scrollX + appState.width / 2 / zoom;
  const centerY = -appState.scrollY + appState.height / 2 / zoom;

  // Find bounding box of all extracted elements to center them properly
  const allXs: number[] = [];
  const allYs: number[] = [];
  boxes.forEach((b) => {
    allXs.push(b.x, b.x + b.width);
    allYs.push(b.y, b.y + b.height);
  });
  connectors.forEach((c) => {
    allXs.push(c.x);
    allYs.push(c.y);
    c.points.forEach((pt) => {
      allXs.push(c.x + pt[0]);
      allYs.push(c.y + pt[1]);
    });
  });
  texts.filter((t) => !t.associated).forEach((t) => {
    allXs.push(t.x);
    allYs.push(t.y);
  });

  const minX = allXs.length > 0 ? Math.min(...allXs) : 0;
  const maxX = allXs.length > 0 ? Math.max(...allXs) : 800;
  const minY = allYs.length > 0 ? Math.min(...allYs) : 0;
  const maxY = allYs.length > 0 ? Math.max(...allYs) : 600;

  const diagramWidth = maxX - minX || 100;
  const diagramHeight = maxY - minY || 100;

  const offsetX = centerX - diagramWidth / 2 - minX;
  const offsetY = centerY - diagramHeight / 2 - minY;

  const skeletons: ExcalidrawElementSkeleton[] = [];

  // 1. Generate Boxes Skeletons
  for (const box of boxes) {
    skeletons.push({
      type: box.type,
      id: box.id,
      x: Math.round(box.x + offsetX),
      y: Math.round(box.y + offsetY),
      width: Math.max(30, Math.round(box.width)),
      height: Math.max(20, Math.round(box.height)),
      strokeColor: box.strokeColor,
      backgroundColor: box.backgroundColor,
      fillStyle: box.backgroundColor === "transparent" ? "solid" : "solid",
      strokeWidth: box.strokeWidth,
      strokeStyle: box.strokeStyle,
      roundness: box.roundness ? { type: 3 } : null,
      label: box.labelText
        ? {
            text: box.labelText,
            fontSize: 15,
            textAlign: "center",
            verticalAlign: "middle",
          }
        : undefined,
    });
  }

  // 2. Generate Connectors / Arrows Skeletons with Bindings
  for (const conn of connectors) {
    skeletons.push({
      type: conn.hasArrowhead ? "arrow" : "line",
      id: conn.id,
      x: Math.round(conn.x + offsetX),
      y: Math.round(conn.y + offsetY),
      points: conn.points.map(([px, py]) => [Math.round(px), Math.round(py)]),
      strokeColor: conn.strokeColor,
      strokeWidth: conn.strokeWidth,
      strokeStyle: conn.strokeStyle,
      start: conn.startBoxId ? { id: conn.startBoxId } : undefined,
      end: conn.endBoxId ? { id: conn.endBoxId } : undefined,
      label: conn.labelText
        ? {
            text: conn.labelText,
            fontSize: 13,
            textAlign: "center",
          }
        : undefined,
    });
  }

  // 3. Generate Standalone Text Skeletons
  for (const txt of texts) {
    if (!txt.associated) {
      skeletons.push({
        type: "text",
        id: txt.id,
        x: Math.round(txt.x + offsetX),
        y: Math.round(txt.y + offsetY),
        text: txt.text,
        fontSize: txt.fontSize,
        strokeColor: txt.strokeColor,
      });
    }
  }

  // Convert skeletons using Excalidraw's official engine
  const generatedElements = convertToExcalidrawElements(skeletons, {
    regenerateIds: false,
  });

  const existingElements = api.getSceneElements();
  api.updateScene({
    elements: [...existingElements, ...(generatedElements as ExcalidrawElement[])],
  });
}
