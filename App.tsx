import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addTask,
  decodeTasks,
  removeTask,
  STORAGE_KEY,
  Task,
  toggleTask,
} from "./tasks";

const ideas = ["Kochen", "Spielen", "Buch lesen", "Laufen"];

function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [retry, setRetry] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const sequence = useRef(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const stored = decodeTasks(await AsyncStorage.getItem(STORAGE_KEY));
      setTasks(stored);
      setLoaded(true);
    } catch {
      setError(
        "Deine Aufgaben konnten nicht geladen werden. Deine gespeicherten Daten bleiben erhalten.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const version = ++saveVersion.current;
    const snapshot = JSON.stringify(tasks);
    setSaving(true);
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, snapshot);
          if (version === saveVersion.current) setSaveError(false);
        } catch {
          if (version === saveVersion.current) setSaveError(true);
        } finally {
          if (version === saveVersion.current) setSaving(false);
        }
      });
  }, [tasks, loaded, retry]);

  function add(value = title) {
    if (!loaded || !value.trim()) return;
    const id = `${Date.now()}-${++sequence.current}-${Math.random().toString(36).slice(2)}`;
    setTasks((current) => addTask(current, value, id));
    setTitle("");
    Keyboard.dismiss();
  }
  const completed = tasks.filter((task) => task.done).length;
  const percent = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  function row(task: Task) {
    return (
      <View key={task.id} style={[styles.row, task.done && styles.rowDone]}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={task.title}
          accessibilityState={{ checked: task.done }}
          onPress={() => setTasks((current) => toggleTask(current, task.id))}
          style={styles.taskTouch}
        >
          <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
            <Text style={styles.check}>{task.done ? "✓" : ""}</Text>
          </View>
          <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
            {task.title}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${task.title} löschen`}
          onPress={() => setTasks((current) => removeTask(current, task.id))}
          hitSlop={4}
          style={styles.delete}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>
              My progress<Text style={styles.brandDot}>.</Text>
            </Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>DEIN TEMPO</Text>
            </View>
          </View>
          <Text style={styles.date}>
            {new Date().toLocaleDateString("de-AT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          <Text style={styles.heading}>
            Kleine Schritte.{"\n"}Ein guter Tag.
          </Text>
          <Text style={styles.subtitle}>
            Platz für alles, was du dir vornimmst.
          </Text>
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.cardEyebrow}>DEIN FORTSCHRITT</Text>
                <Text style={styles.progressTitle}>
                  {tasks.length && completed === tasks.length
                    ? "Alles geschafft!"
                    : "Jeder Haken zählt."}
                </Text>
              </View>
              <Text style={styles.spark}>✳</Text>
            </View>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Erledigte Aufgaben"
              accessibilityValue={{
                min: 0,
                max: tasks.length || 1,
                now: completed,
              }}
            >
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <View style={styles.progressBottom}>
              <Text style={styles.progressCaption}>
                {completed} von {tasks.length} erledigt
              </Text>
              <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
          </View>
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#235C45" />
              <Text style={styles.emptyText}>
                Deine Aufgaben werden geladen …
              </Text>
            </View>
          ) : !loaded ? (
            <View style={styles.errorBox}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void load()}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Erneut versuchen</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Deine Aufgaben</Text>
                <Text style={styles.count}>{tasks.length}</Text>
              </View>
              <View style={styles.inputBox}>
                <TextInput
                  accessibilityLabel="Neue Aufgabe"
                  placeholder="Was möchtest du machen?"
                  placeholderTextColor="#7D867E"
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  returnKeyType="done"
                  onSubmitEditing={() => add()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aufgabe hinzufügen"
                  disabled={!title.trim()}
                  onPress={() => add()}
                  style={[styles.addButton, !title.trim() && styles.disabled]}
                >
                  <Text style={styles.addText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.ideas}>
                {ideas.map((idea) => (
                  <Pressable
                    key={idea}
                    accessibilityRole="button"
                    accessibilityLabel={`${idea} hinzufügen`}
                    onPress={() => add(idea)}
                    style={styles.idea}
                  >
                    <Text style={styles.ideaText}>+ {idea}</Text>
                  </Pressable>
                ))}
              </View>
              {!tasks.length ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyCheck}>✓</Text>
                  </View>
                  <Text style={styles.emptyTitle}>Dein Tag, deine Pläne.</Text>
                  <Text style={styles.emptyText}>
                    Trage deine erste Aufgabe ein oder tippe auf einen
                    Vorschlag.
                  </Text>
                </View>
              ) : (
                <>
                  {tasks.some((task) => !task.done) && (
                    <View style={styles.group}>
                      <Text style={styles.groupTitle}>NOCH VOR DIR</Text>
                      {tasks.filter((task) => !task.done).map(row)}
                    </View>
                  )}
                  {completed > 0 && (
                    <View style={styles.group}>
                      <Text style={styles.groupTitle}>
                        SCHON GESCHAFFT · {completed}
                      </Text>
                      {tasks.filter((task) => task.done).map(row)}
                    </View>
                  )}
                </>
              )}
              {saveError ? (
                <View style={styles.errorBox}>
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    Speichern fehlgeschlagen. Bitte lass die App offen und
                    versuche es erneut.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRetry((value) => value + 1)}
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>Erneut speichern</Text>
                  </Pressable>
                </View>
              ) : (
                <Text
                  style={styles.storageNote}
                  accessibilityLiveRegion="polite"
                >
                  {saving
                    ? "Wird gespeichert …"
                    : "✓ Auf diesem Gerät gespeichert"}
                </Text>
              )}
            </>
          )}
          <Text style={styles.footer}>
            Du musst nicht alles auf einmal schaffen.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <TasksScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#F7F8F2" },
  page: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 38,
  },
  brand: {
    fontSize: 23,
    fontWeight: "800",
    color: "#203C30",
    letterSpacing: -1,
  },
  brandDot: { color: "#6B9762" },
  dayBadge: {
    borderColor: "#D7DED0",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayText: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "700",
    color: "#53674F",
  },
  date: { color: "#6D796C", fontSize: 13, marginBottom: 12 },
  heading: {
    color: "#203C30",
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  subtitle: {
    color: "#6D796C",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    marginBottom: 28,
  },
  progressCard: {
    padding: 23,
    borderRadius: 24,
    backgroundColor: "#244F3D",
    marginBottom: 32,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardEyebrow: {
    fontSize: 10,
    color: "#C5D7B9",
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  progressTitle: {
    fontSize: 21,
    fontWeight: "600",
    color: "#F4F8EB",
    marginTop: 8,
  },
  spark: { fontSize: 46, color: "#D4E8A8" },
  progressTrack: {
    height: 7,
    borderRadius: 8,
    backgroundColor: "#486B54",
    marginTop: 23,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#D4E8A8" },
  progressBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressCaption: { color: "#DCE7D5", fontSize: 12 },
  progressPercent: { color: "#D4E8A8", fontSize: 12, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#203C30",
    letterSpacing: -0.4,
  },
  count: {
    backgroundColor: "#E9EEDF",
    color: "#526747",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 7,
    paddingLeft: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE2D4",
    borderRadius: 17,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 15,
    color: "#203C30",
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#244F3D",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  addText: { fontSize: 30, lineHeight: 34, color: "#FFF", fontWeight: "400" },
  ideas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 28,
  },
  idea: {
    backgroundColor: "#EDF0E6",
    borderRadius: 20,
    minHeight: 44,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  ideaText: { fontSize: 12, color: "#526747" },
  group: { marginBottom: 22 },
  groupTitle: {
    color: "#7A8575",
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E9DE",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    paddingRight: 4,
  },
  rowDone: { backgroundColor: "#EDF2E6", borderColor: "#E0E7D8" },
  taskTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 13,
    minHeight: 64,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#C8D1C0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#547D48", borderColor: "#547D48" },
  check: { color: "#FFF", fontWeight: "700", fontSize: 17 },
  taskTitle: { flex: 1, fontSize: 16, color: "#2D4032", lineHeight: 23 },
  taskTitleDone: { textDecorationLine: "line-through", color: "#71806A" },
  delete: {
    minHeight: 48,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#7B8775", fontSize: 25 },
  empty: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 14 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#E8EFDA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
  },
  emptyCheck: { color: "#62804E", fontSize: 28 },
  emptyTitle: {
    color: "#334B38",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 9,
  },
  emptyText: {
    color: "#7A8575",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 290,
    marginTop: 8,
  },
  storageNote: {
    textAlign: "center",
    color: "#67785E",
    fontSize: 11,
    marginTop: 10,
  },
  footer: {
    textAlign: "center",
    color: "#7D8777",
    fontSize: 12,
    marginTop: 32,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#FFF0E5",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  errorText: { color: "#814124", fontSize: 14, lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: "center", marginTop: 4 },
  retryText: { color: "#703B25", fontWeight: "700" },
});

