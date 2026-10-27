import type { Progress } from "./tasks";
export async function requestReminderPermission(): Promise<boolean> {
  return false;
}
export async function syncReminders(_progress: Progress): Promise<void> {}
