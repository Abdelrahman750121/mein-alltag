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

import {
  decodeProgress,
  emptyProgress,
  addProgressTask,
  toggleProgress,
  removeProgressTask,
  historyForDay,
  localDay,
  shiftDay,
  readProgress,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "./tasks.ts";

const monday = () => new Date(2026, 9, 26, 23, 55);
const tuesday = () => new Date(2026, 9, 27, 8, 15);
function withTask() {
  return addProgressTask(emptyProgress(), "Buch lesen", "book");
}

test("Erledigung erhält lokalen Tag und Zeitpunkt, auch nach erneutem Laden", () => {
  const progress = toggleProgress(withTask(), "book", monday());
  assert.deepEqual(progress.history, [
    {
      taskId: "book",
      title: "Buch lesen",
      day: "2026-10-26",
      completedAt: monday().toISOString(),
    },
  ]);
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
  const progress = removeProgressTask(
    toggleProgress(withTask(), "book", monday()),
    "book",
  );
  assert.equal(progress.tasks.length, 0);
  assert.equal(progress.history[0].title, "Buch lesen");
  assert.deepEqual(decodeProgress(JSON.stringify(progress)), progress);
});

test("Alte Daten werden verlustfrei und ohne erfundene Erledigungsdaten übernommen", async () => {
  const legacy = JSON.stringify([{ id: "old", title: "Kochen", done: true }]);
  const values = new Map([[LEGACY_STORAGE_KEY, legacy]]);
  const storage = { getItem: async (key) => values.get(key) ?? null };
  const migrated = await readProgress(storage);
  assert.equal(migrated.tasks[0].done, true);
  assert.deepEqual(migrated.history, []);
  values.set(STORAGE_KEY, JSON.stringify(migrated));
  assert.deepEqual(await readProgress(storage), migrated);
  assert.equal(values.get(LEGACY_STORAGE_KEY), legacy);
});

test("Beschädigter neuer Speicher fällt nicht still auf alte Daten zurück", async () => {
  const storage = {
    getItem: async (key) => (key === STORAGE_KEY ? "{broken" : "[]"),
  };
  await assert.rejects(readProgress(storage));
  const good = toggleProgress(withTask(), "book", monday());
  for (const changed of [
    { ...good, version: 99 },
    { ...good, tasks: null },
    { ...good, history: [{ ...good.history[0], day: "2026-02-30" }] },
    { ...good, history: [{ ...good.history[0], completedAt: "invalid" }] },
    { ...good, history: [...good.history, ...good.history] },
  ])
    assert.throws(() => decodeProgress(JSON.stringify(changed)));
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
  assert.deepEqual(
    historyForDay(progress, "2026-10-27").map((entry) => entry.title),
    ["Laufen", "Buch lesen"],
  );
  assert.equal(progress.history[0].title, "Buch lesen");
  assert.strictEqual(toggleProgress(progress, "missing"), progress);
});

import {
  isTaskDone,
  configureTask,
  makeReminder,
  parseReminderTime,
  weekStart,
  weekSummary,
  HISTORY_STORAGE_KEY,
} from "./tasks.ts";
import {
  buildReminderPlans,
  diffReminderPlans,
  REMINDER_PREFIX,
} from "./notification-plans.ts";

test("Tägliche Aufgabe ist morgen wieder offen, Verlauf von gestern bleibt erhalten", () => {
  let progress = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  progress = toggleProgress(progress, "daily", monday());
  assert.equal(isTaskDone(progress, progress.tasks[0], "2026-10-26"), true);
  assert.equal(isTaskDone(progress, progress.tasks[0], "2026-10-27"), false);
  progress = toggleProgress(progress, "daily", tuesday());
  assert.equal(isTaskDone(progress, progress.tasks[0], "2026-10-27"), true);
  assert.equal(progress.history.length, 2);
  progress = toggleProgress(progress, "daily", tuesday());
  assert.equal(isTaskDone(progress, progress.tasks[0], "2026-10-27"), false);
  assert.equal(historyForDay(progress, "2026-10-26").length, 1);
});

test("Einmalige Aufgaben bleiben erledigt; Wechsel von täglich zu einmalig behält den heutigen Status", () => {
  const once = toggleProgress(withTask(), "book", monday());
  assert.equal(isTaskDone(once, once.tasks[0], "2026-10-27"), true);
  let daily = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  daily = toggleProgress(daily, "daily", monday());
  daily = configureTask(
    daily,
    "daily",
    { daily: false, reminder: null },
    tuesday(),
  );
  assert.equal(daily.tasks[0].done, false);
  assert.equal(daily.history.length, 1);
});

test("Version 2 wird mit Verlauf und einmaligen Aufgaben in Version 4 übernommen", async () => {
  const previous = JSON.stringify({
    version: 2,
    tasks: [{ id: "old", title: "Kochen", done: true }],
    history: [
      {
        taskId: "old",
        title: "Kochen",
        day: "2026-10-26",
        completedAt: monday().toISOString(),
      },
    ],
  });
  const migrated = await readProgress({
    getItem: async (key) => (key === HISTORY_STORAGE_KEY ? previous : null),
  });
  assert.equal(migrated.version, 4);
  assert.equal(migrated.tasks[0].daily, false);
  assert.equal(migrated.tasks[0].reminder, null);
  assert.equal(migrated.tasks[0].done, true);
  assert.equal(migrated.history[0].day, "2026-10-26");
  await assert.rejects(
    readProgress({
      getItem: async (key) => (key === STORAGE_KEY ? "broken" : previous),
    }),
  );
});

test("Erinnerungszeiten werden validiert und einmalige Erinnerungen korrekt auf morgen gelegt", () => {
  assert.deepEqual(parseReminderTime("8:05"), { hour: 8, minute: 5 });
  assert.deepEqual(parseReminderTime("23:59"), { hour: 23, minute: 59 });
  for (const text of ["24:00", "12:60", "-1:00", "18", "ab:cd", "1:2"])
    assert.equal(parseReminderTime(text), null);
  assert.throws(() => makeReminder("25:00", true));
  const now = new Date(2026, 9, 27, 19);
  const once = makeReminder("18:00", false, now);
  assert.equal(localDay(new Date(once.at)), "2026-10-28");
  assert.equal(new Date(once.at).getHours(), 18);
  assert.deepEqual(makeReminder("18:00", true, now), {
    hour: 18,
    minute: 0,
    at: null,
  });
});

test("Abgelaufene und abgehakte einmalige Erinnerungen werden nicht erneut geplant", () => {
  let progress = configureTask(
    withTask(),
    "book",
    { daily: false, reminder: makeReminder("09:00", false, tuesday()) },
    tuesday(),
  );
  const plans = buildReminderPlans(progress, tuesday());
  assert.equal(plans.length, 1);
  assert.equal(plans[0].trigger.kind, "once");
  assert.equal(
    buildReminderPlans(progress, new Date(2026, 9, 27, 10)).length,
    0,
  );
  progress = toggleProgress(progress, "book", tuesday());
  assert.equal(progress.tasks[0].reminder, null);
  assert.equal(buildReminderPlans(progress, tuesday()).length, 0);
});

test("Tägliche Erinnerung bleibt täglich, auch nach dem Häkchen; Löschen entfernt den Plan", () => {
  let progress = configureTask(
    addProgressTask(emptyProgress(), "Laufen", "run", true),
    "run",
    { daily: true, reminder: makeReminder("18:00", true) },
  );
  progress = toggleProgress(progress, "run", tuesday());
  assert.deepEqual(buildReminderPlans(progress, tuesday())[0].trigger, {
    kind: "daily",
    hour: 18,
    minute: 0,
  });
  assert.equal(
    buildReminderPlans(removeProgressTask(progress, "run"), tuesday()).length,
    0,
  );
});

test("Erinnerungsabgleich vermeidet Duplikate und entfernt nur eigene, geänderte oder gelöschte Pläne", () => {
  const progress = configureTask(withTask(), "book", {
    daily: true,
    reminder: makeReminder("18:00", true),
  });
  const desired = buildReminderPlans(progress, tuesday());
  const existing = desired.map((plan) => ({
    identifier: plan.identifier,
    signature: plan.signature,
  }));
  assert.deepEqual(diffReminderPlans(desired, existing), {
    cancel: [],
    schedule: [],
  });
  const changed = buildReminderPlans(
    configureTask(progress, "book", {
      daily: true,
      reminder: makeReminder("19:00", true),
    }),
    tuesday(),
  );
  assert.deepEqual(diffReminderPlans(changed, existing).cancel, [
    desired[0].identifier,
  ]);
  assert.equal(diffReminderPlans(changed, existing).schedule.length, 1);
  assert.deepEqual(
    diffReminderPlans(
      [],
      [
        ...existing,
        { identifier: REMINDER_PREFIX + "orphan", signature: undefined },
        { identifier: "another-project", signature: "keep" },
      ],
    ).cancel,
    [desired[0].identifier, REMINDER_PREFIX + "orphan"],
  );
});

test("Ungültige Erinnerungsdaten werden beim Laden abgewiesen", () => {
  const progress = withTask();
  for (const reminder of [
    { hour: 25, minute: 0, at: null },
    { hour: 18, minute: -1, at: null },
    { hour: 18.5, minute: 0, at: null },
    { hour: 18, minute: 0, at: "bad" },
    { hour: 18, minute: 0, at: null },
  ]) {
    assert.throws(() =>
      decodeProgress(
        JSON.stringify({
          ...progress,
          tasks: [{ ...progress.tasks[0], reminder }],
        }),
      ),
    );
  }
  assert.throws(() =>
    decodeProgress(
      JSON.stringify({
        ...progress,
        tasks: [{ ...progress.tasks[0], daily: "yes" }],
      }),
    ),
  );
});

test("Wochenübersicht zählt Montag bis Sonntag und erhält gelöschte Aufgaben", () => {
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  assert.equal(weekStart("2026-10-26"), "2026-10-26");
  let progress = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  progress = toggleProgress(progress, "daily", new Date(2026, 9, 25, 12));
  progress = toggleProgress(progress, "daily", monday());
  progress = toggleProgress(progress, "daily", tuesday());
  progress = removeProgressTask(progress, "daily");
  const week = weekSummary(progress, "2026-10-27");
  assert.equal(week.total, 2);
  assert.deepEqual(
    week.days.map((day) => day.count),
    [1, 1, 0, 0, 0, 0, 0],
  );
  assert.equal(weekSummary(progress, "2026-10-25").total, 1);
  assert.equal(weekSummary(emptyProgress(), "2027-01-01").days.length, 7);
});

import { taskStreak, reminderForSettings } from "./tasks.ts";

test("Serie beginnt beim ersten Häkchen und bleibt erhalten, solange heute noch offen ist", () => {
  let progress = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-26"), {
    current: 0,
    best: 0,
  });
  for (const day of [26, 27, 28])
    progress = toggleProgress(progress, "daily", new Date(2026, 9, day, 12));
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-28"), {
    current: 3,
    best: 3,
  });
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-29"), {
    current: 3,
    best: 3,
  });
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-30"), {
    current: 0,
    best: 3,
  });
  progress = toggleProgress(progress, "daily", new Date(2026, 9, 30, 12));
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-30"), {
    current: 1,
    best: 3,
  });
});

