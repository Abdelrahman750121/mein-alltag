import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { MAX_BACKUP_BYTES } from "./backup";
export type BackupFile = { name: string; text: string };
export async function exportBackupFile(
  text: string,
  name: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Das Speichern-/Teilen-Menü ist auf diesem Gerät nicht verfügbar.",
    );
  const file = new File(Paths.cache, name);
  await file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "My progress sichern",
  });
}
export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset)
    throw new Error("Die ausgewählte Datei konnte nicht gelesen werden.");
  const file = new File(asset.uri);
  if ((asset.size ?? file.size) > MAX_BACKUP_BYTES)
    throw new Error("Die Sicherung ist zu groß. Erlaubt sind höchstens 5 MB.");
  return { name: asset.name, text: await file.text() };
}
