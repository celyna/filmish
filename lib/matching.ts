import { cameras, isMonochrome, type CameraId } from "./camera";
import type { Analysis, CatalogRecipe, Profile, Recommendation } from "./recipe";

function distance(reference: Profile, candidate: Profile) {
  const union = new Set([...reference.tags, ...candidate.tags]);
  const overlap = new Set(reference.tags.filter(tag => candidate.tags.includes(tag))).size;
  const tagDistance = union.size ? 1 - overlap / union.size : 0;
  return 0.25 * Math.abs(reference.saturation - candidate.saturation)
    + 0.20 * Math.abs(reference.contrast - candidate.contrast)
    + 0.35 * Math.abs(reference.warmth - candidate.warmth) / 2
    + 0.05 * Math.abs(reference.highlights - candidate.highlights)
    + 0.05 * Math.abs(reference.shadows - candidate.shadows)
    + 0.10 * tagDistance;
}

export function findRecipe(analysis: Analysis, recipes: CatalogRecipe[], camera: CameraId):
  { recipe: Recommendation | null; reason?: string } {
  const compatible = recipes.flatMap(recipe => {
    const settings = cameras[camera].settings.safeParse(recipe.settings);
    return settings.success ? [{ ...recipe, settings: settings.data }] : [];
  });
  if (!compatible.length) return { recipe: null, reason: "The catalog has no compatible recipes for this camera." };

  const monochrome = analysis.profile.saturation < 0.065;
  const closest = compatible
    .filter(item => monochrome === isMonochrome(item.settings.simulation))
    .map(item => ({ item, distance: distance(analysis.profile, item.profile) }))
    .sort((a, b) => a.distance - b.distance || a.item.id.localeCompare(b.item.id))[0];
  if (!closest || closest.distance > 0.30) {
    return { recipe: null, reason: "This catalog has no close match for the photo’s color and tones." };
  }

  const { profile, ...recipe } = closest.item;
  const shared = profile.tags.filter(tag => analysis.profile.tags.includes(tag));
  const detail = shared.length ? ` Shared descriptors include ${shared.join(", ")}.` : "";
  return { recipe: { ...recipe, explanation: `This compatible recipe ranked closest on color intensity, warmth and tonal range.${detail}` } };
}