test("Häkchen zurücknehmen korrigiert die Serie; andere Aufgaben zählen nicht mit", () => {
  let progress = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  progress = addProgressTask(progress, "Laufen", "run", true);
  for (const day of [26, 27, 28])
    progress = toggleProgress(progress, "daily", new Date(2026, 9, day, 12));
  progress = toggleProgress(progress, "run", new Date(2026, 9, 29, 12));
  progress = toggleProgress(progress, "daily", new Date(2026, 9, 28, 13));
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-28"), {
    current: 2,
    best: 2,
  });
  assert.deepEqual(taskStreak(progress, "missing", "2026-10-28"), {
    current: 0,
    best: 0,
  });
});

test("Serien ignorieren zukünftige Einträge und zählen Kalendertage über Sommerzeit- und Jahresgrenzen", () => {
  let progress = addProgressTask(emptyProgress(), "Lesen", "daily", true);
  for (const date of [
    new Date(2026, 9, 24, 12),
    new Date(2026, 9, 25, 12),
    new Date(2026, 9, 26, 12),
    new Date(2026, 9, 27, 12),
  ])
    progress = toggleProgress(progress, "daily", date);
  assert.deepEqual(taskStreak(progress, "daily", "2026-10-26"), {
    current: 3,
    best: 3,
  });
  progress = addProgressTask(progress, "Laufen", "year", true);
  for (const date of [new Date(2026, 11, 31, 12), new Date(2027, 0, 1, 12)])
    progress = toggleProgress(progress, "year", date);
  assert.deepEqual(taskStreak(progress, "year", "2027-01-01"), {
    current: 2,
    best: 2,
  });
});

