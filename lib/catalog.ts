import { z } from "zod";
import type { CameraId } from "./camera";
import { fixtures } from "./fixtures";
import { profileSchema, type RecommendationResult } from "./recipe";

const catalogRow = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  creator: z.string().min(1),
  source_url: z.url({ protocol: /^https?$/ }),
  settings: z.unknown(),
  profile: profileSchema,
});

export function catalogMode(): RecommendationResult["catalog"] {
  const catalog = process.env.RECIPE_CATALOG ?? "fixtures";
  if (catalog !== "fixtures" && catalog !== "supabase") throw new Error("Unknown recipe catalog.");
  return catalog;
}

export async function loadCatalog(camera: CameraId) {
  const catalog = catalogMode();
  if (catalog === "fixtures") return { catalog, recipes: camera === "x-t2" ? fixtures : [] };

  const baseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!baseUrl || !key) throw new Error("The Supabase catalog needs its URL and secret key.");
  try {
    const url = new URL("/rest/v1/recipe_catalog", baseUrl);
    url.search = new URLSearchParams({ camera_id: `eq.${camera}`, order: "id.asc" }).toString();
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Catalog request failed.");
    const rows = z.array(z.unknown()).parse(await response.json());
    const recipes = rows.flatMap(row => {
      const parsed = catalogRow.safeParse(row);
      if (!parsed.success) return [];
      const { source_url, ...record } = parsed.data;
      return [{ ...record, sourceUrl: source_url }];
    });
    return { catalog, recipes };
  } catch {
    throw new Error("The recipe catalog could not be loaded.");
  }
}
