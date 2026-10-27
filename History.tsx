import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { dayDate, historyForDay, localDay, Progress, shiftDay } from "./tasks";

export function useLocalDay() {
  const [today, setToday] = useState(() => localDay());
  useEffect(() => {
    const update = () => setToday(localDay());
    const timer = setInterval(update, 30_000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return today;
}

export default function History({ progress, today }: { progress: Progress; today: string }) {
  const [selected, setSelected] = useState(today);
  const previousToday = useRef(today);
  useEffect(() => {
    const previous = previousToday.current;
    setSelected(day => day === previous || day > today ? today : day);
    previousToday.current = today;
  }, [today]);

  const entries = historyForDay(progress, selected);
  const label = selected === today ? "Heute" : selected === shiftDay(today, -1) ? "Gestern" : "Früherer Tag";
  const undated = progress.tasks.filter(task => task.done && !progress.history.some(entry => entry.taskId === task.id)).length;
  return <View style={styles.panel}>
    <Text style={styles.heading}>Dein Tagesverlauf</Text>
    <Text style={styles.subtitle}>Schau zurück auf das, was du geschafft hast.</Text>
    <View style={styles.shortcuts}>
      {[{ text: "Heute", day: today }, { text: "Gestern", day: shiftDay(today, -1) }].map(item =>
        <Pressable key={item.text} accessibilityRole="button" accessibilityState={{ selected: selected === item.day }} aria-pressed={selected === item.day}
          onPress={() => setSelected(item.day)} style={[styles.pill, selected === item.day && styles.pillActive]}>
          <Text style={[styles.pillText, selected === item.day && styles.pillTextActive]}>{item.text}</Text>
        </Pressable>)}
    </View>
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Vorheriger Tag" onPress={() => setSelected(day => shiftDay(day, -1))} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
      <View style={styles.date} accessibilityLiveRegion="polite"><Text style={styles.dayLabel}>{label}</Text><Text style={styles.dateText}>{dayDate(selected).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" })}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Nächster Tag" accessibilityState={{ disabled: selected >= today }} disabled={selected >= today}
        onPress={() => setSelected(day => shiftDay(day, 1))} style={[styles.arrow, selected >= today && styles.disabled]}><Text style={styles.arrowText}>›</Text></Pressable>
    </View>
    <Text style={styles.count}>{entries.length} {entries.length === 1 ? "Aufgabe erledigt" : "Aufgaben erledigt"}</Text>
    {entries.length ? entries.map(entry => <View key={JSON.stringify([entry.taskId, entry.day])} style={styles.entry}>
      <Text style={styles.check}>✓</Text><Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.time}>{new Date(entry.completedAt).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</Text>
    </View>) : <Text style={styles.empty}>Für diesen Tag sind noch keine erledigten Aufgaben gespeichert.</Text>}
    {undated > 0 && <Text style={styles.note}>Bei {undated === 1 ? "einer früher erledigten Aufgabe ist" : `${undated} früher erledigten Aufgaben ist`} das Datum unbekannt. Neue Häkchen werden ab jetzt mit Datum gespeichert.</Text>}
    <Text style={styles.note}>Der Verlauf bleibt beim Löschen einer Aufgabe erhalten. Häkchen vom selben Tag kannst du zurücknehmen.</Text>
  </View>;
}
const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, borderColor: "#DCE2D4", marginTop: 16, paddingTop: 25, marginBottom: 16 },
  heading: { color: "#203C30", fontSize: 21, fontWeight: "700" }, subtitle: { color: "#6D796C", fontSize: 13, lineHeight: 20, marginTop: 6 },
  shortcuts: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 14 },
  pill: { minHeight: 44, paddingHorizontal: 20, justifyContent: "center", borderRadius: 22, backgroundColor: "#E9EEDF" },
  pillActive: { backgroundColor: "#244F3D" }, pillText: { color: "#526747", fontWeight: "600", fontSize: 13 }, pillTextActive: { color: "#FFFFFF" },
  navigation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  arrow: { width: 44, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#EDF0E6" },
  arrowText: { color: "#244F3D", fontSize: 32 }, disabled: { opacity: 0.3 }, date: { flex: 1, alignItems: "center" },
  dayLabel: { color: "#203C30", fontWeight: "700", fontSize: 16 }, dateText: { color: "#6D796C", fontSize: 12, marginTop: 3 },
  count: { color: "#526747", fontSize: 12, fontWeight: "600", marginTop: 18, marginBottom: 10 },
  entry: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#EDF2E6", borderRadius: 14, marginBottom: 8 },
  check: { color: "#547D48", fontSize: 19, fontWeight: "700" }, title: { flex: 1, color: "#2D4032", fontSize: 15, lineHeight: 22 },
  time: { color: "#66765D", fontSize: 12 }, empty: { color: "#6D796C", fontSize: 13, lineHeight: 21, paddingVertical: 15 },
  note: { color: "#6D796C", fontSize: 11, lineHeight: 18, marginTop: 10 },
});