test("Umbenennen erhält Identität, Status, Erinnerung und historische Titel", () => {
  let progress = addProgressTask(emptyProgress(), "Buch lesen", "daily", true);
  const reminder = makeReminder("18:00", true);
  progress = configureTask(
    progress,
    "daily",
    { daily: true, reminder },
    monday(),
  );
  progress = toggleProgress(progress, "daily", monday());
  const before = progress;
  progress = configureTask(
    progress,
    "daily",
    { title: "  20 Minuten lesen  ", daily: true, reminder },
    tuesday(),
  );
  assert.equal(progress.tasks[0].id, "daily");
  assert.equal(progress.tasks[0].title, "20 Minuten lesen");
  assert.strictEqual(progress.tasks[0].reminder, reminder);
  assert.strictEqual(progress.history, before.history);
  assert.equal(progress.history[0].title, "Buch lesen");
  assert.equal(before.tasks[0].title, "Buch lesen");
  progress = toggleProgress(progress, "daily", tuesday());
  assert.deepEqual(
    progress.history.map((entry) => entry.title),
    ["Buch lesen", "20 Minuten lesen"],
  );
  assert.deepEqual(
    taskStreak(decodeProgress(JSON.stringify(progress)), "daily", "2026-10-27"),
    { current: 2, best: 2 },
  );
});

