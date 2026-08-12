import { Haptics, ImpactStyle } from "@capacitor/haptics";

export async function haptic(kind: "light" | "medium" | "heavy"): Promise<void> {
  const style = kind === "light" ? ImpactStyle.Light : kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Heavy;
  try { await Haptics.impact({ style }); } catch { /* enhancement only */ }
}

export async function timerAlert(): Promise<void> {
  try { await Haptics.vibrate({ duration: 500 }); } catch { /* enhancement only */ }
}
