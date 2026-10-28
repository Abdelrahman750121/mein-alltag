# My progress
Eine Expo-App für Alltagsaufgaben mit deutscher Oberfläche.

## Funktionen
- Aufgaben hinzufügen, abhaken, wieder öffnen und löschen.
- Vorschläge: Kochen, Spielen, Buch lesen und Laufen.
- Fortschrittsanzeige und lokale Speicherung auf dem Gerät.
- Tagesverlauf mit Heute, Gestern, früheren Tagen und Erledigungszeitpunkt.
- Aufgaben bleiben erhalten; tägliche Aufgaben sind an jedem neuen Tag wieder offen.

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
- 42 automatisierte Tests: Aufgaben, Speicher, Verlauf, Migration, Tageswechsel, Erinnerungen, Statistiken, Serien, Bearbeiten, Kategorien und Datensicherung.
- TypeScript-Prüfung und Web-Produktionsbuild.
- Native Tests auf einem echten Handy stehen noch aus.

Die Paketprüfung meldet eine bekannte Schwachstelle in Zod 3, das von der Expo CLI
verwendet wird (GHSA-mrhx-c7xc-m3w5). Die App verwendet Zod nicht direkt. Ein erzwungener
Wechsel auf Zod 4 oder ein Downgrade des Expo SDK wurde wegen möglicher Inkompatibilität
nicht vorgenommen. Vor einer Veröffentlichung die aktuelle Expo-Version erneut prüfen.



## Upgrade auf SDK 58
Expo ist auf ~58.0.0 eingestellt (installierter Patch: 58.0.20).
Die zugehörigen Pakete wurden mit expo install --fix abgeglichen:
React 19.3.0, React Native 0.88.0 sowie passende Status-Bar-, Safe-Area- und React-Typen.
Validiert: vier Funktionstests, TypeScript, Web-Export, iOS-Hermes-Bundle und
Expo Doctor (20/20 Prüfungen). Ein Test auf einem echten iPhone steht noch aus.

Nach einem SDK-Wechsel den laufenden Server mit Strg+C stoppen und neu starten:

```sh
npx expo start --clear
```

## Tagesverlauf
Neue Häkchen speichern den lokalen Kalendertag, Zeitpunkt und Aufgabentitel.
Unter „Dein Tagesverlauf“ sind Heute, Gestern und über die Pfeile frühere Tage wählbar.
Der Verlauf bleibt beim Löschen einer Aufgabe erhalten. Das Zurücknehmen eines Häkchens
am selben Tag entfernt dessen Tageseintrag. Beim Wiederöffnen an einem späteren Tag
bleibt der frühere Eintrag erhalten; erneutes Abhaken schreibt einen Eintrag für den neuen Tag.
Es gibt höchstens einen Verlaufseintrag pro Aufgabe und Tag.

Bestehende Aufgaben werden aus dem alten Speicher übernommen. Bereits gesetzte Häkchen
haben kein rekonstruierbares Datum und werden deshalb nicht rückwirkend einem Tag zugeordnet.
Der bisherige Speicher bleibt als Migrationsquelle erhalten. Der neue Speicher enthält
Aufgaben und Verlauf gemeinsam; beschädigte neue Daten werden nicht durch alte überschrieben.
Einmalige Aufgaben bleiben erledigt. Tägliche Aufgaben sind an jedem neuen lokalen Kalendertag wieder offen; der Verlauf bleibt erhalten.

## Tägliche Aufgaben, Erinnerungen und Wochenübersicht
- Neue Aufgaben sind standardmäßig täglich. Die Auswahl unter dem Eingabefeld schaltet auf einmalige Aufgaben um.
- Bestehende Aufgaben werden als einmalig übernommen. Über ⋯ an einer Aufgabe lassen sich Wiederholung und Erinnerung einstellen.
- Tägliche Aufgaben brauchen keinen Hintergrundprozess zum Zurücksetzen: Ihr Status wird aus dem Verlauf für den aktuellen lokalen Tag berechnet.
- Die Wochenübersicht zeigt Montag bis Sonntag und lässt frühere Wochen ansehen. Gelöschte Aufgaben bleiben in ihren historischen Zählungen erhalten.

