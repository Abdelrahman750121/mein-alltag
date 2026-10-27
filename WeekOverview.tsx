import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { dayDate, Progress, shiftDay, weekStart, weekSummary } from "./tasks";
export default function WeekOverview({
  progress,
  today,
}: {
  progress: Progress;
  today: string;
}) {
  const currentWeek = weekStart(today);
  const [selected, setSelected] = useState(currentWeek);
  const previousWeek = useRef(currentWeek);
  useEffect(() => {
    const previous = previousWeek.current;
    setSelected((week) =>
      week === previous || week > currentWeek ? currentWeek : week,
    );
    previousWeek.current = currentWeek;
  }, [currentWeek]);
  const summary = weekSummary(progress, selected);
  const maximum = Math.max(1, ...summary.days.map((day) => day.count));
  const format = (day: string) =>
    dayDate(day).toLocaleDateString("de-AT", {
      day: "numeric",
      month: "numeric",
    });
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Deine Wochenübersicht</Text>
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vorherige Woche"
          onPress={() => setSelected((week) => shiftDay(week, -7))}
          style={styles.arrow}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <View style={styles.date}>
          <Text style={styles.label}>
            {selected === currentWeek ? "Diese Woche" : "Frühere Woche"}
          </Text>
          <Text style={styles.sub}>
            {format(summary.start)} – {format(shiftDay(summary.start, 6))}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nächste Woche"
          disabled={selected >= currentWeek}
          onPress={() => setSelected((week) => shiftDay(week, 7))}
          style={[styles.arrow, selected >= currentWeek && styles.disabled]}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <Text style={styles.total}>
        {summary.total}{" "}
        <Text style={styles.totalLabel}>
          {summary.total === 1
            ? "Erledigung in dieser Woche"
            : "Erledigungen in dieser Woche"}
        </Text>
      </Text>
      <View style={styles.chart}>
        {summary.days.map((day) => (
          <View
            key={day.day}
            accessible
            accessibilityLabel={`${dayDate(day.day).toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })}: ${day.count} erledigt`}
            style={styles.column}
          >
            <Text style={styles.count}>{day.count}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height: day.count ? `${(day.count / maximum) * 100}%` : 3 },
                  day.day === today && styles.todayBar,
                  day.day > today && styles.future,
                ]}
              />
            </View>
            <Text style={[styles.day, day.day === today && styles.todayText]}>
              {dayDate(day.day)
                .toLocaleDateString("de-AT", { weekday: "short" })
                .replace(".", "")}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Gezählt werden gespeicherte Erledigungen von Montag bis Sonntag.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    borderColor: "#DCE2D4",
    marginTop: 14,
    paddingTop: 25,
    marginBottom: 20,
  },
  heading: { color: "#203C30", fontSize: 21, fontWeight: "700" },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 16,
  },
  arrow: {
    width: 44,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EDF0E6",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: { color: "#244F3D", fontSize: 32 },
  disabled: { opacity: 0.3 },
  date: { flex: 1, alignItems: "center" },
  label: { color: "#203C30", fontWeight: "700", fontSize: 15 },
  sub: { color: "#6D796C", fontSize: 12, marginTop: 4 },
  total: {
    color: "#244F3D",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
  },
  totalLabel: { fontSize: 12, fontWeight: "400", color: "#6D796C" },
  chart: { flexDirection: "row", gap: 8 },
  column: { flex: 1, minWidth: 0, alignItems: "center" },
  count: { fontSize: 12, color: "#526747", marginBottom: 7 },
  track: {
    height: 90,
    width: "100%",
    maxWidth: 29,
    backgroundColor: "#E8EEDF",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: { width: "100%", backgroundColor: "#77976A", borderRadius: 8 },
  todayBar: { backgroundColor: "#244F3D" },
  future: { opacity: 0.3 },
  day: { fontSize: 11, color: "#6D796C", marginTop: 9 },
  todayText: { color: "#244F3D", fontWeight: "800" },
  note: { fontSize: 11, color: "#6D796C", lineHeight: 18, marginTop: 16 },
});
