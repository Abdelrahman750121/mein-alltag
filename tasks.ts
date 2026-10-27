export type Task = { id: string; title: string; done: boolean };
export const STORAGE_KEY = "mein-alltag.tasks.v1";
export function addTask(tasks: Task[], title: string, id: string): Task[] {
  const clean = title.trim();
  return clean && clean.length <= 100
    ? [...tasks, { id, title: clean, done: false }]
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
export function decodeTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid task data");
  const ids = new Set<string>();
  for (const task of value) {
    if (
      !task ||
      typeof task !== "object" ||
      typeof task.id !== "string" ||
      !task.id ||
      ids.has(task.id) ||
      typeof task.title !== "string" ||
      !task.title.trim() ||
      task.title.length > 100 ||
      typeof task.done !== "boolean"
    )
      throw new Error("Invalid task data");
    ids.add(task.id);
  }
  return value.map(({ id, title, done }) => ({ id, title, done }));
}
