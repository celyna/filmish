import { z } from "zod";
import type { Settings } from "./camera";

export const tags = ["warm", "cool", "neutral", "muted", "vivid", "soft", "crisp", "monochrome"] as const;
export const profileSchema = z.strictObject({
  saturation: z.number().min(0).max(1),
  contrast: z.number().min(0).max(1),
  warmth: z.number().min(-1).max(1),
  highlights: z.number().min(0).max(1),
  shadows: z.number().min(0).max(1),
  tags: z.array(z.enum(tags)).max(tags.length),
});
export type Profile = z.infer<typeof profileSchema>;
export type Analysis = {
  profile: Profile;
  palette: string[];
  mode: "pixels" | "openai";
  description: string;
};
export type CatalogRecipe = {
  id: string;
  name: string;
  creator: string;
  sourceUrl: string | null;
  settings: unknown;
  profile: Profile;
};
export type Recommendation = Omit<CatalogRecipe, "profile" | "settings"> & {
  settings: Settings;
  explanation: string;
};
export type RecommendationResult = {
  analysis: Analysis;
  catalog: "fixtures" | "supabase";
  recipe: Recommendation | null;
  reason?: string;
};
