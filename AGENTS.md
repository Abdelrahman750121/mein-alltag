# My progress
Expo / React Native / TypeScript. Deutsche Oberfläche.

## Vereinbarte Funktionen
Aufgaben hinzufügen, löschen, abhaken und wieder öffnen. Lokale Speicherung und
Fortschrittsanzeige. Tagesverlauf mit Erledigungsdatum und Auswahl vergangener Tage. Tägliche oder einmalige Aufgaben, lokale Erinnerungen pro Aufgabe und Wochenübersicht. Kein Login oder Backend.

## Zusammenarbeit
Fortschritte auf Deutsch erklären. Vor Änderungen oder Erweiterungen der vereinbarten
Funktionen Zustimmung einholen. Implementierung und Fehlerbehebung im vereinbarten
Umfang sind autorisiert.

## Qualität
Keine Zugangsdaten oder persönlichen Aufgaben committen. Ungültige Speicherdaten
nicht überschreiben. Schreibreihenfolge erhalten. Zugängliche Bedienelemente.
Vor Übergabe npm test, npm run typecheck und npm run build:web ausführen.
Native Gerätetests nur behaupten, wenn tatsächlich durchgeführt.


Verlauf: Kalendertage nach lokaler Gerätezeit speichern. Historie beim Löschen von Aufgaben erhalten. Häkchen am selben Tag zurücknehmen entfernt den Tageseintrag; frühere Tage bleiben erhalten. Alte Daten ohne erfundene Datumswerte übernehmen.


Tägliche Aufgaben werden anhand ihrer Erledigungen am jeweiligen lokalen Kalendertag angezeigt.
Bestehende Aufgaben bleiben bei der Migration einmalig, neue Aufgaben standardmäßig täglich.
Erinnerungen sind freiwillig. Die Berechtigung nur nach explizitem Aktivieren anfragen.
Einmalige Erinnerungen beim Abhaken entfernen; tägliche bleiben nach einem Häkchen aktiv.
Nur eigene geplante Benachrichtigungen mit dem Projektpräfix abgleichen und entfernen.
Die Wochenübersicht zählt Erledigungen von Montag bis Sonntag.

Serien: Aktuelle und längste aufgezeichnete Serie pro täglicher Aufgabe aus dem Verlauf ableiten.
Wenn heute noch offen ist, darf gestern die aktuelle Serie tragen; nach einem ausgelassenen Tag unterbrechen.
Umbenennen über die Aufgabeneinstellungen: stabile ID, vorhandenen Verlauf und Erinnerungszeit erhalten.
Historische Titel sind unveränderliche Momentaufnahmen. Neue Erledigungen verwenden den neuen Titel.
Keine erfundenen rückwirkenden Datumsangaben und keine Neuterminierung unveränderter einmaliger Erinnerungen beim Bearbeiten.
