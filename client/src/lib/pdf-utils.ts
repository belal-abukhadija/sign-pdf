import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import type { TextElement, SignatureElement, ImageElement } from '@shared/schema';
import {
  FontDefinition,
  embedFont,
  ensurePreviewFont,
  getFont,
  needsFauxBold,
  resolveFontFor,
} from './fonts';
import { resolveDirection, toVisualRuns, type TextDirection } from './bidi-text';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Ratio between font size and line box height. Shared with the on-canvas text
 * element so an element's y coordinate means the same thing in the editor and
 * in the exported file.
 */
export const LINE_HEIGHT_RATIO = 1.25;

export interface EditElements {
  textElements: TextElement[];
  signatureElements: SignatureElement[];
  imageElements: ImageElement[];
}

// --- shared helpers --------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return { r: 0, g: 0, b: 0 };
  const value = parseInt(match[1], 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function textDirectionOf(element: TextElement): "ltr" | "rtl" {
  return resolveDirection(
    element.content,
    (element.direction as TextDirection) ?? "auto"
  );
}

export async function loadPdfDocument(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

export async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  } as Parameters<typeof page.render>[0]).promise;

  return { canvas, width: viewport.width, height: viewport.height };
}

/**
 * Re-encodes a data URL as PNG bytes. The canvas is left transparent before the
 * image is drawn, so any alpha channel in the source survives into the PDF -
 * painting a white backdrop here is what used to give exported signatures an
 * opaque white box.
 */
async function dataUrlToImageBytes(dataUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then(buffer => {
            resolve(new Uint8Array(buffer));
          });
        } else {
          reject(new Error('Failed to convert image'));
        }
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// --- vector text into PDF --------------------------------------------------

/**
 * Draws one text element as real vector text.
 *
 * The string is split into bidirectional runs and each run is drawn separately
 * at its own offset: fontkit shapes each run (giving Arabic its connected
 * forms) while we keep control of their left-to-right order on the page.
 */
function drawTextElement(
  page: PDFPage,
  element: TextElement,
  font: PDFFont,
  definition: FontDefinition,
  pageHeight: number
): void {
  const size = element.fontSize;
  const bold = element.bold === true;
  const { r, g, b } = hexToRgb(element.color);
  const color = rgb(r, g, b);

  // Match the CSS half-leading model used by the editor preview so the
  // exported baseline lands where the user placed it.
  const lineHeight = size * LINE_HEIGHT_RATIO;
  const ascent = font.heightAtSize(size, { descender: false });
  const contentHeight = font.heightAtSize(size);
  const baselineFromTop = (lineHeight - contentHeight) / 2 + ascent;
  const y = pageHeight - element.y - baselineFromTop;

  const runs = toVisualRuns(element.content, textDirectionOf(element));

  let x = element.x;
  for (const run of runs) {
    page.drawText(run.text, { x, y, size, font, color });

    // Families with no bold TTF get a faux bold: the same run redrawn with a
    // hairline offset thickens the strokes without distorting the shaping.
    if (needsFauxBold(definition, bold)) {
      const nudge = size * 0.02;
      page.drawText(run.text, { x: x + nudge, y, size, font, color });
      page.drawText(run.text, { x, y: y + nudge * 0.5, size, font, color });
    }

    x += font.widthOfTextAtSize(run.text, size);
  }
}

/**
 * Last-resort path when a font cannot be fetched: render the text with the
 * browser's own shaper and embed it as an image. Lower quality than vector
 * text, but it keeps Arabic correct when the network is unavailable.
 */
async function rasterizeText(
  element: TextElement
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const definition = resolveFontFor(element.content, element.fontFamily);
  await ensurePreviewFont(definition, element.bold === true).catch(() => {});

  const supersample = 3;
  const size = element.fontSize * supersample;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const weight = element.bold ? '700 ' : '';
  const font = `${weight}${size}px ${definition.cssFamily}`;

  ctx.font = font;
  const metrics = ctx.measureText(element.content);
  const width = Math.ceil(metrics.width) + size * 0.4;
  const height = Math.ceil(element.fontSize * LINE_HEIGHT_RATIO * supersample);

  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const direction = textDirectionOf(element);
  ctx.font = font;
  ctx.fillStyle = element.color;
  ctx.direction = direction;
  ctx.textBaseline = 'middle';
  ctx.textAlign = direction === 'rtl' ? 'right' : 'left';
  ctx.fillText(
    element.content,
    direction === 'rtl' ? canvas.width - size * 0.2 : size * 0.2,
    canvas.height / 2
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) throw new Error('Failed to rasterize text');

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width / supersample,
    height: canvas.height / supersample,
  };
}

// --- PDF export ------------------------------------------------------------

