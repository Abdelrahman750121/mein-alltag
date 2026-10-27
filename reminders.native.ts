import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Progress } from "./tasks";
import { buildReminderPlans, diffReminderPlans } from "./notification-plans";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
function allowed(
  permission: Notifications.NotificationPermissionsStatus,
): boolean {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("my-progress", {
      name: "Aufgaben-Erinnerungen",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return true;
  if (!current.canAskAgain) return false;
  return allowed(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}
export async function syncReminders(progress: Progress): Promise<void> {
  const plans = buildReminderPlans(progress);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const changes = diffReminderPlans(
    plans,
    scheduled.map((item) => ({
      identifier: item.identifier,
      signature: item.content.data?.myProgressSignature,
    })),
  );
  if (plans.length && !allowed(await Notifications.getPermissionsAsync()))
    throw new Error(
      "Bitte Benachrichtigungen für die App in den iPhone-Einstellungen erlauben.",
    );
  for (const identifier of changes.cancel)
    await Notifications.cancelScheduledNotificationAsync(identifier);
  for (const plan of changes.schedule) {
    const trigger: Notifications.NotificationTriggerInput =
      plan.trigger.kind === "daily"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: plan.trigger.hour,
            minute: plan.trigger.minute,
            channelId: "my-progress",
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(plan.trigger.at),
            channelId: "my-progress",
          };
    await Notifications.scheduleNotificationAsync({
      identifier: plan.identifier,
      content: {
        title: "My progress",
        body: `Zeit für: ${plan.title}`,
        sound: "default",
        data: { myProgressSignature: plan.signature },
      },
      trigger,
    });
  }
}
