import type { Progress } from "./tasks";
export const REMINDER_PREFIX = "my-progress.reminder.";
export type ReminderPlan = {
  identifier: string;
  signature: string;
  title: string;
  trigger:
    | { kind: "daily"; hour: number; minute: number }
    | { kind: "once"; at: string };
};
export function buildReminderPlans(
  progress: Progress,
  now = new Date(),
): ReminderPlan[] {
  return progress.tasks.flatMap((task) => {
    const reminder = task.reminder;
    if (!reminder || (!task.daily && task.done)) return [];
    const trigger: ReminderPlan["trigger"] = task.daily
      ? { kind: "daily", hour: reminder.hour, minute: reminder.minute }
      : { kind: "once", at: reminder.at! };
    if (
      trigger.kind === "once" &&
      (!trigger.at || Date.parse(trigger.at) <= now.getTime())
    )
      return [];
    return [
      {
        identifier: REMINDER_PREFIX + encodeURIComponent(task.id),
        title: task.title,
        trigger,
        signature: JSON.stringify({ title: task.title, trigger }),
      },
    ];
  });
}
export function diffReminderPlans(
  desired: ReminderPlan[],
  existing: { identifier: string; signature: unknown }[],
) {
  const wanted = new Map(desired.map((plan) => [plan.identifier, plan]));
  const current = new Map(existing.map((plan) => [plan.identifier, plan]));
  return {
    cancel: existing
      .filter(
        (item) =>
          item.identifier.startsWith(REMINDER_PREFIX) &&
          (!wanted.has(item.identifier) ||
            wanted.get(item.identifier)?.signature !== item.signature),
      )
      .map((item) => item.identifier),
    schedule: desired.filter(
      (plan) => current.get(plan.identifier)?.signature !== plan.signature,
    ),
  };
}
