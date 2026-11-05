import { imageTypes, maxOriginalBytes, maxUploadBytes } from "./upload";

const maxDimension = 1600;
const maxOriginalPixels = 80_000_000;

export async function resizeImage(file: File) {
  if (!imageTypes.includes(file.type) || !file.size) {
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  }
  if (file.size > maxOriginalBytes) {
    throw new Error("Choose a photo up to 30 MB.");
  }

  const source = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = source;
    try {
      await image.decode();
    } catch {
      throw new Error("This photo could not be opened. Try another JPEG, PNG or WebP.");
    }
    if (!image.naturalWidth || !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > maxOriginalPixels) {
      throw new Error("Choose a photo under 80 megapixels.");
    }

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo. Try another browser.");
    // Browser decoding applies the photo's orientation before drawing.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!jpeg || !jpeg.size || jpeg.size > maxUploadBytes) {
      throw new Error("This photo could not be resized for upload. Try a smaller photo.");
    }
    return {
      file: new File([jpeg], "reference.jpg", { type: "image/jpeg" }),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(source);
    image.src = "";
  }
}
