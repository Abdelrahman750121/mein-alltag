import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { RetryNotice } from "./AppLayout";
import type { ProgressStore } from "./useProgress";
export type ScreenProps = {
  active: boolean;
  store: ProgressStore;
  today: string;
};

export function LoadingState({ store }: { store: ProgressStore }) {
  return store.loading ? (
    <View style={styles.empty}>
      <ActivityIndicator color="#235C45" />
      <Text style={styles.emptyText}>Deine Aufgaben werden geladen …</Text>
    </View>
  ) : !store.loaded ? (
    <RetryNotice
      onRetry={() => void store.load()}
      actionLabel="Erneut versuchen"
      message={store.error}
    />
  ) : null;
}

export function StorageStatus({ store }: { store: ProgressStore }) {
  if (!store.loaded) return null;
  return (
    <>
      {!!store.reminderError && (
        <RetryNotice
          onRetry={store.retry}
          actionLabel="Erinnerungen erneut einrichten"
          message={`Erinnerungen: ${store.reminderError}`}
        />
      )}
      {store.saveError ? (
        <RetryNotice
          onRetry={store.retry}
          actionLabel="Erneut speichern"
          message="Speichern fehlgeschlagen. Bitte lass die App offen und versuche es erneut."
        />
      ) : (
        <Text style={styles.storageNote} accessibilityLiveRegion="polite">
          {store.saving
            ? "Wird gespeichert …"
            : "✓ Auf diesem Gerät gespeichert"}
        </Text>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 30, paddingHorizontal: 14 },
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
});
