# Gackerhof – Hinweise für Claude

Aufbauspiel rund um die Hühnerhaltung im Browser (TypeScript, Vite, PWA). Live unter
<https://gackerhof.schmaralde.de/>, Infoseite und Anleitung im Projekt `../gackerhof-wiki`.

## Orientierung

- `README.md` – Funktionen, Steuerung, Entwicklung, Veröffentlichen, Lizenz
- `CHANGELOG.md` – Änderungen je Version; jede Änderung unter `## [Unveröffentlicht]` eintragen
- `IDEEN.md` – ToDo (Fehler, Testergebnisse) und Ideen; **zuerst lesen**, Erledigtes ins CHANGELOG
- `docs/KONZEPT.md` – Spielkonzept (Grundlage, Werte für Schwierigkeit „Mittel“)
- Entwürfe und Mockups gehören nicht ins Repo.

## Regeln

- Kommunikation, Spieltexte und Doku auf Deutsch, Anrede „du“.
- Keine externen Ressourcen zur Laufzeit (Schrift Fredoka liegt in `public/fonts/`). Einzige Ausnahme: die
  Versionsprüfung in `src/ui/update.ts` (GitHub-API, höchstens einmal am Tag); sie steht im Datenschutz im Wiki.
- Spiellogik in `src/game/` ohne Grafik, Oberfläche in `src/ui/`. Neue Logik mit Tests in `tests/` absichern.
- Vor jedem Commit: `npm test` (Vitest), `npm run build` (mit `tsc --noEmit`) und `npm run test:browser`; am besten
  in einem Container mit Node und Playwright.
- Spielstände aus fremder Quelle (Import, localStorage) prüft `src/game/validate.ts` vor dem Laden. Neue Felder im
  Spielstand dort ergänzen (für ältere Stände optional) – sonst lehnt der Import sie ab. `tests/spielstaende/` enthält
  echte Exporte früherer Versionen; sie müssen weiter laden.
- Werte aus dem Spielstand nie roh in HTML: Texte mit `esc()`, IDs und Zähler mit `num()` (`src/ui/scene.ts`).
- Coverage: `npm run test:coverage`. Der Browsertest (`tests/browser.mjs`) nutzt ein vorhandenes Playwright
  (`$PW` zeigt auf dessen `package.json`), keine eigene Abhängigkeit.
- Mutation Testing (Stryker) über `scripts/mutation.ts`: `npm run test:mutation` mutiert nur `validate.ts`,
  `state.ts`, `actions.ts`, `npm run test:mutation:alle` die ganze Spiellogik. Beide laufen inkrementell
  (`reports/mutation/inkrementell-*.json`) und prüfen nur geänderten Code neu. Weil der Command-Runner keine
  Testzuordnung kennt, erzwingt das Skript einen kompletten Neulauf (`--force`), sobald sich `tests/` (außer
  `browser.mjs`), `stryker.config.json`, `vite.config.ts` oder `package-lock.json` ändern. Neue Testdateien, die
  `src/game` nicht laden, im Stryker-Befehl ausschließen (`--exclude`); sie kosten pro Mutant nur Zeit.
- Bewusste Testlücke: `src/ui/app.ts` und `scene.ts` haben keine Unit-Tests, nur den Browsertest.
- Version in `package.json` erhöhen; das Spiel zeigt sie unter **Mehr** an.
- Neue Entwicklungsdateien in `.gitattributes` als `export-ignore` eintragen (Release-ZIP nur mit Benötigtem).
- **Wiki mitziehen:** Ändern sich Zahlen, Regeln oder Bedienung, die Seiten in `../gackerhof-wiki` anpassen
  (dort `GAME_VERSION` in `scripts/nav.mjs`).

## Release

Ablauf: Release-PR mit Versionssprung und CHANGELOG-Abschnitt → nach dem Merge annotierter Tag `vX.Y.Z` auf den
Merge-Commit und GitHub-Release mit dem fertigen Build als ZIP `gackerhof-X.Y.Z.zip` (Ordner `gackerhof-X.Y.Z/` mit dem
Inhalt von `dist/` inkl. `.htaccess`, dazu `LICENSE` und `LIESMICH.txt`). Danach `dist/` hochladen, live prüfen und das
Wiki mitziehen.

- `LIESMICH.txt` liegt nicht im Repo: Vorlage aus der ZIP des Vorgänger-Releases holen
  (`gh release download vX.Y.Z -p '*.zip'`, Datei `gackerhof-X.Y.Z/LIESMICH.txt`) und die Versionsnummern ersetzen.
  Sie enthält einen Hinweis zur Versionsprüfung bei GitHub für Selbsthoster.
- Das Spiel ist ein Prototyp; die Version bleibt unter 1.0.0, bis das ausdrücklich anders entschieden ist.
- Im Quellarchiv bleiben die Build-Dateien (`package.json` usw.), damit der AGPL-Quelltext baubar ist;
  `.gitattributes` hält nur Entwicklungsdateien heraus.
