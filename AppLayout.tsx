import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScrollViewProps } from "react-native";

// Keep every page mounted so switching tabs preserves inputs and scroll positions.
export function TabPage({
  active,
  children,
  keyboardShouldPersistTaps,
}: {
  active: boolean;
  children: ReactNode;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
}) {
  return (
    <View
      style={active ? styles.flex : styles.hidden}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <Text style={styles.brand}>My progress.</Text>
      <Text accessibilityRole="header" style={styles.screenTitle}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );
}

export function RetryNotice({
  message,
  actionLabel,
  onRetry,
}: {
  message: string;
  actionLabel: string;
  onRetry(): void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text accessibilityRole="alert" style={styles.errorText}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.retry}
      >
        <Text style={styles.retryText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: "none" },
  page: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 40,
  },
  brand: {
    fontSize: 23,
    fontWeight: "800",
    color: "#203C30",
    letterSpacing: -1,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#203C30",
    marginTop: 30,
    letterSpacing: -1,
  },
  subtitle: {
    color: "#6D796C",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    marginBottom: 28,
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
