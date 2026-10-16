# Gackerhof – Hinweise für Claude

Aufbauspiel rund um die Hühnerhaltung im Browser (TypeScript, Vite, PWA). Live unter
<https://gackerhof.schmaralde.de/>, Infoseite und Anleitung im Projekt `../gackerhof-wiki`.

## Orientierung

- `README.md` – Funktionen, Steuerung, Entwicklung, Veröffentlichen, Lizenz
- `CHANGELOG.md` – Änderungen je Version; jede Änderung unter `## [Unveröffentlicht]` eintragen
- `IDEEN.md` – ToDo (Fehler, Testergebnisse) und Ideen; **zuerst lesen**, Erledigtes ins CHANGELOG
- `docs/KONZEPT.md` – Spielkonzept (Grundlage, Werte für Schwierigkeit „Mittel“)
- Entwürfe und Mockups liegen in `~/projects/entwuerfe/`, nicht im Repo.

## Regeln

- Kommunikation, Spieltexte und Doku auf Deutsch, Anrede „du“.
- Keine externen Ressourcen zur Laufzeit (Schrift Fredoka liegt in `public/fonts/`). Einzige Ausnahme: die
  Versionsprüfung in `src/ui/update.ts` (GitHub-API, höchstens einmal am Tag); sie steht im Datenschutz im Wiki.
- Spiellogik in `src/game/` ohne Grafik, Oberfläche in `src/ui/`. Neue Logik mit Tests in `tests/` absichern.
- Vor jedem Commit: `npm test` und `npm run build` (inkl. `tsc --noEmit`).
- Version in `package.json` erhöhen; das Spiel zeigt sie unter **Mehr** an.
- Neue Entwicklungsdateien in `.gitattributes` als `export-ignore` eintragen (Release-ZIP nur mit Benötigtem).
- **Wiki mitziehen:** Ändern sich Zahlen, Regeln oder Bedienung, die Seiten in `../gackerhof-wiki` anpassen
  (dort `GAME_VERSION` in `scripts/nav.mjs`).

## Release

Tag `vX.Y.Z` und GitHub-Release mit dem fertigen Build als ZIP (Inhalt von `dist/`, dazu `LICENSE` und
`LIESMICH.txt`). Danach an den Upload von `dist/` (mit `.htaccess`) zu ALL-INKL erinnern – das macht der Nutzer selbst.
