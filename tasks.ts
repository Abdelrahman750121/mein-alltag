export type Reminder = { hour: number; minute: number; at: string | null };
export type Task = {
  id: string;
  title: string;
  done: boolean;
  daily: boolean;
  reminder: Reminder | null;
};
export type Completion = {
  taskId: string;
  title: string;
  day: string;
  completedAt: string;
};
export type Progress = { version: 3; tasks: Task[]; history: Completion[] };
export const LEGACY_STORAGE_KEY = "mein-alltag.tasks.v1";
export const HISTORY_STORAGE_KEY = "mein-alltag.progress.v2";
export const STORAGE_KEY = "mein-alltag.progress.v3";
export function emptyProgress(): Progress {
  return { version: 3, tasks: [], history: [] };
}
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayDate(day: string): Date {
  return new Date(`${day}T12:00:00`);
}
export function shiftDay(day: string, offset: number): string {
  const date = dayDate(day);
  date.setDate(date.getDate() + offset);
  return localDay(date);
}
export function weekStart(day: string): string {
  return shiftDay(day, -((dayDate(day).getDay() + 6) % 7));
}
export function weekSummary(progress: Progress, day: string) {
  const start = weekStart(day);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(start, index);
    return {
      day: date,
      count: progress.history.filter((entry) => entry.day === date).length,
    };
  });
  return { start, days, total: days.reduce((sum, day) => sum + day.count, 0) };
}
export function isTaskDone(
  progress: Progress,
  task: Task,
  day: string,
): boolean {
  return task.daily
    ? progress.history.some(
        (entry) => entry.taskId === task.id && entry.day === day,
      )
    : task.done;
}
export function addTask(
  tasks: Task[],
  title: string,
  id: string,
  daily = false,
): Task[] {
  const clean = title.trim();
  return clean && clean.length <= 100
    ? [...tasks, { id, title: clean, done: false, daily, reminder: null }]
    : tasks;
}
export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task,
  );
}
export function removeTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}
export function addProgressTask(
  progress: Progress,
  title: string,
  id: string,
  daily = false,
): Progress {
  return { ...progress, tasks: addTask(progress.tasks, title, id, daily) };
}
export function toggleProgress(
  progress: Progress,
  id: string,
  now = new Date(),
): Progress {
  const task = progress.tasks.find((task) => task.id === id);
  if (!task) return progress;
  const day = localDay(now);
  const done = isTaskDone(progress, task, day);
  const history = progress.history.filter(
    (entry) => entry.taskId !== id || entry.day !== day,
  );
  if (!done)
    history.push({
      taskId: id,
      title: task.title,
      day,
      completedAt: now.toISOString(),
    });
  const tasks = progress.tasks.map((item) =>
    item.id === id
      ? {
          ...item,
          done: !done,
          reminder: !item.daily && !done ? null : item.reminder,
        }
      : item,
  );
  return { ...progress, tasks, history };
}
export function removeProgressTask(progress: Progress, id: string): Progress {
  return { ...progress, tasks: removeTask(progress.tasks, id) };
}
export function historyForDay(progress: Progress, day: string): Completion[] {
  return progress.history
    .filter((entry) => entry.day === day)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
export function parseReminderTime(
  text: string,
): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]),
    minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}
export function makeReminder(
  text: string,
  daily: boolean,
  now = new Date(),
): Reminder {
  const time = parseReminderTime(text);
  if (!time)
    throw new Error("Bitte eine gültige Uhrzeit eingeben, zum Beispiel 18:00.");
  if (daily) return { ...time, at: null };
  const date = new Date(now);
  date.setHours(time.hour, time.minute, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 1);
  return { ...time, at: date.toISOString() };
}
export function configureTask(
  progress: Progress,
  id: string,
  settings: { daily: boolean; reminder: Reminder | null },
  now = new Date(),
): Progress {
  const tasks = progress.tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          done: isTaskDone(progress, task, localDay(now)),
          ...settings,
        }
      : task,
  );
  return { ...progress, tasks };
}
export function formatTime(time: { hour: number; minute: number }): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
function validTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
function decodeReminder(value: unknown, daily: boolean): Reminder | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "object" ||
    !("hour" in value) ||
    !("minute" in value) ||
    !("at" in value) ||
    typeof value.hour !== "number" ||
    !Number.isInteger(value.hour) ||
    value.hour < 0 ||
    value.hour > 23 ||
    typeof value.minute !== "number" ||
    !Number.isInteger(value.minute) ||
    value.minute < 0 ||
    value.minute > 59 ||
    (daily ? value.at !== null : !validTimestamp(value.at))
  )
    throw new Error("Invalid reminder data");
  return {
    hour: value.hour,
    minute: value.minute,
    at: value.at as string | null,
  };
}
export function decodeTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid task data");
  const ids = new Set<string>();
  return value.map((task) => {
    if (
      !task ||
      typeof task !== "object" ||
      typeof task.id !== "string" ||
      !task.id ||
      ids.has(task.id) ||
      typeof task.title !== "string" ||
      !task.title.trim() ||
      task.title.length > 100 ||
      typeof task.done !== "boolean" ||
      (task.daily !== undefined && typeof task.daily !== "boolean")
    )
      throw new Error("Invalid task data");
    ids.add(task.id);
    const daily = task.daily ?? false;
    return {
      id: task.id,
      title: task.title,
      done: task.done,
      daily,
      reminder: decodeReminder(task.reminder, daily),
    };
  });
}
function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day
  );
}
export function decodeProgress(
  raw: string | null,
  legacy: string | null = null,
): Progress {
  if (raw === null) return { ...emptyProgress(), tasks: decodeTasks(legacy) };
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    (value.version !== 2 && value.version !== 3) ||
    !("tasks" in value) ||
    !("history" in value) ||
    !Array.isArray(value.history)
  )
    throw new Error("Invalid progress data");
  const tasks = decodeTasks(JSON.stringify(value.tasks));
  const entries = new Set<string>();
  for (const entry of value.history) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.taskId !== "string" ||
      !entry.taskId ||
      typeof entry.title !== "string" ||
      !entry.title.trim() ||
      entry.title.length > 100 ||
      !validDay(entry.day) ||
      !validTimestamp(entry.completedAt)
    )
      throw new Error("Invalid history data");
    const key = JSON.stringify([entry.taskId, entry.day]);
    if (entries.has(key)) throw new Error("Duplicate history entry");
    entries.add(key);
  }
  return {
    version: 3,
    tasks,
    history: value.history.map(({ taskId, title, day, completedAt }) => ({
      taskId,
      title,
      day,
      completedAt,
    })),
  };
}
export async function readProgress(storage: {
  getItem(key: string): Promise<string | null>;
}): Promise<Progress> {
  const current = await storage.getItem(STORAGE_KEY);
  if (current !== null) return decodeProgress(current);
  const history = await storage.getItem(HISTORY_STORAGE_KEY);
  if (history !== null) return decodeProgress(history);
  return decodeProgress(null, await storage.getItem(LEGACY_STORAGE_KEY));
}