test("Ungültige Namen werden beim Bearbeiten abgewiesen; erledigte Aufgaben bleiben erledigt", () => {
  const progress = toggleProgress(withTask(), "book", monday());
  for (const title of ["", "   ", "x".repeat(101)])
    assert.throws(() =>
      configureTask(
        progress,
        "book",
        { title, daily: false, reminder: null },
        tuesday(),
      ),
    );
  const renamed = configureTask(
    progress,
    "book",
    { title: "Neuer Name", daily: false, reminder: null },
    tuesday(),
  );
  assert.equal(renamed.tasks[0].done, true);
  assert.equal(renamed.history[0].title, "Buch lesen");
  assert.strictEqual(
    configureTask(progress, "missing", {
      title: "Name",
      daily: false,
      reminder: null,
    }),
    progress,
  );
});

test("Bloßes Bearbeiten verschiebt keine einmalige Erinnerung, auch wenn sie abgelaufen ist", () => {
  const reminder = makeReminder("09:00", false, tuesday());
  const progress = configureTask(
    withTask(),
    "book",
    { daily: false, reminder },
    tuesday(),
  );
  const task = progress.tasks[0];
  const later = new Date(2026, 9, 27, 10);
  const preserved = reminderForSettings(task, true, "09:00", false, later);
  assert.strictEqual(preserved, reminder);
  const renamed = configureTask(
    progress,
    "book",
    { title: "Lesen", daily: false, reminder: preserved },
    later,
  );
  assert.equal(buildReminderPlans(renamed, later).length, 0);
  assert.equal(reminderForSettings(task, false, "invalid", false, later), null);
  assert.throws(() => reminderForSettings(task, true, "25:00", false, later));
  const changed = reminderForSettings(task, true, "11:00", false, later);
  assert.equal(new Date(changed.at).getDate(), 27);
  assert.equal(new Date(changed.at).getHours(), 11);
});

test("Aktive Erinnerung bekommt den neuen Namen, aber behält Termin und Kennung", () => {
  const reminder = makeReminder("18:00", true);
  const progress = configureTask(withTask(), "book", { daily: true, reminder });
  const original = buildReminderPlans(progress, tuesday());
  const renamed = configureTask(progress, "book", {
    title: "20 Minuten lesen",
    daily: true,
    reminder,
  });
  const changed = buildReminderPlans(renamed, tuesday());
  assert.equal(changed[0].identifier, original[0].identifier);
  assert.deepEqual(changed[0].trigger, original[0].trigger);
  assert.equal(changed[0].title, "20 Minuten lesen");
  const diff = diffReminderPlans(
    changed,
    original.map((plan) => ({
      identifier: plan.identifier,
      signature: plan.signature,
    })),
  );
  assert.deepEqual(diff.cancel, [original[0].identifier]);
  assert.equal(diff.schedule.length, 1);
});

import { filterTasks, categoryLabel, PREVIOUS_STORAGE_KEY } from "./tasks.ts";
import {
  createBackup,
  parseBackup,
  prepareRestoration,
  persistRestoration,
  MAX_BACKUP_BYTES,
  PRE_RESTORE_KEY,
  assertBackupSize,
  backupFilename,
} from "./backup.ts";

