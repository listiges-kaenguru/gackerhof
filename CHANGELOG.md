# Changelog

Alle wichtigen Änderungen am Gackerhof stehen hier, die neuesten oben.
Die Versionsnummer zeigt das Spiel unter **Mehr** ganz unten an.

## [0.2.0] – in Arbeit

Ab dieser Version zählen Prototypen mit **0.x.x**. Die bisherigen Testversionen hießen noch 1.0.0 und 1.1.0. Umgesetzt sind die „Verbesserungen aus Test“ aus der Ideen-Liste.

### Neu
- **Kundenaufträge** als neue Einnahmequelle (Markt → Aufträge):
  - Bäckerei, Café, Gasthaus und andere Kunden bestellen Eier, Junghennen oder Suppenhühner (Hennen ab 2 Jahren).
  - Sie zahlen deutlich mehr als der Markt, haben aber eine Frist.
  - Bis zu 3 Aufträge gleichzeitig. Ein besserer Hof-Ruf bringt mehr Aufträge und bessere Bezahlung.
- **Hof-Ruf erklärt:** Die Sterne in der Kopfzeile lassen sich antippen. Die Hofübersicht zeigt jeden Faktor (Gesundheit, Wohlbefinden, Platz, Sauberkeit, Todesfälle) mit Wert, Punkten und einem Tipp. Dazu steht, was Sterne bringen.
- **Ereignisse zum Bestätigen:** Dorffest, Lieferengpass und Stallpflicht erscheinen als Dialog mit Erklärung und Tipp.
- **Uhrzeit mit Minuten** in der Kopfzeile.

### Geändert
- **Hühner gehen einzeln in den Stall:**
  - Jedes Huhn hat seine eigene Zeit zwischen 19 und etwa 20:45 Uhr. Scheue gehen früher, mutige und neugierige später.
  - Ein Huhn läuft zuerst zur Klappe und ist erst dann im Stall. Erst dann zählt auch der Zähler am Stall hoch.
  - Wer die Klappe zwischendurch schließt, sperrt nur die Nachzügler aus. Morgens kommen die Hühner nach und nach heraus.
- **Überbelegung:** In den Stall passen höchstens 120 % seiner Plätze. Überzählige Hühner schlafen draußen (Kälte, Fuchsgefahr). Ein Hinweis meldet das. Überbelegung lässt Krankheiten außerdem deutlich häufiger ausbrechen und sich schneller ausbreiten.
- **Bruteier:**
  - Die Befruchtungsquote hängt jetzt vom Verhältnis Hahn zu Hennen ab: Ein Hahn schafft gut 10 Hennen, maximal 90 %.
  - Beim Verkauf als Speiseeier steht jetzt der Preis dabei.
  - Die Sammelmeldung nennt die Gesamtzahl und die Aufteilung, das Lager zeigt die Summe aller Eier.
- Ein Auftrag mit Eiern zählt auch für das Kapitelziel „Eier verkaufen“.
- **Handy im Hochformat:**
  - Der Hof wird näher herangezoomt und füllt mehr vom Bildschirm. Der Ausschnitt beginnt an der Stallklappe, der Rest ist per Wischen erreichbar. Die Wisch-Pfeile sitzen auf Höhe des Hofs statt im Himmel.
  - Shop, Markt und Co. lassen sich an der Kopfzeile nach unten wischen und so schließen.
  - Im Shop stehen Preis und Kaufknopf unter der Beschreibung, der Text bekommt die volle Breite.
  - In Dialogen wie der Begrüßung bleibt der Bestätigen-Knopf immer sichtbar, auch auf kleinen Handys.
  - Kopfzeile und Dialoge halten Abstand zu Notch und Statusleiste (als App installiert).
  - Schnelles Mehrfachtippen (z. B. „+1“ auf dem Markt) zoomt die Seite nicht mehr versehentlich heran.

### Behoben
- **Fuchsschutz:** Der Untergrabschutz zählte intern nur +10 %, angezeigt waren +15 %. Jetzt gilt überall der Wert aus dem Shop (Kapitel 2: 20 % → 35 %).

### Aus 1.2.0 (nie als Testversion veröffentlicht)
- **Verlässlicher Geflügelmarkt:** Jede Woche gibt es garantiert mindestens einen Hahn und ein Angebot Bruteier, Rasse und Preis wechseln. Insgesamt sind es 7–9 Angebote.
- Ältere Spielstände bekommen beim Laden sofort einen neu bestückten Markt.

### Technisch
- Die Simulation läuft im Minutentakt (Hühner) und im Stundentakt (alles andere).
- 8 neue Tests (26 insgesamt): einzelnes Heimgehen, Nachzügler aussperren, Stallgrenze, Aufträge, Suppenhühner, Sterne und Fuchsschutz, Markt mit Hahn und Bruteiern. Der Balancing-Test prüft 24 Testhöfe.
- Spielstände aus 1.0.0 und 1.1.0 lassen sich weiter laden.

## [1.1.0] – 2026-10-06

Testversion in den Branches `proto-v1.1.0` und `proto-built-v1.1.0` (nach heutiger Zählung 0.1.1).

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

Erster spielbarer Prototyp (Branches `proto-v1.0.0` und `proto-built-v1.0.0`, nach heutiger Zählung 0.1.0).

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
