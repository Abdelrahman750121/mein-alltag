import { decodeProgress, STORAGE_KEY } from "./tasks.ts";
import type { Progress } from "./tasks.ts";
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const PRE_RESTORE_KEY = "mein-alltag.before-restore.v4";
export type ParsedBackup = { exportedAt: string; progress: Progress };
function byteLength(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > MAX_BACKUP_BYTES) return bytes;
  }
  return bytes;
}
export function assertBackupSize(text: string): void {
  if (text.length > MAX_BACKUP_BYTES || byteLength(text) > MAX_BACKUP_BYTES)
    throw new Error("Die Sicherung ist zu groß. Erlaubt sind höchstens 5 MB.");
}
export function backupFilename(now = new Date()): string {
  return `my-progress-sicherung-${now.toISOString().replace(/[:.]/g, "-")}.json`;
}
export function createBackup(progress: Progress, now = new Date()): string {
  const validated = decodeProgress(JSON.stringify(progress));
  const text = JSON.stringify(
    {
      app: "my-progress",
      backupVersion: 1,
      exportedAt: now.toISOString(),
      progress: validated,
    },
    null,
    2,
  );
  assertBackupSize(text);
  return text;
}
export function parseBackup(text: string): ParsedBackup {
  assertBackupSize(text);
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("Die Datei enthält keine gültige JSON-Sicherung.");
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("app" in value) ||
    value.app !== "my-progress" ||
    !("backupVersion" in value) ||
    value.backupVersion !== 1
  )
    throw new Error("Die Datei ist keine unterstützte My-progress-Sicherung.");
  if (
    !("exportedAt" in value) ||
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    new Date(value.exportedAt).toISOString() !== value.exportedAt ||
    !("progress" in value)
  )
    throw new Error(
      "Die Angaben der Sicherungsdatei sind unvollständig oder ungültig.",
    );
  try {
    return {
      exportedAt: value.exportedAt,
      progress: decodeProgress(JSON.stringify(value.progress)),
    };
  } catch {
    throw new Error(
      "Die Sicherung enthält ungültige Aufgaben oder Verlaufsdaten. Deine aktuellen Daten bleiben erhalten.",
    );
  }
}
export function prepareRestoration(
  progress: Progress,
  includeReminders = false,
): Progress {
  const safe = decodeProgress(JSON.stringify(progress));
  return includeReminders
    ? safe
    : {
        ...safe,
        tasks: safe.tasks.map((task) => ({ ...task, reminder: null })),
      };
}
export async function persistRestoration(
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  },
  progress: Progress,
): Promise<Progress> {
  const safe = decodeProgress(JSON.stringify(progress));
  const previous = await storage.getItem(STORAGE_KEY);
  // Retain the previous durable state before replacing the active key.
  if (previous !== null) await storage.setItem(PRE_RESTORE_KEY, previous);
  await storage.setItem(STORAGE_KEY, JSON.stringify(safe));
  return safe;
}
