import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORY_OPTIONS, CategoryFilter } from "./tasks";
export default function CategoryPicker({
  value,
  onChange,
  includeAll = false,
  label,
}: {
  value: CategoryFilter;
  onChange(value: CategoryFilter): void;
  includeAll?: boolean;
  label: string;
}) {
  const options = includeAll
    ? [{ value: "all" as const, label: "Alle" }, ...CATEGORY_OPTIONS]
    : CATEGORY_OPTIONS;
  return (
    <View style={styles.options} accessibilityLabel={label}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          aria-pressed={value === option.value}
          accessibilityLabel={`${label}: ${option.label}`}
          onPress={() => onChange(option.value)}
          style={[styles.option, value === option.value && styles.active]}
        >
          <Text
            style={[styles.text, value === option.value && styles.activeText]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
    marginBottom: 15,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 13,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#E9EEDF",
  },
  active: { backgroundColor: "#244F3D" },
  text: { color: "#526747", fontSize: 12, fontWeight: "600" },
  activeText: { color: "#FFFFFF" },
});
