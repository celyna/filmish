import { z } from "zod";

export const grainEffects = ["Off", "Weak", "Strong"] as const;
const tone = z.int().min(-2).max(4);
const detail = z.int().min(-4).max(4);
const shift = z.int().min(-9).max(9);
const kelvin = [2500, 2550, 2650, 2700, 2800, 2850, 2950, 3000, 3100, 3200,
  3300, 3400, 3600, 3700, 3800, 4000, 4200, 4300, 4500, 4800, 5000, 5300,
  5600, 5900, 6300, 6700, 7100, 7700, 8300, 9100, 10000] as const;

const xt2Settings = z.strictObject({
  simulation: z.enum(["Provia", "Velvia", "Astia", "Classic Chrome", "Pro Neg. Hi",
    "Pro Neg. Std", "Acros", "Acros + Ye", "Acros + R", "Acros + G",
    "Monochrome", "Monochrome + Ye", "Monochrome + R", "Monochrome + G", "Sepia"]),
  whiteBalance: z.discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("Kelvin"), kelvin: z.literal(kelvin), red: shift, blue: shift }),
    z.strictObject({
      mode: z.enum(["Auto", "Daylight", "Shade", "Fluorescent 1", "Fluorescent 2",
        "Fluorescent 3", "Incandescent", "Underwater", "Custom 1", "Custom 2", "Custom 3"]),
      red: shift, blue: shift,
    }),
  ]),
  dynamicRange: z.enum(["Auto", "DR100", "DR200", "DR400"]),
  highlight: tone,
  shadow: tone,
  color: detail.nullable(),
  sharpness: detail,
  noiseReduction: detail,
  grain: z.enum(grainEffects),
}).refine(({ simulation, color }) => isMonochrome(simulation) === (color === null), {
  path: ["color"], message: "Color must be omitted from monochrome camera output.",
});

export function isMonochrome(simulation: string) {
  return /^(Acros|Monochrome|Sepia)/.test(simulation);
}

export const cameras = {
  "x-t2": { name: "Fujifilm X-T2", generation: "X-Trans III", settings: xt2Settings },
};

export const cameraId = z.enum(Object.keys(cameras) as [keyof typeof cameras]);
export type CameraId = z.infer<typeof cameraId>;
export type Settings = z.infer<typeof xt2Settings>;

export function settingRows(settings: Settings): [string, string][] {
  const signed = (n: number) => n > 0 ? `+${n}` : String(n);
  const wb = settings.whiteBalance;
  return [
    ["Film simulation", settings.simulation],
    ["White balance", wb.mode === "Kelvin" ? `${wb.kelvin} K` : wb.mode],
    ["WB shift", `R ${signed(wb.red)} / B ${signed(wb.blue)}`],
    ["Dynamic range", settings.dynamicRange],
    ["Highlight tone", signed(settings.highlight)],
    ["Shadow tone", signed(settings.shadow)],
    ...(settings.color === null ? [] : [["Color", signed(settings.color)] as [string, string]]),
    ["Sharpness", signed(settings.sharpness)],
    ["Noise reduction", signed(settings.noiseReduction)],
    ["Grain effect", settings.grain],
  ];
}
