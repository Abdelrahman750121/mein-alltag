import * as DocumentPicker from "expo-document-picker";
import { MAX_BACKUP_BYTES } from "./backup";
export type BackupFile = { name: string; text: string };
export async function exportBackupFile(
  text: string,
  name: string,
): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.file)
    throw new Error("Die ausgewählte Datei konnte nicht gelesen werden.");
  try {
    if (asset.file.size > MAX_BACKUP_BYTES)
      throw new Error(
        "Die Sicherung ist zu groß. Erlaubt sind höchstens 5 MB.",
      );
    return { name: asset.name, text: await asset.file.text() };
  } finally {
    if (asset.uri.startsWith("blob:")) URL.revokeObjectURL(asset.uri);
  }
}
