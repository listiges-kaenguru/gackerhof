# Changelog

Alle wichtigen Änderungen am Gackerhof stehen hier, die neuesten oben.
Die Versionsnummer zeigt das Spiel unter **Mehr** ganz unten an.

## [1.2.0] – in Arbeit

### Geändert
- **Verlässlicher Geflügelmarkt:** Jede Woche gibt es garantiert mindestens einen **Hahn** und ein Angebot **Bruteier**. Rasse und Preis wechseln. Dazu kommen wie bisher eine Junghenne und eine Legehenne sowie weitere Zufallsangebote (insgesamt 7–9 statt 6–8).
- Spielstände aus 1.0.0 und 1.1.0 bekommen beim Laden sofort einen neu bestückten Markt.

### Technisch
- 2 neue Tests (20 insgesamt). Der Balancing-Test prüft jetzt 24 statt 12 Testhöfe.

## [1.1.0] – 2026-10-06

Testversion in den Branches `proto-v1.1.0` und `proto-built-v1.1.0`.

Erste Rückmeldungen aus dem Test von 1.0.0 umgesetzt.

### Geändert
- **Längere Tage:** Ein Spieltag dauert jetzt 3 Minuten statt 1 Minute (bei Tempo 1×).
- **Hühner gehen pünktlich in den Stall:** Ab 20 Uhr gehen sie von selbst hinein. Auf dem Weg zwischen Stall und Auslauf laufen sie jetzt im Spieltempo und kommen auch bei ⏩/⏭ rechtzeitig an. Vorher waren sie teils erst nach Mitternacht drin.
- **Habicht-Warnung:** Statt „Klappe schließen“ heißt es jetzt „Hühner reinlocken“, denn Schließen allein sperrt die Hühner aus.

### Neu
- **Aussperren:** Jedes Huhn ist jetzt wirklich drinnen oder draußen. Wird die Klappe geschlossen, solange Hühner im Auslauf sind, bleiben sie ausgesperrt. Nachts drängen sie sich vor dem Tor, frieren, sind unglücklich und für den Fuchs eine leichte Beute.
- **Hühner reinlocken:** Neue Aktion im Hinweis, in der Hofübersicht und mit Taste `L`. Sie kostet etwas Körnerfutter (oder eine Portion Mehlwürmer), holt alle Hühner in den Stall und schließt die Klappe.
- **Frierende Küken haben Folgen:** Ohne Kükenstation oder Glucke werden Küken schnell schwach und sterben nach 2–3 Tagen. Sie zeigen ein 🥶-Symbol, und jeden Morgen erscheint eine Warnung.
- **Auffällige Erfolge:** Erreichte Ziele erscheinen als goldenes Banner. Kapitelabschluss (mit der Belohnung von Opa Heinz), Geschenke und Kredite erscheinen als Dialog, der bestätigt werden muss. Das Spiel pausiert, solange er offen ist.
- **Kapitel-Ziele immer im Blick:**
  - Eine Kapitel-Karte oben rechts zeigt die Ziele mit Fortschrittsbalken und Zwischenständen wie „4/10“. Das nächste offene Ziel ist hervorgehoben.
  - Ein Tipp auf ein Ziel führt direkt zur passenden Stelle, etwa in den Shop oder auf den Markt.
  - Auf großen Bildschirmen ist die Karte standardmäßig aufgeklappt, auf kleinen nur ein Abzeichen „📖 2/6“. Es pulsiert, sobald ein neues Ziel erreicht ist.
  - Die Wahl des Spielers bleibt gespeichert.
- **Schaukasten auf dem Hof:** Hinter dem Zaun steht ein Schaukasten mit dem aktuellen Kapitel, angehakten Zetteln und dem Fortschritt. Ein Tipp darauf blendet die Kapitel-Karte ein oder aus.
- **Versionsanzeige** unter „Mehr“.
- `CHANGELOG.md` und `IDEEN.md`.

### Technisch
- Ältere Spielstände aus 1.0.0 lassen sich weiter laden.
- 6 neue Tests (18 insgesamt): Aussperren, Reinlocken, Fuchs bei ausgesperrten Hühnern, frierende Küken, Banner und Kapitel-Feier.

## [1.0.0] – 2026-10-06

Erster spielbarer Prototyp (Branches `proto-v1.0.0` und `proto-built-v1.0.0`).

- Startbildschirm mit Hofname, 3 Schwierigkeitsgraden und 3 Grundstücken
- Hof als animierte Cartoon-Szene mit Tageszeiten, Jahreszeiten, Wetter und Schnee
- Shop: Zaun, Stall, Tränken, Futterstellen, Fuchs- und Greifvogelschutz, Futter & Medizin, Erweiterungen, Automatik, Gimmicks
- Geflügelmarkt mit wechselnden Händlern, 5 Rassen, Gesundheitscheck für gebrauchte Hennen
- Lebenszyklus vom Ei bis zum Tod durch Altersschwäche, Brut im Brutapparat oder unter einer Glucke
- Bedürfnisse, 4 Krankheiten mit Medikamenten und Wartezeiten
- Fuchs, Habicht und Marder mit Vorwarnung, Ratten an offenen Futterstellen
- Verkauf von Eiern, Bruteiern, Mist, Tieren und Ausrüstung; Schlachter, Hofladen, kostenpflichtige Entsorgung
- Zufallsereignisse, 3 Kapitel mit Zielen, Tagebuch, Hof-Ruf
- Autosave im Browser, Export/Import, PWA mit Offline-Modus
