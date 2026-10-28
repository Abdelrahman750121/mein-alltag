import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyProgress, readProgress, STORAGE_KEY, Progress } from "./tasks";
import { persistRestoration } from "./backup";
import { syncReminders } from "./reminders";

export function useProgress(today: string) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [reminderError, setReminderError] = useState("");
  const [refreshReminders, setRefreshReminders] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [retry, setRetry] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const saveGeneration = useRef(0);
  const restoring = useRef(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const stored = await readProgress(AsyncStorage);
      setProgress(stored);
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
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setRefreshReminders((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!loaded || restoring.current) return;
    const generation = saveGeneration.current;
    const version = ++saveVersion.current;
    const snapshot = JSON.stringify(progress);
    setSaving(true);
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (generation !== saveGeneration.current) return;
        try {
          await AsyncStorage.setItem(STORAGE_KEY, snapshot);
          if (version === saveVersion.current) setSaveError(false);
          try {
            await syncReminders(progress);
            if (version === saveVersion.current) setReminderError("");
          } catch (error) {
            if (version === saveVersion.current)
              setReminderError(
                error instanceof Error
                  ? error.message
                  : "Erinnerungen konnten nicht eingerichtet werden.",
              );
          }
        } catch {
          if (version === saveVersion.current) setSaveError(true);
        } finally {
          if (version === saveVersion.current) setSaving(false);
        }
      });
  }, [progress, loaded, retry, today, refreshReminders]);

  async function restore(candidate: Progress) {
    restoring.current = true;
    ++saveGeneration.current;
    ++saveVersion.current;
    const operation = saveQueue.current
      .catch(() => {})
      .then(async () => {
        const restored = await persistRestoration(AsyncStorage, candidate);
        restoring.current = false;
        setRestoreVersion((value) => value + 1);
        setProgress(restored);
        setLoaded(true);
        setLoading(false);
        setError("");
        setSaveError(false);
        setReminderError("");
      });
    saveQueue.current = operation;
    try {
      await operation;
    } catch (error) {
      setSaveError(true);
      throw new Error(
        "Die Wiederherstellung konnte nicht auf dem Gerät gespeichert werden. Bitte versuche es erneut.",
        { cause: error },
      );
    } finally {
      restoring.current = false;
      setSaving(false);
    }
  }

  return {
    progress,
    setProgress,
    loaded,
    loading,
    error,
    saving,
    saveError,
    reminderError,
    restoreVersion,
    load,
    restore,
    retry: () => setRetry((value) => value + 1),
  };
}
export type ProgressStore = ReturnType<typeof useProgress>;