test("Kategorien ordnen Aufgaben, ohne die vollständige Liste zu verändern", () => {
  let progress = addProgressTask(
    emptyProgress(),
    "Laufen",
    "run",
    true,
    "sport",
  );
  progress = addProgressTask(progress, "Kochen", "cook", false, "household");
  progress = addProgressTask(progress, "Spielen", "play", false, "leisure");
  progress = addProgressTask(progress, "Notiz", "note");
  assert.equal(filterTasks(progress.tasks, "all").length, 4);
  assert.deepEqual(
    filterTasks(progress.tasks, "sport").map((task) => task.title),
    ["Laufen"],
  );
  assert.equal(filterTasks(progress.tasks, "none")[0].id, "note");
  assert.equal(categoryLabel("household"), "Haushalt");
  assert.equal(progress.tasks.length, 4);
});

test("Kategorie ändern erhält Identität, Serie, Verlauf und Erinnerungszeit", () => {
  let progress = addProgressTask(
    emptyProgress(),
    "Lesen",
    "book",
    true,
    "none",
  );
  const reminder = makeReminder("18:00", true);
  progress = configureTask(
    progress,
    "book",
    { daily: true, reminder },
    monday(),
  );
  progress = toggleProgress(progress, "book", monday());
  const changed = configureTask(
    progress,
    "book",
    { category: "leisure", daily: true, reminder },
    tuesday(),
  );
  assert.equal(changed.tasks[0].category, "leisure");
  assert.equal(changed.tasks[0].id, "book");
  assert.strictEqual(changed.tasks[0].reminder, reminder);
  assert.strictEqual(changed.history, progress.history);
  assert.deepEqual(taskStreak(changed, "book", "2026-10-27"), {
    current: 1,
    best: 1,
  });
  assert.equal(progress.tasks[0].category, "none");
});

test("Version 3 wird ohne Datenverlust und mit Ohne-Kategorie übernommen", async () => {
  const old = JSON.stringify({
    version: 3,
    tasks: [
      { id: "old", title: "Kochen", done: true, daily: false, reminder: null },
    ],
    history: [
      {
        taskId: "old",
        title: "Kochen",
        day: "2026-10-26",
        completedAt: monday().toISOString(),
      },
    ],
  });
  const progress = await readProgress({
    getItem: async (key) => (key === PREVIOUS_STORAGE_KEY ? old : null),
  });
  assert.equal(progress.version, 4);
  assert.equal(progress.tasks[0].category, "none");
  assert.equal(progress.tasks[0].done, true);
  assert.equal(progress.history.length, 1);
  await assert.rejects(
    readProgress({
      getItem: async (key) => (key === STORAGE_KEY ? "broken" : old),
    }),
  );
});

test("Unbekannte Kategorien werden abgewiesen", () => {
  assert.throws(() =>
    addProgressTask(emptyProgress(), "Test", "test", false, "unknown"),
  );
  assert.throws(() =>
    configureTask(withTask(), "book", {
      daily: false,
      reminder: null,
      category: "unknown",
    }),
  );
  const progress = withTask();
  assert.throws(() =>
    decodeProgress(
      JSON.stringify({
        ...progress,
        tasks: [{ ...progress.tasks[0], category: "unknown" }],
      }),
    ),
  );
});

function backupProgress() {
  let progress = addProgressTask(
    emptyProgress(),
    "Lesen 📚",
    "book",
    true,
    "leisure",
  );
  progress = configureTask(progress, "book", {
    daily: true,
    reminder: makeReminder("18:00", true),
  });
  progress = toggleProgress(progress, "book", monday());
  progress = addProgressTask(
    progress,
    "Gelöschte Aufgabe",
    "deleted",
    false,
    "household",
  );
  progress = toggleProgress(progress, "deleted", tuesday());
  return removeProgressTask(progress, "deleted");
}

test("Sicherung erhält Aufgaben, Kategorien, Erinnerungen, Serien und Verlauf gelöschter Aufgaben", () => {
  const progress = backupProgress();
  const now = new Date("2026-10-28T12:00:00.000Z");
  const parsed = parseBackup(createBackup(progress, now));
  assert.deepEqual(parsed.progress, progress);
  assert.equal(parsed.exportedAt, now.toISOString());
  assert.equal(
    parsed.progress.history.find((entry) => entry.taskId === "deleted").title,
    "Gelöschte Aufgabe",
  );
  assert.deepEqual(taskStreak(parsed.progress, "book", "2026-10-27"), {
    current: 1,
    best: 1,
  });
  assert.match(backupFilename(now), /^my-progress-sicherung-.*\.json$/);
  assert.doesNotMatch(backupFilename(now), /:/);
});