Erinnerungen verwenden expo-notifications (~58.1.6) und sind auf dem Gerät lokal geplant.
Die Berechtigung wird erst beim Speichern einer aktivierten Erinnerung angefragt.
Tägliche Erinnerungen wiederholen sich zur Uhrzeit, auch bei bereits abgehakter Aufgabe,
bis sie ausgeschaltet oder die Aufgabe gelöscht wird. Einmalige Erinnerungen sind einmal
für die nächste gewählte Uhrzeit geplant (falls heute schon vorbei: morgen). Abhaken schaltet
sie aus. Abgelaufene einmalige Erinnerungen werden nicht erneut angesetzt.

Berechtigungen, Fokus-Modus und Mitteilungseinstellungen des iPhones können die Anzeige
beeinflussen. Auf dem iPhone muss die Zustellung noch praktisch geprüft werden.
Die Browseransicht unterstützt Aufgaben und Statistiken; Erinnerungen richtet man in der
nativen App ein. Kein Push-Token, Server oder externer Benachrichtigungsdienst wird verwendet.

Speicher-Version 3 übernimmt Version 2 einschließlich Verlauf und fällt bei beschädigten
neuen Daten nicht still auf eine alte Version zurück. Alte Speicher bleiben als Migrationsquelle erhalten.

## Serien und Aufgaben bearbeiten
Tägliche Aufgaben zeigen „Serie“ (aktuell) und „Rekord“ (längste aufgezeichnete Folge).
Gezählt werden aufeinanderfolgende lokale Kalendertage mit einem gespeicherten Häkchen.
Solange heute noch offen ist, bleibt eine bis gestern laufende Serie aktiv. Nach einem
ausgelassenen Tag beginnt die nächste Erledigung wieder bei 1. Zukünftige Einträge und
Häkchen ohne bekanntes Datum werden nicht gezählt. Das Zurücknehmen eines Häkchens
korrigiert auch die aus dem Verlauf berechnete Serie und den Rekord.

Über ⋯ → Aufgabe bearbeiten kann der Name geändert werden (1 bis 100 Zeichen).
Aufgaben-ID, Verlauf und Serie bleiben erhalten. Historische Einträge behalten den Namen
zum Zeitpunkt der jeweiligen Erledigung; neue Häkchen verwenden den neuen Namen.
Eine unveränderte Erinnerungszeit wird beim Umbenennen nicht neu terminiert; aktive
Erinnerungen erhalten den neuen Aufgabentext. Die vorhandene Speicher-Version 3 bleibt kompatibel.

Validierung dieses Schritts: 28 Tests, TypeScript-Prüfung, Web-Export und iOS-Hermes-Bundle erfolgreich.
Der Expo-Server war für eine zusätzliche Browser-Bedienprüfung dieses Schritts nicht erreichbar.

## Kategorien
Beim Anlegen und Bearbeiten kann Ohne Kategorie, Sport, Haushalt oder Freizeit gewählt werden.
Bestehende Aufgaben bekommen bei der Migration Ohne Kategorie. Mit „Aufgaben filtern“ werden
passende Aufgaben angezeigt; Fortschrittsanzeige, Wochenübersicht und Verlauf bleiben vollständig.
Eine Kategorieänderung verändert weder Aufgaben-ID noch Serie, Verlauf oder Erinnerungszeit.

