# Mitwirken

Danke, dass du den Gackerhof verbessern möchtest! Fehler, Ideen und Verbesserungen gern als Issue oder
Pull Request. Offene Punkte stehen in [`IDEEN.md`](IDEEN.md).

## Entwickeln

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Tests für Spiellogik und Balancing
npm run build    # Produktions-Build nach dist/
```

- Spiellogik gehört nach `src/game/` (ohne Grafik), Oberfläche nach `src/ui/`.
- Änderungen an der Spiellogik bitte mit Tests in `tests/` absichern.
- Texte im Spiel auf Deutsch, Anrede „du“.

## Changelog pflegen

Jede für Spielerinnen und Spieler sichtbare Änderung kommt in [`CHANGELOG.md`](CHANGELOG.md) unter
**`## [Unveröffentlicht]`**, im passenden Unterabschnitt (`Neu`, `Geändert`, `Behoben`, `Intern`).

## Lizenz

Mit einem Beitrag stimmst du zu, dass er unter der [AGPL-3.0-or-later](LICENSE) veröffentlicht wird.
