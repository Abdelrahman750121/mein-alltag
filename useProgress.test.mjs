import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as tasks from "./tasks.ts";
import * as backup from "./backup.ts";

const hookCode = ts.transpileModule(
  readFileSync(new URL("./useProgress.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
const day = "2026-10-28";
const makeProgress = (title = "Lesen") =>
  tasks.addProgressTask(tasks.emptyProgress(), title, title, true, "leisure");
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function storageWith(progress) {
  const values = new Map(
    progress ? [[tasks.STORAGE_KEY, JSON.stringify(progress)]] : [],
  );
  const writes = [];
  return {
    values,
    writes,
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      writes.push({ key, value });
      values.set(key, value);
    },
  };
}
// Exercise the real hook with controlled effects and storage promises, without native UI.
function mountStore(storage, syncReminders = async () => {}) {
  const slots = [];
  let cursor = 0,
    pending = [],
    mounted = true,
    scheduled = false,
    current,
    today = day;
  const listeners = new Set();
  function schedule() {
    if (!mounted || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (mounted) render();
    });
  }
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next =
            typeof value === "function" ? value(slots[index]) : value;
          if (!Object.is(next, slots[index])) {
            slots[index] = next;
            schedule();
          }
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      return (slots[index] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const index = cursor++,
        previous = slots[index];
      if (
        !previous ||
        deps.some((value, i) => !Object.is(value, previous.deps[i]))
      ) {
        slots[index] = { deps, cleanup: previous?.cleanup };
        pending.push(() => {
          previous?.cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const modules = {
    react,
    "react-native": {
      AppState: {
        addEventListener(event, callback) {
          listeners.add(callback);
          return { remove: () => listeners.delete(callback) };
        },
      },
    },
    "@react-native-async-storage/async-storage": storage,
    "./tasks": tasks,
    "./backup": backup,
    "./reminders": { syncReminders },
  };
  const exports = {};
  new Function("require", "exports", hookCode)((name) => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  }, exports);
  function render() {
    cursor = 0;
    pending = [];
    current = exports.useProgress(today);
    const effects = pending;
    for (const effect of effects) effect();
  }
  render();
  return {
    get state() {
      return current;
    },
    async settle() {
      for (let i = 0; i < 8; i++) await new Promise(setImmediate);
    },
    changeDay(value) {
      today = value;
      render();
    },
    resume() {
      for (const callback of listeners) callback("active");
    },
    unmount() {
      mounted = false;
      for (const slot of slots) slot?.cleanup?.();
      assert.equal(listeners.size, 0);
    },
  };
}

test("Ausgelagerter Speicher lädt Aufgaben und Verlauf nach erneutem Öffnen", async () => {
  const storage = storageWith();
  const first = mountStore(storage);
  await first.settle();
  first.state.setProgress((current) =>
    tasks.addProgressTask(current, "Laufen", "run", true, "sport"),
  );
  await first.settle();
  first.state.setProgress((current) =>
    tasks.toggleProgress(current, "run", new Date(`${day}T12:00:00`)),
  );
  await first.settle();
  const saved = JSON.stringify(first.state.progress);
  first.unmount();
  const second = mountStore(storage);
  await second.settle();
  assert.equal(second.state.loaded, true);
  assert.equal(JSON.stringify(second.state.progress), saved);
  assert.equal(
    tasks.isTaskDone(
      second.state.progress,
      second.state.progress.tasks[0],
      day,
    ),
    true,
  );
  assert.equal(second.state.progress.history.length, 1);
  second.changeDay("2026-10-29");
  await second.settle();
  assert.equal(
    tasks.isTaskDone(
      second.state.progress,
      second.state.progress.tasks[0],
      "2026-10-29",
    ),
    false,
  );
  assert.equal(second.state.progress.history.length, 1);
  second.unmount();
});

test("Beschädigte Daten bleiben bei einem Ladefehler unverändert", async () => {
  const storage = storageWith();
  storage.values.set(tasks.STORAGE_KEY, "kaputt");
  const app = mountStore(storage);
  await app.settle();
  assert.equal(app.state.loaded, false);
  assert.equal(app.state.loading, false);
  assert.match(app.state.error, /nicht geladen/);
  assert.equal(storage.values.get(tasks.STORAGE_KEY), "kaputt");
  assert.equal(storage.writes.length, 0);
  app.unmount();
});

test("Speichervorgänge behalten auch bei langsamen Schreibzugriffen ihre Reihenfolge", async () => {
  const storage = storageWith(makeProgress());
  const app = mountStore(storage);
  await app.settle();
  const gate = deferred(),
    originalSet = storage.setItem.bind(storage);
  let calls = 0;
  storage.setItem = async (key, value) => {
    if (++calls === 1) await gate.promise;
    await originalSet(key, value);
  };
  app.state.setProgress(makeProgress("Erster Stand"));
  await app.settle();
  app.state.setProgress(makeProgress("Letzter Stand"));
  await app.settle();
  assert.equal(calls, 1);
  assert.equal(app.state.saving, true);
  gate.resolve();
  await app.settle();
  assert.equal(
    JSON.parse(storage.values.get(tasks.STORAGE_KEY)).tasks[0].title,
    "Letzter Stand",
  );
  assert.equal(app.state.saving, false);
  app.unmount();
});

test("Wiederherstellung verhindert, dass alte wartende Speicherstände zurückgeschrieben werden", async () => {
  const storage = storageWith(makeProgress());
  const app = mountStore(storage);
  await app.settle();
  const gate = deferred(),
    originalSet = storage.setItem.bind(storage);
  let calls = 0;
  storage.setItem = async (key, value) => {
    if (++calls === 1) await gate.promise;
    await originalSet(key, value);
  };
  app.state.setProgress(makeProgress("Schon gestartet"));
  await app.settle();
  app.state.setProgress(makeProgress("Veraltet und wartend"));
  await app.settle();
  const restoring = app.state.restore(makeProgress("Sicherung"));
  gate.resolve();
  await restoring;
  await app.settle();
  assert.equal(
    JSON.parse(storage.values.get(tasks.STORAGE_KEY)).tasks[0].title,
    "Sicherung",
  );
  assert.equal(app.state.progress.tasks[0].title, "Sicherung");
  assert.equal(app.state.restoreVersion, 1);
  assert.equal(
    JSON.parse(storage.values.get(backup.PRE_RESTORE_KEY)).tasks[0].title,
    "Schon gestartet",
  );
  assert.equal(
    storage.writes.some((entry) =>
      entry.value.includes("Veraltet und wartend"),
    ),
    false,
  );
  app.unmount();
});

test("Fehlgeschlagene Wiederherstellung behält den bisherigen sichtbaren Stand", async () => {
  const storage = storageWith(makeProgress("Bisher"));
  const app = mountStore(storage);
  await app.settle();
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = async (key, value) => {
    if (key === tasks.STORAGE_KEY) throw Error("Speicher voll");
    await originalSet(key, value);
  };
  await assert.rejects(
    app.state.restore(makeProgress("Neu")),
    /nicht auf dem Gerät gespeichert/,
  );
  await app.settle();
  assert.equal(app.state.progress.tasks[0].title, "Bisher");
  assert.equal(app.state.restoreVersion, 0);
  assert.equal(app.state.saveError, true);
  assert.equal(
    JSON.parse(storage.values.get(tasks.STORAGE_KEY)).tasks[0].title,
    "Bisher",
  );
  storage.setItem = originalSet;
  await app.state.restore(makeProgress("Neu"));
  await app.settle();
  assert.equal(app.state.progress.tasks[0].title, "Neu");
  assert.equal(app.state.saveError, false);
  app.unmount();
});

test("Speicherfehler lassen sich wiederholen, Erinnerungsfehler löschen keine Aufgaben", async () => {
  const storage = storageWith(makeProgress());
  let reminderFails = false;
  const app = mountStore(storage, async () => {
    if (reminderFails) throw Error("Erinnerung fehlgeschlagen");
  });
  await app.settle();
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = async () => {
    throw Error("Offline-Speicher voll");
  };
  app.state.setProgress(makeProgress("Geändert"));
  await app.settle();
  assert.equal(app.state.saveError, true);
  storage.setItem = originalSet;
  reminderFails = true;
  app.state.retry();
  await app.settle();
  assert.equal(app.state.saveError, false);
  assert.match(app.state.reminderError, /Erinnerung fehlgeschlagen/);
  assert.equal(
    JSON.parse(storage.values.get(tasks.STORAGE_KEY)).tasks[0].title,
    "Geändert",
  );
  reminderFails = false;
  app.resume();
  await app.settle();
  assert.equal(app.state.reminderError, "");
  app.unmount();
});
