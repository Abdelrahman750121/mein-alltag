import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import BottomTabs, { TabKey } from "./BottomTabs";
import TodayScreen from "./TodayScreen";
import HistoryScreen from "./HistoryScreen";
import StatisticsScreen from "./StatisticsScreen";
import SettingsScreen from "./SettingsScreen";
import { useLocalDay } from "./History";
import { useProgress } from "./useProgress";
import type { CategoryFilter, Progress } from "./tasks";

function TasksScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const today = useLocalDay();
  const store = useProgress(today);
  function changeTab(tab: TabKey) {
    Keyboard.dismiss();
    setActiveTab(tab);
  }
  async function restore(candidate: Progress) {
    await store.restore(candidate);
    setCategoryFilter("all");
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <TodayScreen
            active={activeTab === "today"}
            store={store}
            today={today}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />
          <HistoryScreen
            active={activeTab === "history"}
            store={store}
            today={today}
          />
          <StatisticsScreen
            active={activeTab === "stats"}
            store={store}
            today={today}
          />
          <SettingsScreen
            active={activeTab === "settings"}
            store={store}
            onRestore={restore}
            onSelectCategory={(category) => {
              setCategoryFilter(category);
              changeTab("today");
            }}
          />
        </View>
        <BottomTabs active={activeTab} onChange={changeTab} />
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
});
