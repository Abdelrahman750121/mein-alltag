import BackupPanel from "./BackupPanel";
import { CategorySummary } from "./ScreenPanels";
import { PageHeading, TabPage } from "./AppLayout";
import { LoadingState, StorageStatus, ScreenProps } from "./ProgressStatus";
import type { Category, Progress } from "./tasks";
export default function SettingsScreen({
  active,
  store,
  onSelectCategory,
  onRestore,
}: Omit<ScreenProps, "today"> & {
  onSelectCategory(category: Category): void;
  onRestore(progress: Progress): Promise<void>;
}) {
  return (
    <TabPage active={active}>
      <PageHeading
        title="Einstellungen"
        subtitle="Deine Kategorien und die Sicherung deiner Daten."
      />
      <LoadingState store={store} />
      {store.loaded && (
        <CategorySummary
          progress={store.progress}
          onSelect={onSelectCategory}
        />
      )}
      <BackupPanel
        progress={store.loaded ? store.progress : null}
        loading={store.loading}
        onRestore={onRestore}
      />
      <StorageStatus store={store} />
    </TabPage>
  );
}
