# My progress
Eine Expo-App für Alltagsaufgaben mit deutscher Oberfläche.

## Funktionen
- Aufgaben hinzufügen, abhaken, wieder öffnen und löschen.
- Vorschläge: Kochen, Spielen, Buch lesen und Laufen.
- Fortschrittsanzeige und lokale Speicherung auf dem Gerät.
- Aufgaben bleiben erhalten, bis du sie löschst; kein automatischer Tageswechsel.

## Starten
Node.js 24 LTS installieren, dann im Projektordner:

```sh
npm ci
npm start
```

QR-Code mit einer passenden Expo-Go-Version auf dem Handy öffnen.
Computer und Handy sollten im gleichen WLAN sein. Webvorschau: `npm run web`.
Das Projekt verwendet Expo SDK 58. Expo Go muss diese Version unterstützen;
alternativ einen passenden Development Build verwenden.

## Prüfungen
```sh
npm test
npm run typecheck
npm run build:web
```

Aufgaben liegen in AsyncStorage auf dem Gerät, im Browser im lokalen Browserspeicher.
GitHub sichert den Quellcode, nicht deine eingegebenen Aufgaben.
Deinstallation oder Löschen des App-/Browserspeichers kann Aufgaben entfernen.
Kein Login, Backend oder LLM in der fertigen App.

## Entwicklung mit einem Agenten
Codex entwickelt und prüft die App. Regeln und Zustimmung bei Funktionsänderungen
stehen in AGENTS.md. Ein separates Codex SDK ist für diesen Workflow nicht nötig.

## Bisherige Validierung
- Vier automatisierte Tests: Aufgabenablauf, Eingabegrenzen, Speicherrundlauf und ungültige Speicherdaten.
- TypeScript-Prüfung und Web-Produktionsbuild.
- Native Tests auf einem echten Handy stehen noch aus.

Die Paketprüfung meldet eine bekannte Schwachstelle in Zod 3, das von der Expo CLI
verwendet wird (GHSA-mrhx-c7xc-m3w5). Die App verwendet Zod nicht direkt. Ein erzwungener
Wechsel auf Zod 4 oder ein Downgrade des Expo SDK wurde wegen möglicher Inkompatibilität
nicht vorgenommen. Vor einer Veröffentlichung die aktuelle Expo-Version erneut prüfen.



## Upgrade auf SDK 58
Expo ist auf ~58.0.0 eingestellt (installierter Patch: 58.0.19).
Die zugehörigen Pakete wurden mit expo install --fix abgeglichen:
React 19.3.0, React Native 0.88.0 sowie passende Status-Bar-, Safe-Area- und React-Typen.
Validiert: vier Funktionstests, TypeScript, Web-Export, iOS-Hermes-Bundle und
Expo Doctor (20/20 Prüfungen). Ein Test auf einem echten iPhone steht noch aus.

Nach einem SDK-Wechsel den laufenden Server mit Strg+C stoppen und neu starten:

```sh
npx expo start --clear
```
