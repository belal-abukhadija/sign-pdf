import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import type { TextElement, SignatureElement, ImageElement } from '@shared/schema';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const NOTO_SANS_ARABIC_BOLD_URL = 'https://fonts.gstatic.com/s/notosansarabic/v28/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf';

let arabicFontLoaded = false;

async function loadArabicFontToDocument(): Promise<void> {
  if (arabicFontLoaded) return;
  
  try {
    const fontFace = new FontFace('Noto Sans Arabic Bold', `url(${NOTO_SANS_ARABIC_BOLD_URL})`, {
      weight: '700'
    });
    await fontFace.load();
    document.fonts.add(fontFace);
    arabicFontLoaded = true;
  } catch (err) {
    console.error('Failed to load Arabic font:', err);
  }
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

async function renderTextToImage(
  text: string, 
  fontSize: number, 
  color: string,
  fontFamily: string
): Promise<{ imageData: Uint8Array; width: number; height: number }> {
  await loadArabicFontToDocument();
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const isArabic = containsArabic(text);
  const font = isArabic ? `bold ${fontSize * 2}px 'Noto Sans Arabic Bold', Arial` : `${fontSize * 2}px ${fontFamily}, Arial`;
  ctx.font = font;
  
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width) + 20;
  const textHeight = Math.ceil(fontSize * 2.5);
  
  canvas.width = textWidth;
  canvas.height = textHeight;
  
  ctx.font = font;
  ctx.fillStyle = color;
  if (isArabic) {
    ctx.font = `bold ${fontSize * 2}px 'Noto Sans Arabic Bold', Arial`;
  }
  ctx.textBaseline = 'top';
  
  if (isArabic) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText(text, textWidth - 10, fontSize * 0.3);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(text, 10, fontSize * 0.3);
  }
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then(buffer => {
          resolve({
            imageData: new Uint8Array(buffer),
            width: textWidth / 2,
            height: textHeight / 2
          });
        });
      } else {
        reject(new Error('Failed to render text to image'));
      }
    }, 'image/png');
  });
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

async function dataUrlToImageBytes(dataUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
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
    
    for (const textEl of textElements) {
      if (textEl.page <= pages.length) {
        const page = pages[textEl.page - 1];
        const { height: pageHeight } = page.getSize();
        
        try {
          const { imageData, width, height } = await renderTextToImage(
            textEl.content,
            textEl.fontSize,
            textEl.color,
            textEl.fontFamily || 'Arial'
          );
          
          const textImage = await pdfDoc.embedPng(imageData);
          
          page.drawImage(textImage, {
            x: textEl.x,
            y: pageHeight - textEl.y - height,
            width: width,
            height: height,
          });
        } catch (err) {
          console.error('Failed to render text:', err);
        }
      }
    }
    
    for (const sigEl of signatureElements) {
      if (sigEl.page <= pages.length) {
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
    }
    
    for (const imgEl of imageElements) {
      if (imgEl.page <= pages.length) {
        const page = pages[imgEl.page - 1];
        const { height: pageHeight } = page.getSize();

        try {
          const imageBytes = await dataUrlToImageBytes(imgEl.imageData);
          let embeddedImage;
          try {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } catch {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }

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
    }

    return pdfDoc.save();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during PDF export';
    throw new Error(`PDF Export Error: ${message}`);
  }
}

export function downloadPdf(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