export async function exportPdfWithEdits(
  originalFile: File,
  textElements: TextElement[],
  signatureElements: SignatureElement[],
  imageElements: ImageElement[] = []
): Promise<Uint8Array> {
  try {
    const arrayBuffer = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const fontCache = new Map<string, PDFFont>();

    for (const textEl of textElements) {
      if (textEl.page > pages.length || !textEl.content) continue;
      const page = pages[textEl.page - 1];
      const { height: pageHeight } = page.getSize();

      const definition = resolveFontFor(textEl.content, textEl.fontFamily);
      const bold = textEl.bold === true;

      try {
        const font = await embedFont(pdfDoc, definition, bold, fontCache);
        drawTextElement(page, textEl, font, definition, pageHeight);
      } catch (err) {
        console.warn('Vector text unavailable, rasterizing instead:', err);
        try {
          const { bytes, width, height } = await rasterizeText(textEl);
          const image = await pdfDoc.embedPng(bytes);
          page.drawImage(image, {
            x: textEl.x,
            y: pageHeight - textEl.y - height,
            width,
            height,
          });
        } catch (fallbackErr) {
          console.error('Failed to render text:', fallbackErr);
        }
      }
    }

    for (const sigEl of signatureElements) {
      if (sigEl.page > pages.length) continue;
      const page = pages[sigEl.page - 1];
      const { height: pageHeight } = page.getSize();

      try {
        const imageBytes = await dataUrlToImageBytes(sigEl.signatureData);
        const signatureImage = await pdfDoc.embedPng(imageBytes);
        page.drawImage(signatureImage, {
          x: sigEl.x,
          y: pageHeight - sigEl.y - sigEl.height,
          width: sigEl.width,
          height: sigEl.height,
        });
      } catch (err) {
        console.error('Failed to embed signature:', err);
      }
    }

    for (const imgEl of imageElements) {
      if (imgEl.page > pages.length) continue;
      const page = pages[imgEl.page - 1];
      const { height: pageHeight } = page.getSize();

      try {
        const imageBytes = await dataUrlToImageBytes(imgEl.imageData);
        const embeddedImage = await pdfDoc.embedPng(imageBytes);
        page.drawImage(embeddedImage, {
          x: imgEl.x,
          y: pageHeight - imgEl.y - imgEl.height,
          width: imgEl.width,
          height: imgEl.height,
        });
      } catch (err) {
        console.error('Failed to embed image:', err);
      }
    }

    return pdfDoc.save();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during PDF export';
    throw new Error(`PDF Export Error: ${message}`);
  }
}

// --- image export ----------------------------------------------------------

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Composites the same elements onto a raster image.
 *
 * Canvas does its own Arabic shaping and bidi reordering, so text is drawn as
 * one string here rather than split into runs.
 */
export async function exportImageWithEdits(
  source: string,
  elements: EditElements,
  mimeType: string,
  quality = 0.95
): Promise<Blob> {
  const base = await loadImageElement(source);

  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth || base.width;
  canvas.height = base.naturalHeight || base.height;
  const ctx = canvas.getContext('2d')!;

  // JPEG has no alpha; give it an explicit white ground rather than black.
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

  for (const imgEl of elements.imageElements) {
    try {
      const overlay = await loadImageElement(imgEl.imageData);
      ctx.drawImage(overlay, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
    } catch (err) {
      console.error('Failed to draw image element:', err);
    }
  }

  for (const sigEl of elements.signatureElements) {
    try {
      const overlay = await loadImageElement(sigEl.signatureData);
      ctx.drawImage(overlay, sigEl.x, sigEl.y, sigEl.width, sigEl.height);
    } catch (err) {
      console.error('Failed to draw signature:', err);
    }
  }

  for (const textEl of elements.textElements) {
    if (!textEl.content) continue;
    const definition = resolveFontFor(textEl.content, textEl.fontFamily);
    await ensurePreviewFont(definition, textEl.bold === true).catch(() => {});

    const weight = textEl.bold ? '700 ' : '';
    ctx.font = `${weight}${textEl.fontSize}px ${definition.cssFamily}`;
    ctx.fillStyle = textEl.color;
    ctx.direction = textDirectionOf(textEl);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const metrics = ctx.measureText(textEl.content);
    const ascent = metrics.fontBoundingBoxAscent ?? textEl.fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? textEl.fontSize * 0.2;
    const lineHeight = textEl.fontSize * LINE_HEIGHT_RATIO;
    const baseline =
      textEl.y + (lineHeight - (ascent + descent)) / 2 + ascent;

    // textAlign "left" is a physical value, so x is the left edge in both
    // directions; ctx.direction only drives bidi reordering and shaping.
    ctx.fillText(textEl.content, textEl.x, baseline);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );
  if (!blob) throw new Error('Failed to encode edited image');
  return blob;
}

// --- download --------------------------------------------------------------

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPdf(pdfBytes: Uint8Array, fileName: string) {
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), fileName);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export { getFont };
