import { analyze, InvalidImage } from "@/lib/analysis";
import { cameraId } from "@/lib/camera";
import { loadCatalog } from "@/lib/catalog";
import { findRecipe } from "@/lib/matching";
import { imageTypes, maxUploadBytes } from "@/lib/upload";
import type { RecommendationResult } from "@/lib/recipe";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  const fail = (error: string, status: number) => Response.json({ error }, { status });
  if (Number(request.headers.get("content-length")) > maxUploadBytes + 16 * 1024) {
    return fail("Choose a photo up to 4 MB.", 413);
  }
  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  const camera = cameraId.safeParse(form?.get("camera"));
  if (!camera.success) return fail("Select a supported Fujifilm camera.", 400);
  if (!(photo instanceof File) || !photo.size || !imageTypes.includes(photo.type)) {
    return fail("Choose a JPEG, PNG or WebP photo.", 400);
  }
  if (photo.size > maxUploadBytes) return fail("Choose a photo up to 4 MB.", 413);

  try {
    const { catalog, recipes } = await loadCatalog(camera.data);
    const analysis = await analyze(Buffer.from(await photo.arrayBuffer()));
    const result: RecommendationResult = { analysis, catalog, ...findRecipe(analysis, recipes, camera.data) };
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvalidImage) return fail(error.message, 400);
    return fail(error instanceof Error ? error.message : "The recipe request failed.", 503);
  }
}
