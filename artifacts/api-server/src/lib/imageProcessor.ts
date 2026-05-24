import sharp from "sharp";

export interface ProcessedImage {
  width: number;
  height: number;
  pixels: string[]; // array of hex color strings, row-major order
}

/**
 * Process a base64-encoded image into a grid of pixel colors.
 * Returns hex color strings for each pixel in row-major order.
 */
export async function processImage(
  base64Data: string,
  targetWidth: number,
  targetHeight: number,
): Promise<ProcessedImage> {
  // Strip data URI prefix if present
  const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const { data } = await sharp(buffer)
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: string[] = [];
  const channels = data.length / (targetWidth * targetHeight);

  for (let i = 0; i < targetWidth * targetHeight; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    pixels.push(hex);
  }

  return { width: targetWidth, height: targetHeight, pixels };
}

/** Generate a random 6-character uppercase access code */
export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Convert linear pixel index to (x, y) coordinates */
export function indexToCoords(index: number, width: number): { x: number; y: number } {
  return { x: index % width, y: Math.floor(index / width) };
}

/** Convert (x, y) coordinates to linear pixel index */
export function coordsToIndex(x: number, y: number, width: number): number {
  return y * width + x;
}
