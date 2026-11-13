import recipes from "../data/open-fuji-recipes.json";
import type { Analysis, Profile } from "./recipe";

type SourceRecipe = (typeof recipes)[number];
export type PhotoRecipe = {
  id: number;
  name: string;
  creator: string;
  generation: string;
  sourceUrl: string;
  settings: [string, string][];
};
export type PhotoRecommendation = {
  analysis: Analysis;
  recipes: PhotoRecipe[];
  catalogSize: number;
};

const simulationProfiles: Record<string, [saturation: number, contrast: number, warmth: number]> = {
  "Pro Neg Std": [.20, .42, .02],
  "PROVIA/Standard": [.33, .55, .02],
  "VELVIA/Vivid": [.58, .70, .03],
  "Classic Chrome": [.23, .60, -.05],
  "ASTIA/Soft": [.36, .49, .06],
  "Classic Neg": [.32, .66, .08],
  "ETERNA/Cinema": [.18, .39, -.04],
  "Pro Neg Hi": [.28, .59, .03],
  SEPIA: [.12, .52, .32],
};

function distance(photo: Profile, recipe: SourceRecipe) {
  // Estimate a look from the published settings. These are not measured sample profiles.
  const [baseColor, baseContrast, baseWarmth] = simulationProfiles[recipe.film] ?? [0, .61, 0];
  const saturation = recipe.type === "blackWhite" ? 0 : Math.max(0, baseColor + recipe.color * .045);
  const contrast = baseContrast + (recipe.highlight + recipe.shadow) * .035;
  const warmth = recipe.type === "blackWhite" ? 0 : baseWarmth + (recipe.wbr - recipe.wbb) * .023;
  return .4 * Math.abs(photo.saturation - saturation) +
    .35 * Math.abs(photo.contrast - contrast) +
    .25 * Math.abs(photo.warmth - warmth);
}

const signed = (value: number) => value > 0 ? `+${value}` : String(value);
const upstream = "https://github.com/matthieurobin/open-fuji-recipes/blob/57e25194d41b109daaf1325fd086a7a232a732af/src/stores/data/recipes.js";

function formatRecipe(recipe: SourceRecipe): PhotoRecipe {
  const settings: PhotoRecipe["settings"] = [
    ["Film simulation", recipe.film],
    ["White balance", recipe.wb],
    ["WB shift", `R ${signed(recipe.wbr)} / B ${signed(recipe.wbb)}`],
    [/^(WEAK|STRONG)$/.test(recipe.dr) ? "D Range Priority" : "Dynamic range", recipe.dr],
    ["Highlight tone", signed(recipe.highlight)],
    ["Shadow tone", signed(recipe.shadow)],
    ["Color", signed(recipe.color)],
    ["Sharpness", signed(recipe.sharp)],
    ["Noise reduction", signed(recipe.nr)],
    ["Grain", recipe.grain.replace(/ l$/, " / large")],
    ["Exposure compensation", String(recipe.ev)],
  ];
  if (recipe.sensor === 4 || recipe.ccfx !== "off") settings.push(["Color Chrome Effect", recipe.ccfx]);
  if (recipe.sensor === 4 || recipe.ccfxb !== "off") settings.push(["Color Chrome FX Blue", recipe.ccfxb]);
  if (recipe.sensor === 4 || recipe.clarity !== 0) settings.push(["Clarity", signed(recipe.clarity)]);
  return {
    id: recipe.id,
    name: recipe.name,
    creator: recipe.creator,
    generation: recipe.sensor === 3 ? "X-Trans III" : "X-Trans IV",
    sourceUrl: `${upstream}#L${recipe.line}`,
    settings,
  };
}

export function matchOpenFuji(profile: Profile): PhotoRecipe[] {
  const monochrome = profile.saturation < .065;
  return recipes
    .filter(recipe => (recipe.type === "blackWhite") === monochrome)
    .map(recipe => ({ recipe, score: distance(profile, recipe) }))
    .sort((a, b) => a.score - b.score || a.recipe.id - b.recipe.id)
    .slice(0, 3)
    .map(({ recipe }) => formatRecipe(recipe));
}

export const openFujiCount = recipes.length;
