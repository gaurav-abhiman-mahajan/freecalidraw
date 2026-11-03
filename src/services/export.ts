import { exportToBlob, exportToSvg, serializeAsJSON } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export interface ExportOptions {
  filename?: string;
  exportBackground?: boolean;
  exportWithDarkMode?: boolean;
  scale?: number;
  viewBackgroundColor?: string;
}

export async function downloadPng(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportBackground: options.exportBackground ?? true,
      exportWithDarkMode: options.exportWithDarkMode ?? false,
      exportScale: options.scale ?? 2,
      viewBackgroundColor: options.viewBackgroundColor || appState.viewBackgroundColor || "#ffffff",
    },
    files,
    mimeType: "image/png",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${options.filename || "drawing"}.png`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function copyPngToClipboard(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportBackground: options.exportBackground ?? true,
      exportWithDarkMode: options.exportWithDarkMode ?? false,
      exportScale: options.scale ?? 2,
      viewBackgroundColor: options.viewBackgroundColor || appState.viewBackgroundColor || "#ffffff",
    },
    files,
    mimeType: "image/png",
  });

  if (navigator.clipboard && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
  } else {
    throw new Error("Clipboard API not supported in this browser context");
  }
}

export async function downloadSvg(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  options: ExportOptions = {}
): Promise<void> {
  const svg = await exportToSvg({
    elements,
    appState: {
      ...appState,
      exportBackground: options.exportBackground ?? true,
      exportWithDarkMode: options.exportWithDarkMode ?? false,
      exportScale: options.scale ?? 1,
      viewBackgroundColor: options.viewBackgroundColor || appState.viewBackgroundColor || "#ffffff",
    },
    files,
  });

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${options.filename || "drawing"}.svg`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function downloadJson(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  filename = "drawing"
): void {
  const json = serializeAsJSON(elements, appState as AppState, files, "local");
  const blob = new Blob([json], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.excalidraw`;
  a.click();
  window.URL.revokeObjectURL(url);
}
