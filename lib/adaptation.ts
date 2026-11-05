import { cameras, settingRows, type CameraId, type Settings } from "./camera";

export const feedbackOptions = {
  warmer: "Warmer", cooler: "Cooler",
  vivid: "More saturated", muted: "Less saturated",
  contrast: "More contrast", soft: "Less contrast",
  highlights: "Softer highlights", lift: "Lift shadows", deepen: "Deepen shadows",
};
export type Feedback = keyof typeof feedbackOptions;

export function refine(camera: CameraId, current: Settings, feedback: Feedback): Settings {
  const next = { ...current, whiteBalance: { ...current.whiteBalance } };
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  switch (feedback) {
    case "warmer":
    case "cooler": {
      const step = feedback === "warmer" ? 1 : -1;
      next.whiteBalance.red = clamp(next.whiteBalance.red + step, -9, 9);
      next.whiteBalance.blue = clamp(next.whiteBalance.blue - step, -9, 9);
      break;
    }
    case "vivid":
    case "muted":
      if (next.color !== null) next.color = clamp(next.color + (feedback === "vivid" ? 1 : -1), -4, 4);
      break;
    case "contrast":
    case "soft": {
      const step = feedback === "contrast" ? 1 : -1;
      next.highlight = clamp(next.highlight + step, -2, 4);
      next.shadow = clamp(next.shadow + step, -2, 4);
      break;
    }
    case "highlights":
      next.highlight = clamp(next.highlight - 1, -2, 4);
      break;
    case "lift":
    case "deepen":
      next.shadow = clamp(next.shadow + (feedback === "lift" ? -1 : 1), -2, 4);
      break;
  }
  return cameras[camera].settings.parse(next);
}

export function changesFrom(original: Settings, revised: Settings) {
  const base = new Map(settingRows(original));
  return settingRows(revised).flatMap(([label, value]) =>
    base.get(label) === value ? [] : [{ label, original: base.get(label), value }]);
}
