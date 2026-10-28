import { Pressable, StyleSheet, Text, View } from "react-native";
export type TabKey = "today" | "history" | "stats" | "settings";
const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "today", label: "Heute", icon: "✓" },
  { key: "history", label: "Verlauf", icon: "↶" },
  { key: "stats", label: "Statistik", icon: "▥" },
  { key: "settings", label: "Einstellungen", icon: "⚙" },
];
export default function BottomTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange(tab: TabKey): void;
}) {
  return (
    <View
      style={styles.bar}
      accessibilityRole="tablist"
      accessibilityLabel="Hauptnavigation"
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: active === tab.key }}
          onPress={() => onChange(tab.key)}
          style={[styles.tab, active === tab.key && styles.active]}
        >
          <Text
            style={[styles.icon, active === tab.key && styles.selected]}
            accessible={false}
          >
            {tab.icon}
          </Text>
          <Text style={[styles.label, active === tab.key && styles.selected]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#F7F8F2",
    borderTopWidth: 1,
    borderTopColor: "#DCE2D4",
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 2,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 14,
  },
  active: { backgroundColor: "#E4EDDA" },
  icon: { fontSize: 23, color: "#73816D", marginBottom: 3 },
  label: { fontSize: 11, fontWeight: "600", color: "#65745F" },
  selected: { color: "#244F3D", fontWeight: "800" },
});