test("Leere Sicherung und Sicherungen mit älterem Speicherformat sind lesbar", () => {
  assert.deepEqual(
    parseBackup(createBackup(emptyProgress())).progress,
    emptyProgress(),
  );
  const value = JSON.parse(createBackup(emptyProgress()));
  value.progress = {
    version: 3,
    tasks: [{ id: "old", title: "Alt", done: false }],
    history: [],
  };
  assert.equal(
    parseBackup(JSON.stringify(value)).progress.tasks[0].category,
    "none",
  );
  assert.deepEqual(
    parseBackup("\uFEFF" + createBackup(emptyProgress())).progress,
    emptyProgress(),
  );
});

test("Fremde, beschädigte und nicht unterstützte Sicherungen werden vor der Wiederherstellung erkannt", () => {
  const valid = JSON.parse(createBackup(backupProgress()));
  for (const text of [
    "bad",
    "[]",
    "null",
    "{}",
    JSON.stringify({ ...valid, app: "other" }),
    JSON.stringify({ ...valid, backupVersion: 99 }),
    JSON.stringify({ ...valid, exportedAt: "invalid" }),
    JSON.stringify({ ...valid, progress: { ...valid.progress, version: 99 } }),
    JSON.stringify({
      ...valid,
      progress: {
        ...valid.progress,
        tasks: [...valid.progress.tasks, ...valid.progress.tasks],
      },
    }),
    JSON.stringify({
      ...valid,
      progress: {
        ...valid.progress,
        tasks: [{ ...valid.progress.tasks[0], category: "unknown" }],
      },
    }),
  ])
    assert.throws(() => parseBackup(text));
});

test("Dateigröße wird in UTF-8 begrenzt; die Datei wird nie still gekürzt", () => {
  assert.throws(
    () => assertBackupSize("x".repeat(MAX_BACKUP_BYTES + 1)),
    /zu groß/,
  );
  assert.throws(
    () => assertBackupSize("€".repeat(Math.floor(MAX_BACKUP_BYTES / 3) + 1)),
    /zu groß/,
  );
  assert.doesNotThrow(() => assertBackupSize("kleine Sicherung 📚"));
});

test("Wiederherstellung schaltet Erinnerungen standardmäßig aus und erhält sie nur auf Wunsch", () => {
  const original = backupProgress();
  const disabled = prepareRestoration(original);
  assert.equal(disabled.tasks[0].reminder, null);
  assert.notEqual(original.tasks[0].reminder, null);
  assert.deepEqual(disabled.history, original.history);
  assert.equal(disabled.tasks[0].category, "leisure");
  assert.deepEqual(prepareRestoration(original, true), original);
  assert.notStrictEqual(prepareRestoration(original, true), original);
});

test("Wiederherstellung ersetzt den Stand und bewahrt vorher die letzte gespeicherte Version auf", async () => {
  const previous = JSON.stringify(withTask());
  const values = new Map([[STORAGE_KEY, previous]]);
  const writes = [];
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  const restored = await persistRestoration(storage, emptyProgress());
  assert.deepEqual(restored, emptyProgress());
  assert.deepEqual(writes, [PRE_RESTORE_KEY, STORAGE_KEY]);
  assert.equal(values.get(PRE_RESTORE_KEY), previous);
  assert.deepEqual(decodeProgress(values.get(STORAGE_KEY)), emptyProgress());
});

test("Ein fehlgeschlagener Vorbereitungsschritt überschreibt keine vorhandenen Daten", async () => {
  const previous = JSON.stringify(withTask());
  const writes = [];
  const storage = {
    getItem: async () => previous,
    setItem: async (key) => {
      writes.push(key);
      throw new Error("disk full");
    },
  };
  await assert.rejects(
    persistRestoration(storage, emptyProgress()),
    /disk full/,
  );
  assert.deepEqual(writes, [PRE_RESTORE_KEY]);
});

test("Fehler beim Speichern werden gemeldet und der vorherige gespeicherte Stand bleibt als Kopie erhalten", async () => {
  const previous = JSON.stringify(withTask());
  const values = new Map([[STORAGE_KEY, previous]]);
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (key === STORAGE_KEY) throw new Error("write failed");
      values.set(key, value);
    },
  };
  await assert.rejects(
    persistRestoration(storage, backupProgress()),
    /write failed/,
  );
  assert.equal(values.get(STORAGE_KEY), previous);
  assert.equal(values.get(PRE_RESTORE_KEY), previous);
});
