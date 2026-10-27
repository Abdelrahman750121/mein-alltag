import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatTime, makeReminder, Reminder, Task } from "./tasks";
import { requestReminderPermission } from "./reminders";
export default function TaskSettings({
  task,
  onSave,
  onClose,
}: {
  task: Task;
  onSave(settings: { daily: boolean; reminder: Reminder | null }): void;
  onClose(): void;
}) {
  const [daily, setDaily] = useState(task.daily);
  const [enabled, setEnabled] = useState(task.reminder !== null);
  const [time, setTime] = useState(
    task.reminder ? formatTime(task.reminder) : "18:00",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let reminder: Reminder | null = null;
      if (enabled) {
        reminder = makeReminder(time, daily);
        if (task.done && !daily)
          throw new Error(
            "Öffne die erledigte Aufgabe zuerst wieder, bevor du eine einmalige Erinnerung einstellst.",
          );
        if (!(await requestReminderPermission()))
          throw new Error(
            "Bitte erlaube Benachrichtigungen auf deinem iPhone. Du kannst sie in den Einstellungen für Expo Go bzw. My progress freigeben.",
          );
      }
      onSave({ daily, reminder });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die Erinnerung konnte nicht eingerichtet werden.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.eyebrow}>AUFGABEN-EINSTELLUNGEN</Text>
            <Text style={styles.title}>{task.title}</Text>
            <View style={styles.setting}>
              <View style={styles.copy}>
                <Text style={styles.label}>Täglich wiederholen</Text>
                <Text style={styles.note}>
                  An jedem neuen Tag wieder offen. Dein Verlauf bleibt erhalten.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Aufgabe täglich wiederholen"
                value={daily}
                onValueChange={setDaily}
                trackColor={{ false: "#DCE2D4", true: "#547D48" }}
              />
            </View>
            <View style={styles.setting}>
              <View style={styles.copy}>
                <Text style={styles.label}>Erinnerung</Text>
                <Text style={styles.note}>
                  {daily
                    ? "Täglich zur eingestellten Uhrzeit."
                    : "Einmal zur nächsten eingestellten Uhrzeit."}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Erinnerung aktivieren"
                value={enabled}
                onValueChange={setEnabled}
                disabled={Platform.OS === "web"}
                trackColor={{ false: "#DCE2D4", true: "#547D48" }}
              />
            </View>
            {Platform.OS === "web" && (
              <Text style={styles.note}>
                Erinnerungen kannst du in der App auf deinem iPhone einrichten.
              </Text>
            )}
            {enabled && (
              <>
                <Text style={styles.timeLabel}>Uhrzeit</Text>
                <TextInput
                  accessibilityLabel="Erinnerungszeit"
                  placeholder="18:00"
                  value={time}
                  onChangeText={setTime}
                  maxLength={5}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Text style={styles.note}>
                  {daily
                    ? "Die Erinnerung wiederholt sich täglich, auch wenn die Aufgabe schon abgehakt ist. Du kannst sie hier jederzeit ausschalten."
                    : "Ist die Uhrzeit heute schon vorbei, erinnert dich die App morgen. Beim Abhaken wird die einmalige Erinnerung ausgeschaltet."}
                </Text>
              </>
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aufgabeneinstellungen speichern"
              disabled={busy}
              onPress={() => void save()}
              style={[styles.save, busy && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {busy ? "Wird eingerichtet …" : "Speichern"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={busy}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18,39,28,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  card: {
    backgroundColor: "#F7F8F2",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
  },
  eyebrow: {
    color: "#6D796C",
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  title: {
    color: "#203C30",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 24,
  },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 22,
  },
  copy: { flex: 1 },
  label: { color: "#203C30", fontSize: 15, fontWeight: "600" },
  note: { color: "#6D796C", fontSize: 12, lineHeight: 19, marginTop: 5 },
  timeLabel: {
    color: "#203C30",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE2D4",
    borderRadius: 12,
    backgroundColor: "#FFF",
    padding: 14,
    color: "#203C30",
    fontSize: 19,
    marginBottom: 8,
  },
  error: { color: "#814124", lineHeight: 21, fontSize: 13, marginTop: 14 },
  save: {
    minHeight: 48,
    backgroundColor: "#244F3D",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  saveText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  cancel: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  cancelText: { color: "#526747", fontSize: 14 },
  disabled: { opacity: 0.5 },
});