## Datensicherung
Unter „Deine Datensicherung“:
1. „Sicherung exportieren“ erzeugt eine JSON-Datei mit allen Aufgaben, Kategorien, Erinnerungseinstellungen und dem vollständigen Verlauf, einschließlich gelöschter Aufgaben im Verlauf.
2. Auf dem iPhone im Teilen-Menü „In Dateien sichern“ auswählen. Im Browser wird ein Download angefordert. Die App kann nicht feststellen, ob das Teilen-Menü ohne Speichern geschlossen wurde.
3. „Sicherung laden“ öffnet die Dateiauswahl. Die App prüft Format, Größe, Version und Daten.
4. Die Vorschau zeigt Aufgaben- und Erledigungszahlen. Erst „Daten ersetzen“ bestätigt den Austausch des aktuellen Stands. Abbrechen verändert keine Aufgaben oder Verlaufsdaten.

Eine Wiederherstellung ersetzt den aktuellen Stand; sie führt keine Bestände zusammen.
Erinnerungen sind dabei standardmäßig ausgeschaltet. Eine ausdrückliche Übernahme fragt auf
dem iPhone gegebenenfalls die Benachrichtigungsberechtigung an. Abgelaufene einmalige Erinnerungen
werden nicht neu terminiert. Die JSON-Datei ist nicht verschlüsselt und sollte geschützt aufbewahrt werden.
Es erfolgt kein automatischer Upload und keine neue Cloud-Synchronisierung.

Sicherungen sind auf 5 MiB begrenzt. Fremde Dateien, doppelte IDs, beschädigte Daten, unbekannte
Kategorien und nicht unterstützte Versionen werden abgewiesen. Die Daten werden nie still gekürzt.
Vor dem Ersetzen eines bereits vorhandenen v4-Stands wird die bisher gespeicherte Rohfassung intern
unter mein-alltag.before-restore.v4 behalten. Diese einzelne technische Rückfallkopie ersetzt keine
selbst exportierte Sicherung. Veraltete wartende Speicheraufträge werden beim Import verworfen.

Die Speicher-Version 4 übernimmt v3, v2 und v1; ältere Schlüssel bleiben als Migrationsquelle erhalten.
Persönliche Exporte mit dem Standard-Dateinamen werden von Git ausgeschlossen.

Für die Datei-Menüs wurden expo-document-picker, expo-file-system und expo-sharing ergänzt.
Validiert: 40 Tests, TypeScript, Web-Export, iOS-Hermes-Bundle und Expo Doctor (20/20).
Die tatsächliche iPhone-Dateiauswahl und „In Dateien sichern“ stehen als Gerätetest noch aus.
Der lokale Expo-Server war für eine zusätzliche Browser-Bedienprüfung nicht erreichbar.
Expo SDK 58 wurde auf den kompatiblen Patch 58.0.20 aktualisiert.

Die Paketprüfung meldet weiterhin die bekannten Entwicklungsabhängigkeiten Zod (3 hohe
Meldungen einschließlich Expo-CLI-Kette) und deepmerge (5 niedrige Meldungen einschließlich
Konfigurationswerkzeugen). Ein erzwungener inkompatibler Versionswechsel wurde nicht vorgenommen.
Die Backup-Validierung verwendet diese beiden Bibliotheken nicht.


## Navigation
Die untere Navigation wechselt zwischen vier Bereichen:
- Heute: Aufgaben anlegen, bearbeiten, filtern und abhaken.
- Verlauf: Heute, gestern und vergangene Tage ansehen.
- Statistik: Wochenübersicht sowie aktuelle und längste Serien.
- Einstellungen: Kategorien öffnen und Datensicherungen exportieren oder laden.

Eingaben und die gewählte Verlaufsansicht bleiben beim Seitenwechsel erhalten.
Zwei freistehende Leerzeichen außerhalb von Text-Komponenten wurden entfernt.
Eine zusätzliche Prüfung erkennt solche Textknoten in den App-Komponenten.
Validiert: 42 Tests, TypeScript und Web-Build. Die korrigierte Ansicht muss noch auf dem iPhone geprüft werden.
