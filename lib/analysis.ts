import sharp from "sharp";
import type { Analysis, Profile } from "./recipe";
import { analyzeWithVision } from "./vision";

export class InvalidImage extends Error {}

async function prepareImage(bytes: Buffer) {
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) {
      throw new Error("Unsupported format");
    }
    return await image.rotate().resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#f7f3eb" }).toColourspace("srgb").jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new InvalidImage("Choose a valid still JPEG, PNG or WebP image under 40 megapixels.");
  }
}

async function measure(jpeg: Buffer) {
  const data = await sharp(jpeg).resize({ width: 96, height: 96, fit: "inside" }).raw().toBuffer();
  const luminance = [];
  const bins = new Map<number, { count: number; red: number; green: number; blue: number }>();
  let chroma = 0;
  let cast = 0;
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    luminance.push((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255);
    chroma += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    cast += (r - b) / 255;
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const bin = bins.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bin.count++;
    bin.red += r;
    bin.green += g;
    bin.blue += b;
    bins.set(key, bin);
  }
  luminance.sort((a, b) => a - b);
  const count = luminance.length;
  const saturation = chroma / count;
  const warmth = cast / count;
  const highlights = luminance[Math.floor((count - 1) * 0.9)];
  const shadows = luminance[Math.floor((count - 1) * 0.1)];
  const contrast = highlights - shadows;
  const temperature = warmth > 0.09 ? "warm" : warmth < -0.09 ? "cool" : "neutral";
  const tags: Profile["tags"] = [temperature];
  if (saturation < 0.08) tags.push("monochrome");
  if (saturation < 0.28) tags.push("muted");
  if (saturation > 0.55) tags.push("vivid");
  if (contrast < 0.48) tags.push("soft");
  if (contrast > 0.7) tags.push("crisp");
  const palette = [...bins.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    .map(bin => "#" + [bin.red, bin.green, bin.blue]
      .map(channel => Math.round(channel / bin.count).toString(16).padStart(2, "0")).join(""));
  return {
    profile: { saturation, warmth, highlights, shadows, contrast, tags },
    palette,
    description: `The image has ${temperature} tones, ${Math.round(saturation * 100)}% average color intensity, and a ${Math.round(contrast * 100)}% tonal spread.`,
  };
}

export function analysisMode() {
  const mode = process.env.ANALYSIS_MODE ?? "pixels";
  if (mode !== "pixels" && mode !== "openai") throw new Error("Unknown analysis mode.");
  return mode;
}

export async function analyze(bytes: Buffer): Promise<Analysis> {
  const mode = analysisMode();
  const jpeg = await prepareImage(bytes);
  const measured = await measure(jpeg);
  if (mode === "pixels") return { ...measured, mode };
  const vision = await analyzeWithVision(jpeg);
  // Use a consistent numeric scale across both modes. Vision adds aesthetic tags and description.
  return { mode, palette: measured.palette, description: vision.description,
    profile: { ...measured.profile, tags: [...new Set([...measured.profile.tags, ...vision.profile.tags])] } };
}
