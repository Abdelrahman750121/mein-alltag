import History from "./History";
import { PageHeading, TabPage } from "./AppLayout";
import { LoadingState, StorageStatus, ScreenProps } from "./ProgressStatus";
export default function HistoryScreen({ active, store, today }: ScreenProps) {
  return (
    <TabPage active={active}>
      <PageHeading
        title="Dein Verlauf"
        subtitle="Schau nach, was du an vergangenen Tagen geschafft hast."
      />
      <LoadingState store={store} />
      {store.loaded && <History progress={store.progress} today={today} />}
      <StorageStatus store={store} />
    </TabPage>
  );
}
