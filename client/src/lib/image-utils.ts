/**
 * Crops fully transparent padding off a canvas so a signature's bounding box
 * hugs the ink instead of the whole drawing surface.
 * Returns the original canvas when it is blank or already tight.
 */
export function trimTransparentEdges(
  source: HTMLCanvasElement,
  padding = 8
): HTMLCanvasElement {
  const { width, height } = source;
  if (!width || !height) return source;

  const ctx = source.getContext("2d");
  if (!ctx) return source;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return source;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return source;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const trimmed = document.createElement("canvas");
  trimmed.width = maxX - minX + 1;
  trimmed.height = maxY - minY + 1;
  trimmed
    .getContext("2d")!
    .drawImage(
      source,
      minX,
      minY,
      trimmed.width,
      trimmed.height,
      0,
      0,
      trimmed.width,
      trimmed.height
    );

  return trimmed;
}

/** Reads the intrinsic pixel size of a data-URL image. */
export function getImageSize(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Makes near-white pixels transparent. Used for photographed or scanned
 * signatures, which arrive as dark ink on an opaque paper background.
 */
export function removeWhiteBackground(
  dataUrl: string,
  threshold = 220
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        resolve(dataUrl);
        return;
      }

      const px = imageData.data;
      for (let i = 0; i < px.length; i += 4) {
        const luminance = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (luminance >= threshold) {
          px[i + 3] = 0;
        } else if (luminance > threshold - 60) {
          // Feather the edge so strokes don't turn into hard jagged cutouts.
          px[i + 3] = Math.round(
            px[i + 3] * (1 - (luminance - (threshold - 60)) / 60)
          );
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(trimTransparentEdges(canvas).toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
