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

import { decodeProgress, emptyProgress, addProgressTask, toggleProgress, removeProgressTask,
  historyForDay, localDay, shiftDay, readProgress, STORAGE_KEY, LEGACY_STORAGE_KEY } from "./tasks.ts";

const monday = () => new Date(2026, 9, 26, 23, 55);
const tuesday = () => new Date(2026, 9, 27, 8, 15);
function withTask() { return addProgressTask(emptyProgress(), "Buch lesen", "book"); }

test("Erledigung erhält lokalen Tag und Zeitpunkt, auch nach erneutem Laden", () => {
  const progress = toggleProgress(withTask(), "book", monday());
  assert.deepEqual(progress.history, [{ taskId: "book", title: "Buch lesen", day: "2026-10-26", completedAt: monday().toISOString() }]);
  const restored = decodeProgress(JSON.stringify(progress));
  assert.equal(historyForDay(restored, "2026-10-26").length, 1);
  assert.equal(historyForDay(restored, "2026-10-27").length, 0);
});

test("Häkchen am selben Tag zurücknehmen und neu setzen erzeugt keine Duplikate", () => {
  let progress = toggleProgress(withTask(), "book", monday());
  progress = toggleProgress(progress, "book", monday());
  assert.equal(progress.history.length, 0);
  assert.equal(progress.tasks[0].done, false);
  progress = toggleProgress(progress, "book", monday());
  assert.equal(progress.history.length, 1);
});

test("Wiederholen am nächsten Tag erhält die Erledigung von gestern", () => {
  let progress = toggleProgress(withTask(), "book", monday());
  progress = toggleProgress(progress, "book", tuesday());
  assert.equal(progress.history.length, 1);
  progress = toggleProgress(progress, "book", tuesday());
  assert.equal(progress.history.length, 2);
  assert.equal(historyForDay(progress, "2026-10-26").length, 1);
  assert.equal(historyForDay(progress, "2026-10-27").length, 1);
  progress = toggleProgress(progress, "book", tuesday());
  assert.equal(progress.history.length, 1);
  assert.equal(progress.history[0].day, "2026-10-26");
});

test("Aufgabe löschen erhält den Verlauf einschließlich ihres Titels", () => {
  const progress = removeProgressTask(toggleProgress(withTask(), "book", monday()), "book");
  assert.equal(progress.tasks.length, 0);
  assert.equal(progress.history[0].title, "Buch lesen");
  assert.deepEqual(decodeProgress(JSON.stringify(progress)), progress);
});

test("Alte Daten werden verlustfrei und ohne erfundene Erledigungsdaten übernommen", async () => {
  const legacy = JSON.stringify([{ id: "old", title: "Kochen", done: true }]);
  const values = new Map([[LEGACY_STORAGE_KEY, legacy]]);
  const storage = { getItem: async key => values.get(key) ?? null };
  const migrated = await readProgress(storage);
  assert.equal(migrated.tasks[0].done, true);
  assert.deepEqual(migrated.history, []);
  values.set(STORAGE_KEY, JSON.stringify(migrated));
  assert.deepEqual(await readProgress(storage), migrated);
  assert.equal(values.get(LEGACY_STORAGE_KEY), legacy);
});

test("Beschädigter neuer Speicher fällt nicht still auf alte Daten zurück", async () => {
  const storage = { getItem: async key => key === STORAGE_KEY ? '{broken' : '[]' };
  await assert.rejects(readProgress(storage));
  const good = toggleProgress(withTask(), "book", monday());
  for (const changed of [
    { ...good, version: 3 },
    { ...good, tasks: null },
    { ...good, history: [{ ...good.history[0], day: "2026-02-30" }] },
    { ...good, history: [{ ...good.history[0], completedAt: "invalid" }] },
    { ...good, history: [...good.history, ...good.history] },
  ]) assert.throws(() => decodeProgress(JSON.stringify(changed)));
});

test("Kalendertage funktionieren an Monats-, Jahres- und Sommerzeitgrenzen", () => {
  assert.equal(localDay(new Date(2026, 9, 27, 0, 1)), "2026-10-27");
  assert.equal(shiftDay("2026-03-29", 1), "2026-03-30");
  assert.equal(shiftDay("2026-10-25", -1), "2026-10-24");
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDay("2028-03-01", -1), "2028-02-29");
});

test("Verlauf sortiert neueste Erledigung zuerst und verändert den Speicher nicht", () => {
  let progress = addProgressTask(withTask(), "Laufen", "run");
  progress = toggleProgress(progress, "book", new Date(2026, 9, 27, 8));
  progress = toggleProgress(progress, "run", new Date(2026, 9, 27, 10));
  assert.deepEqual(historyForDay(progress, "2026-10-27").map(entry => entry.title), ["Laufen", "Buch lesen"]);
  assert.equal(progress.history[0].title, "Buch lesen");
  assert.strictEqual(toggleProgress(progress, "missing"), progress);
});
