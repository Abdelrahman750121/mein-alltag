import { test } from "node:test";
import assert from "node:assert/strict";
import { addTask, toggleTask, removeTask, decodeTasks } from "./tasks.ts";
test("Hinzufügen, abhaken, wieder öffnen und löschen", () => {
  let tasks = addTask([], "  Buch lesen  ", "1");
  assert.equal(tasks[0].title, "Buch lesen");
  tasks = addTask(tasks, "Laufen", "2");
  tasks = toggleTask(tasks, "1");
  assert.equal(tasks[0].done, true);
  assert.equal(tasks[1].done, false);
  tasks = toggleTask(tasks, "1");
  assert.equal(tasks[0].done, false);
  assert.deepEqual(
    removeTask(tasks, "1").map((task) => task.title),
    ["Laufen"],
  );
});
test("Leere und überlange Eingaben abweisen", () => {
  assert.deepEqual(addTask([], "   ", "1"), []);
  assert.deepEqual(addTask([], "x".repeat(101), "1"), []);
  assert.equal(addTask([], "x".repeat(100), "1").length, 1);
});
test("Speicherformat erhält Titel und Häkchen", () => {
  const tasks = toggleTask(addTask([], "Kochen 🍲", "1"), "1");
  assert.deepEqual(decodeTasks(JSON.stringify(tasks)), tasks);
  assert.deepEqual(decodeTasks(null), []);
});
test("Beschädigte Daten und doppelte IDs erkennen", () => {
  for (const raw of [
    "oops",
    "{}",
    "[null]",
    '[{"id":"1","title":"Test","done":"yes"}]',
    '[{"id":"1","title":"Test","done":true},{"id":"1","title":"Test","done":false}]',
  ])
    assert.throws(() => decodeTasks(raw));
});
