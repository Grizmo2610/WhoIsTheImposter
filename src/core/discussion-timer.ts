export const DISCUSSION_SECONDS_PER_PLAYER = 45;

export function discussionDurationSeconds(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount)) * DISCUSSION_SECONDS_PER_PLAYER;
}

export function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
