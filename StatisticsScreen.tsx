import WeekOverview from "./WeekOverview";
import { StreakPanel } from "./ScreenPanels";
import { PageHeading, TabPage } from "./AppLayout";
import { LoadingState, StorageStatus, ScreenProps } from "./ProgressStatus";
export default function StatisticsScreen({
  active,
  store,
  today,
}: ScreenProps) {
  return (
    <TabPage active={active}>
      <PageHeading
        title="Deine Statistik"
        subtitle="Deine Woche und die Serien deiner täglichen Aufgaben."
      />
      <LoadingState store={store} />
      {store.loaded && (
        <>
          <WeekOverview progress={store.progress} today={today} />
          <StreakPanel progress={store.progress} today={today} />
        </>
      )}
      <StorageStatus store={store} />
    </TabPage>
  );
}
