import { toPng } from "html-to-image";
import { vegaViews } from "@/components/charts/VegaChart";

const download = (href: string, name: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
};

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

/** The visible view (HTML and canvases) as a PNG at 2x resolution. */
export async function exportPng(node: HTMLElement) {
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  download(dataUrl, `streamsight-${stamp()}@2x.png`);
}

const escapeXml = (s: string) => s.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The view as vector SVG: every Vega chart rendered by Vega's own SVG
 * renderer, placed where it is on screen, plus the cluster-assignment bar
 * (`[data-export-cell]` elements) as rectangles. Other HTML (toolbar,
 * buttons) is not included.
 */
export async function exportSvg(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  const parts: string[] = [];
  for (const [element, view] of vegaViews) {
    if (!node.contains(element)) continue;
    const r = element.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const svg = await view.toSVG();
    parts.push(`<g transform="translate(${r.left - box.left},${r.top - box.top})">${svg}</g>`);
  }
  node.querySelectorAll<HTMLElement>("[data-export-cell]").forEach((cell) => {
    const r = cell.getBoundingClientRect();
    const fill = getComputedStyle(cell).backgroundColor;
    parts.push(
      `<rect x="${r.left - box.left}" y="${r.top - box.top}" width="${r.width}" height="${r.height}" fill="${fill}"><title>${escapeXml(cell.dataset.exportCell ?? "")}</title></rect>`
    );
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  download(url, `streamsight-${stamp()}.svg`);
  URL.revokeObjectURL(url);
}
