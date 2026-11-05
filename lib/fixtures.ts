import type { Settings } from "./camera";
import type { CatalogRecipe, Profile } from "./recipe";

const baseline: Settings = {
  simulation: "Provia", whiteBalance: { mode: "Auto", red: 0, blue: 0 },
  dynamicRange: "DR100", highlight: 0, shadow: 0, color: 0, sharpness: 0,
  noiseReduction: -2, grain: "Off",
};

function fixture(id: string, name: string, settings: Partial<Settings>, profile: Profile): CatalogRecipe {
  return { id, name, creator: "filmish. (local fixture)", sourceUrl: null,
    settings: { ...baseline, ...settings }, profile };
}

// Original development examples with hand-assigned retrieval descriptors.
export const fixtures = [
  fixture("paper-light", "Paper Light",
    { simulation: "Pro Neg. Std", highlight: -2, shadow: -1, color: -1, sharpness: -1 },
    { warmth: 0.04, saturation: 0.19, contrast: 0.41, highlights: 0.83, shadows: 0.42, tags: ["neutral", "muted", "soft"] }),
  fixture("amber-hour", "Amber Hour",
    { simulation: "Astia", whiteBalance: { mode: "Daylight", red: 3, blue: -3 }, highlight: -1, color: 1, grain: "Weak" },
    { warmth: 0.48, saturation: 0.42, contrast: 0.62, highlights: 0.86, shadows: 0.24, tags: ["warm"] }),
  fixture("blue-hour", "Blue Hour",
    { simulation: "Classic Chrome", whiteBalance: { mode: "Auto", red: -2, blue: 3 }, shadow: 1, color: -2, grain: "Weak" },
    { warmth: -0.39, saturation: 0.24, contrast: 0.53, highlights: 0.62, shadows: 0.09, tags: ["cool", "muted"] }),
  fixture("sunday-color", "Sunday Color",
    { simulation: "Velvia", highlight: -1, shadow: 1, color: 2 },
    { warmth: 0, saturation: 0.71, contrast: 0.78, highlights: 0.91, shadows: 0.13, tags: ["neutral", "vivid", "crisp"] }),
  fixture("silver-print", "Silver Print",
    { simulation: "Acros", highlight: -1, shadow: 1, color: null, grain: "Weak" },
    { warmth: 0, saturation: 0, contrast: 0.65, highlights: 0.83, shadows: 0.18, tags: ["neutral", "muted", "monochrome"] }),
];
