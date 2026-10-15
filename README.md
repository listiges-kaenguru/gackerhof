# 🐔 Gackerhof

Ein Aufbauspiel rund um die Hühnerhaltung, spielbar im Browser auf Desktop und Smartphone.
Du startest mit wenig Geld und einer leeren Wiese und baust Schritt für Schritt deinen eigenen Hühnerhof auf.

- 📄 Spielkonzept: [`KONZEPT.md`](KONZEPT.md)
- 📝 Änderungen je Version: [`CHANGELOG.md`](CHANGELOG.md)
- 💡 Ideen für später: [`IDEEN.md`](IDEEN.md)
- 🎨 Grafikstil-Entwürfe: [`docs/stil-beispiele.html`](docs/stil-beispiele.html) (gewählt: Stil A, Cartoon)

## Was schon drin ist

- Startbildschirm mit Hofname, 3 Schwierigkeitsgraden und 3 Grundstücken
- Hof als animierte Cartoon-Szene mit Tageszeiten, Jahreszeiten, Wetter und Schnee
- Shop mit Zaun, Stall, Tränken, Futterstellen, Fuchs- und Greifvogelschutz, Erweiterungen, Automatik und Gimmicks (Hüte, Deko)
- Geflügelmarkt mit wöchentlich wechselnden Händlern: Bruteier, Küken, Junghennen, Legehennen (mit Gesundheitscheck) und Hähne in 5 Rassen mit je 3 Farbvarianten
- Lebenszyklus vom Ei über Küken und Junghuhn bis zum alten Huhn, mit Tod durch Altersschwäche
- Bedürfnisse (Hunger, Durst, Gesundheit, Wohlbefinden) und Krankheiten (Milben, Würmer, Atemwegsinfekt, Kokzidiose) mit Medikamenten und Wartezeiten
- Fuchs, Habicht und Marder mit Vorwarnung, Ratten an offenen Futterstellen
- Brüten mit Brutapparat oder Glucke; mit Hahn werden Eier zu Bruteiern
- Verkauf von Eiern, Bruteiern, Mist, Tieren und Ausrüstung, dazu Schlachter, Hofladen und kostenpflichtige Entsorgung toter Tiere
- Zufallsereignisse (Dorffest, Lieferengpass, Stallpflicht, Geschenke von Opa Heinz), Kapitel mit Zielen, Tagebuch und Hof-Ruf
- Wechselweide gegen Würmer, Stalllicht für mehr Eier im Winter
- Hühner-Album zum Sammeln aller Rassen und Farben (Farben werden vererbt)
- Geflügelschau jede Jahreszeit mit Bewertung, Preisgeld und Pokal
- Tutorial-Pfeile, die in den ersten Tagen auf das nächste Ziel zeigen
- Automatisches Speichern, Export und Import des Spielstands, offline spielbar (PWA)

## Steuerung

- Tippen oder Klicken auf Tiere, Eier, Tränke, Futterstelle und Stall
- Schnellaktionen unten, Menüs in der unteren Leiste
- Auf dem Handy im Hochformat: Hof seitlich wischen
- Kapitel-Ziele: Karte oben rechts oder Schaukasten auf dem Hof antippen
- Tastatur: `E` Eier · `W` Wasser · `F` Futter · `K` Klappe · `L` Reinlocken · `M` Ausmisten · `Leertaste` Pause · `1`/`2`/`3` Tempo

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm test         # Tests für Spiellogik und Balancing
npm run build    # Produktions-Build nach dist/
```

Aufbau:

| Ordner | Inhalt |
|---|---|
| `src/game/` | Spiellogik ohne Grafik: Daten, Simulation, Aktionen, Speichern |
| `src/ui/` | Oberfläche: Cartoon-Grafiken (SVG), Hof-Szene, Panels |
| `tests/` | Vitest-Tests, u. a. ein simulierter Spieler über 60 Tage |

## Veröffentlichen

Gehostet wird das Spiel bei ALL-INKL unter <https://gackerhof.schmaralde.de/>: nach `npm run build` den Inhalt von `dist/` hochladen,
auch die versteckte Datei `.htaccess` (aus `public/`). Sie sorgt dafür, dass Browser neue Versionen sofort laden.
Infoseite und Anleitung liegen im Projekt `../gackerhof-wiki` (<https://gackerhof-wiki.schmaralde.de/>).

Der Workflow `.github/workflows/pages.yml` baut das Spiel und veröffentlicht es auf GitHub Pages. Er läuft nur auf Knopfdruck
(**Actions → Spiel veröffentlichen → Run workflow**), damit nichts versehentlich veröffentlicht wird. Dazu einmalig im
Repository unter **Settings → Pages → Source** „GitHub Actions“ auswählen; bei privaten Repositories setzt GitHub Pages
einen kostenpflichtigen Tarif voraus.

## Lizenz

Copyright (C) 2026 listiges-kaenguru

Der Gackerhof ist freie Software: Du kannst ihn unter den Bedingungen der
[GNU Affero General Public License](LICENSE), Version 3 oder (nach deiner Wahl) jeder späteren Version,
weitergeben und verändern (SPDX: `AGPL-3.0-or-later`).

Wer eine veränderte Fassung des Spiels öffentlich im Netz anbietet, muss den Spielerinnen und Spielern
auch den Quelltext dieser Fassung zugänglich machen.
Der Quelltext des Originals liegt unter <https://github.com/listiges-kaenguru/gackerhof>.

Das Spiel wird ohne jede Gewährleistung bereitgestellt. Den vollständigen Lizenztext findest du in [LICENSE](LICENSE).
