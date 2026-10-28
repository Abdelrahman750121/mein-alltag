import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORY_OPTIONS, Category, Progress, taskStreak } from "./tasks";
export function StreakPanel({
  progress,
  today,
}: {
  progress: Progress;
  today: string;
}) {
  const dailyTasks = progress.tasks.filter((task) => task.daily);
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        Deine Serien
      </Text>
      <Text style={styles.description}>
        Wie viele Tage du hintereinander drangeblieben bist.
      </Text>
      {!dailyTasks.length && (
        <Text style={styles.description}>
          Lege unter Heute eine tägliche Aufgabe an, um deine Serie zu starten.
        </Text>
      )}
      {dailyTasks.map((task) => {
        const streak = taskStreak(progress, task.id, today);
        return (
          <View key={task.id} style={styles.card}>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.value}>
              {streak.current} {streak.current === 1 ? "Tag" : "Tage"} in Folge
            </Text>
            <Text style={styles.description}>
              Längste Serie: {streak.best} {streak.best === 1 ? "Tag" : "Tage"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
export function CategorySummary({
  progress,
  onSelect,
}: {
  progress: Progress;
  onSelect(category: Category): void;
}) {
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.heading}>
        Kategorien
      </Text>
      <Text style={styles.description}>
        Tippe auf eine Kategorie, um ihre Aufgaben zu öffnen. Die Kategorie
        einer Aufgabe änderst du über ⋯ bei Heute.
      </Text>
      {CATEGORY_OPTIONS.map((category) => {
        const count = progress.tasks.filter(
          (task) => task.category === category.value,
        ).length;
        return (
          <Pressable
            key={category.value}
            accessibilityRole="button"
            accessibilityLabel={`${category.label}: ${count} Aufgaben anzeigen`}
            onPress={() => onSelect(category.value)}
            style={styles.category}
          >
            <Text style={styles.title}>{category.label}</Text>
            <Text style={styles.value}>{count} →</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { marginTop: 20, marginBottom: 20 },
  heading: {
    color: "#203C30",
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    color: "#6D796C",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderColor: "#E5E9DE",
    borderWidth: 1,
  },
  title: { color: "#203C30", fontSize: 16, fontWeight: "600", flexShrink: 1 },
  value: {
    color: "#3F6837",
    fontSize: 14,
    fontWeight: "700",
    marginVertical: 7,
  },
  category: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    backgroundColor: "#EDF0E6",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
