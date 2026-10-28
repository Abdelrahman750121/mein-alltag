import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Progress } from "./tasks";
import {
  backupFilename,
  createBackup,
  parseBackup,
  ParsedBackup,
  prepareRestoration,
} from "./backup";
import { exportBackupFile, pickBackupFile } from "./backup-files";
import { requestReminderPermission } from "./reminders";
import { buildReminderPlans } from "./notification-plans";
export default function BackupPanel({
  progress,
  loading,
  onRestore,
}: {
  progress: Progress | null;
  loading: boolean;
  onRestore(progress: Progress): Promise<void>;
}) {
  const [busy, setBusy] = useState<"export" | "pick" | "restore" | null>(null);
  const [pending, setPending] = useState<
    (ParsedBackup & { name: string }) | null
  >(null);
  const [includeReminders, setIncludeReminders] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function exportFile() {
    if (!progress || busy) return;
    setBusy("export");
    setError("");
    setMessage("");
    try {
      const now = new Date();
      await exportBackupFile(createBackup(progress, now), backupFilename(now));
      setMessage(
        Platform.OS === "web"
          ? "Der Download wurde angefordert. Bewahre die JSON-Datei an einem sicheren Ort auf."
          : "Das Speichern-/Teilen-Menü wurde geöffnet. Wähle „In Dateien sichern“, um die Sicherung aufzubewahren.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Sicherung konnte nicht exportiert werden.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function selectFile() {
    if (busy || loading) return;
    setBusy("pick");
    setError("");
    setMessage("");
    try {
      const file = await pickBackupFile();
      if (file) {
        setPending({ ...parseBackup(file.text), name: file.name });
        setIncludeReminders(false);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Sicherung konnte nicht gelesen werden.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function confirmRestore() {
    if (!pending || busy) return;
    setBusy("restore");
    setError("");
    try {
      const candidate = prepareRestoration(pending.progress, includeReminders);
      if (
        includeReminders &&
        buildReminderPlans(candidate).length &&
        !(await requestReminderPermission())
      )
        throw new Error(
          "Bitte erlaube Benachrichtigungen oder stelle die Sicherung ohne Erinnerungen wieder her.",
        );
      await onRestore(candidate);
      setPending(null);
      setMessage("Deine Sicherung wurde wiederhergestellt.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Sicherung konnte nicht gespeichert werden. Dein bisheriger Stand bleibt erhalten.",
      );
    } finally {
      setBusy(null);
    }
  }
  function cancel() {
    if (busy !== "restore") {
      setPending(null);
      setError("");
    }
  }
  const reminderCount =
    pending?.progress.tasks.filter((task) => task.reminder !== null).length ??
    0;
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Deine Datensicherung</Text>
      <Text style={styles.note}>
        Exportiere Aufgaben, Kategorien, Verlauf und Einstellungen als
        JSON-Datei. Du kannst sie später wieder laden.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sicherung exportieren"
        disabled={!progress || !!busy || loading}
        onPress={() => void exportFile()}
        style={[
          styles.button,
          (!progress || !!busy || loading) && styles.disabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {busy === "export"
            ? "Export wird vorbereitet …"
            : "Sicherung exportieren"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sicherung laden"
        disabled={!!busy || loading}
        onPress={() => void selectFile()}
        style={[styles.secondary, (!!busy || loading) && styles.disabled]}
      >
        <Text style={styles.secondaryText}>
          {busy === "pick" ? "Datei wird geprüft …" : "Sicherung laden"}
        </Text>
      </Pressable>
      <Text style={styles.small}>
        Die Datei enthält deine persönlichen Aufgaben und ist nicht
        verschlüsselt. Deine Daten werden nur an den von dir gewählten
        Speicherort oder Empfänger weitergegeben.
      </Text>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {message}
        </Text>
      )}
      {!!error && !pending && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Modal
        visible={!!pending}
        transparent
        animationType="fade"
        onRequestClose={cancel}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.heading}>Sicherung wiederherstellen?</Text>
              {pending && (
                <>
                  <Text style={styles.filename}>{pending.name}</Text>
                  <Text style={styles.note}>
                    Gesichert am{" "}
                    {new Date(pending.exportedAt).toLocaleString("de-AT")}.
                  </Text>
                  <Text style={styles.summary}>
                    {pending.progress.tasks.length} Aufgaben ·{" "}
                    {pending.progress.history.length} Erledigungen
                  </Text>
                  <Text style={styles.warning}>
                    {progress
                      ? `Deine aktuellen ${progress.tasks.length} Aufgaben und ${progress.history.length} Verlaufseinträge werden vollständig durch diese Sicherung ersetzt.`
                      : "Der aktuell gespeicherte Stand wird vollständig durch diese Sicherung ersetzt."}{" "}
                    Exportiere deinen aktuellen Stand vorher, wenn du ihn
                    behalten möchtest.
                  </Text>
                  {reminderCount > 0 && (
                    <View style={styles.reminders}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reminderLabel}>
                          Erinnerungen übernehmen
                        </Text>
                        <Text style={styles.small}>
                          {Platform.OS === "web"
                            ? "Erinnerungen können in der iPhone-App aktiviert werden."
                            : "Standardmäßig ausgeschaltet. Beim Aktivieren fragt dein iPhone nach der Berechtigung."}
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel="Erinnerungen aus Sicherung übernehmen"
                        value={includeReminders}
                        onValueChange={setIncludeReminders}
                        disabled={Platform.OS === "web" || !!busy}
                        trackColor={{ false: "#DCE2D4", true: "#547D48" }}
                      />
                    </View>
                  )}
                </>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sicherung bestätigen und Daten ersetzen"
                disabled={!!busy}
                onPress={() => void confirmRestore()}
                style={[styles.button, !!busy && styles.disabled]}
              >
                <Text style={styles.buttonText}>
                  {busy === "restore"
                    ? "Wird wiederhergestellt …"
                    : "Daten ersetzen"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Wiederherstellung abbrechen"
                disabled={!!busy}
                onPress={cancel}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Abbrechen</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    borderColor: "#DCE2D4",
    marginTop: 18,
    paddingTop: 25,
    paddingBottom: 5,
  },
  heading: { color: "#203C30", fontSize: 21, fontWeight: "700" },
  note: { color: "#6D796C", fontSize: 13, lineHeight: 21, marginTop: 10 },
  small: { color: "#6D796C", fontSize: 11, lineHeight: 18, marginTop: 9 },
  button: {
    minHeight: 48,
    backgroundColor: "#244F3D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  secondary: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E9EEDF",
    marginTop: 9,
  },
  secondaryText: { color: "#244F3D", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  success: { color: "#3F6837", lineHeight: 21, fontSize: 13, marginTop: 14 },
  error: { color: "#814124", lineHeight: 21, fontSize: 13, marginTop: 14 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18,39,28,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    backgroundColor: "#F7F8F2",
    borderRadius: 24,
    padding: 24,
  },
  filename: { color: "#526747", fontSize: 12, marginTop: 15, lineHeight: 20 },
  summary: { color: "#244F3D", fontWeight: "700", fontSize: 16, marginTop: 18 },
  warning: {
    backgroundColor: "#FFF0E5",
    color: "#814124",
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 16,
  },
  reminders: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  reminderLabel: { color: "#203C30", fontSize: 14, fontWeight: "600" },
});
