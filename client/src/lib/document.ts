import * as pdfjsLib from "pdfjs-dist";
import type { DocumentKind } from "@shared/schema";
import { loadPdfDocument, renderPageToCanvas } from "./pdf-utils";

/**
 * A document the editor can annotate: either a multi-page PDF or a single
 * raster image. Both expose the same page-oriented surface so the editor does
 * not have to branch on kind while laying out or placing elements.
 *
 * Element coordinates are in "page units": PDF points for a PDF, natural
 * pixels for an image.
 */

export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
];

export function detectKind(file: File): DocumentKind | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface EditableDocument {
  kind: DocumentKind;
  pageCount: number;
  /** Page size in page units, 1-indexed. */
  getPageSize(page: number): PageSize;
  /**
   * Renders a page for display.
   * `scale` is a hint; image documents ignore it and return their source.
   */
  renderPage(page: number, scale: number): Promise<string>;
}

class PdfDocumentAdapter implements EditableDocument {
  kind: DocumentKind = "pdf";

  constructor(
    private readonly pdf: pdfjsLib.PDFDocumentProxy,
    private readonly sizes: PageSize[]
  ) {}

  get pageCount() {
    return this.pdf.numPages;
  }

  getPageSize(page: number): PageSize {
    return this.sizes[page - 1] ?? { width: 0, height: 0 };
  }

  async renderPage(page: number, scale: number): Promise<string> {
    const { canvas } = await renderPageToCanvas(this.pdf, page, scale);
    return canvas.toDataURL();
  }
}

class ImageDocumentAdapter implements EditableDocument {
  kind: DocumentKind = "image";
  pageCount = 1;

  constructor(
    private readonly dataUrl: string,
    private readonly size: PageSize
  ) {}

  getPageSize(): PageSize {
    return this.size;
  }

  async renderPage(): Promise<string> {
    // The source is already at full resolution; re-encoding it per zoom step
    // would only lose quality.
    return this.dataUrl;
  }

  get source(): string {
    return this.dataUrl;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function openDocument(file: File): Promise<EditableDocument> {
  const kind = detectKind(file);

  if (kind === "image") {
    const dataUrl = await readAsDataUrl(file);
    const size = await new Promise<PageSize>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = dataUrl;
    });
    return new ImageDocumentAdapter(dataUrl, size);
  }

  if (kind === "pdf") {
    const pdf = await loadPdfDocument(file);
    const sizes: PageSize[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      sizes.push({ width: viewport.width, height: viewport.height });
    }
    return new PdfDocumentAdapter(pdf, sizes);
  }

  throw new Error("Unsupported file type. Upload a PDF or an image.");
}

/** The original data URL of an image document, for compositing on export. */
export function imageSourceOf(doc: EditableDocument): string | null {
  return doc instanceof ImageDocumentAdapter ? doc.source : null;
}

/** Swaps a file's extension, keeping any directory-free base name intact. */
export function withExtension(fileName: string, extension: string): string {
  return `${fileName.replace(/\.[^.]+$/, "")}.${extension}`;
}

export function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}
