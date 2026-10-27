export type Task = { id: string; title: string; done: boolean };
export type Completion = { taskId: string; title: string; day: string; completedAt: string };
export type Progress = { version: 2; tasks: Task[]; history: Completion[] };
export const LEGACY_STORAGE_KEY = "mein-alltag.tasks.v1";
export const STORAGE_KEY = "mein-alltag.progress.v2";
export function emptyProgress(): Progress { return { version: 2, tasks: [], history: [] }; }

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayDate(day: string): Date { return new Date(`${day}T12:00:00`); }
export function shiftDay(day: string, offset: number): string {
  const date = dayDate(day);
  date.setDate(date.getDate() + offset);
  return localDay(date);
}
export function addTask(tasks: Task[], title: string, id: string): Task[] {
  const clean = title.trim();
  return clean && clean.length <= 100 ? [...tasks, { id, title: clean, done: false }] : tasks;
}
export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
}
export function removeTask(tasks: Task[], id: string): Task[] { return tasks.filter(task => task.id !== id); }
export function addProgressTask(progress: Progress, title: string, id: string): Progress {
  return { ...progress, tasks: addTask(progress.tasks, title, id) };
}
export function toggleProgress(progress: Progress, id: string, now = new Date()): Progress {
  const task = progress.tasks.find(task => task.id === id);
  if (!task) return progress;
  const day = localDay(now);
  // Reopening on a later day preserves earlier completions. Same-day undo removes that day's entry.
  const history = progress.history.filter(entry => entry.taskId !== id || entry.day !== day);
  if (!task.done) history.push({ taskId: id, title: task.title, day, completedAt: now.toISOString() });
  return { ...progress, tasks: toggleTask(progress.tasks, id), history };
}
export function removeProgressTask(progress: Progress, id: string): Progress {
  return { ...progress, tasks: removeTask(progress.tasks, id) };
}
export function historyForDay(progress: Progress, day: string): Completion[] {
  return progress.history.filter(entry => entry.day === day).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function decodeTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid task data");
  const ids = new Set<string>();
  for (const task of value) {
    if (!task || typeof task !== "object" || typeof task.id !== "string" || !task.id || ids.has(task.id) ||
      typeof task.title !== "string" || !task.title.trim() || task.title.length > 100 || typeof task.done !== "boolean") throw new Error("Invalid task data");
    ids.add(task.id);
  }
  return value.map(({ id, title, done }) => ({ id, title, done }));
}
function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function decodeProgress(raw: string | null, legacy: string | null = null): Progress {
  if (raw === null) return { ...emptyProgress(), tasks: decodeTasks(legacy) };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 2 ||
    !("tasks" in value) || !("history" in value) || !Array.isArray(value.history)) throw new Error("Invalid progress data");
  const tasks = decodeTasks(JSON.stringify(value.tasks));
  const entries = new Set<string>();
  for (const entry of value.history) {
    if (!entry || typeof entry !== "object" || typeof entry.taskId !== "string" || !entry.taskId ||
      typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 100 || !validDay(entry.day) ||
      typeof entry.completedAt !== "string" || !Number.isFinite(Date.parse(entry.completedAt)) ||
      new Date(entry.completedAt).toISOString() !== entry.completedAt) throw new Error("Invalid history data");
    const key = JSON.stringify([entry.taskId, entry.day]);
    if (entries.has(key)) throw new Error("Duplicate history entry");
    entries.add(key);
  }
  return { version: 2, tasks, history: value.history.map(({ taskId, title, day, completedAt }) => ({ taskId, title, day, completedAt })) };
}
export async function readProgress(storage: { getItem(key: string): Promise<string | null> }): Promise<Progress> {
  const current = await storage.getItem(STORAGE_KEY);
  // A corrupt v2 store must fail visibly; falling back could overwrite recent history.
  if (current !== null) return decodeProgress(current);
  return decodeProgress(null, await storage.getItem(LEGACY_STORAGE_KEY));
}
