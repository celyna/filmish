import { z } from "zod";
import { readFile } from "node:fs/promises";
import { cameraId, cameras, type CameraId } from "./camera";
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

const openFujiExport = z.strictObject({
  permissionBasis: z.string().trim().min(1),
  recipes: z.array(z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    creator: z.string().min(1),
    sourceUrl: z.url({ protocol: /^https?$/ }),
    camera: cameraId,
    settings: z.unknown(),
    profile: profileSchema,
  })).min(1),
});

async function loadOpenFujiExport(camera: CameraId) {
  const path = process.env.OPEN_FUJI_EXPORT_PATH;
  if (!path) throw new Error("The Open Fuji Recipes catalog needs an authorized export file.");
  try {
    const { recipes } = openFujiExport.parse(JSON.parse(await readFile(path, "utf8")));
    const ids = new Set<string>();
    return recipes.flatMap(({ camera: model, ...recipe }) => {
      const key = `${model}:${recipe.id}`;
      if (ids.has(key)) throw new Error("Duplicate recipe ID for camera.");
      ids.add(key);
      const settings = cameras[model].settings.parse(recipe.settings);
      return model === camera ? [{ ...recipe, settings }] : [];
    });
  } catch {
    throw new Error("The Open Fuji Recipes export could not be read or contains invalid recipe records.");
  }
}

export function catalogMode(): RecommendationResult["catalog"] {
  const catalog = process.env.RECIPE_CATALOG ?? "fixtures";
  if (catalog !== "fixtures" && catalog !== "supabase" && catalog !== "open-fuji") throw new Error("Unknown recipe catalog.");
  return catalog;
}

export async function loadCatalog(camera: CameraId) {
  const catalog = catalogMode();
  if (catalog === "fixtures") return { catalog, recipes: fixtures.filter(recipe => cameras[camera].settings.safeParse(recipe.settings).success) };
  if (catalog === "open-fuji") return { catalog, recipes: await loadOpenFujiExport(camera) };

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
