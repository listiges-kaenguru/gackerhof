# Changelog

Alle wichtigen Änderungen am Gackerhof stehen hier, die neuesten oben.
Die Versionsnummer zeigt das Spiel unter **Mehr** ganz unten an.

## [0.3.3] – 2026-10-16

Erster Release auf GitHub (Tag `v0.3.3`), weiterhin ein Prototyp. Den fertigen Build gibt es als ZIP beim Release. Fehlerbehebungen und aufgeräumter Code, am Spiel selbst ändert sich nichts.

### Behoben
- Nach einem Update zeigte der Browser oft noch die alte Version, bis die Seite neu geladen wurde. Die neue `.htaccess` (in `public/`, landet in `dist/`) lässt den Browser jede Datei kurz beim Server prüfen; die Dateien mit Hash im Namen unter `assets/` dürfen dagegen ein Jahr im Cache bleiben.
- Nach **Neues Spiel** reagierte das alte Spiel im Hintergrund weiter auf Klicks und speicherte sich beim Schließen des Tabs. Wer auf dem Startbildschirm die Seite schloss, fand beim nächsten Öffnen den alten Hof wieder unter **Weiterspielen**. Jetzt ist das alte Spiel vollständig beendet.

### Intern
- Code aufgeräumt, ohne Änderung am Spiel: ungenutzte Funktionen entfernt, doppelte Ausdrücke in gemeinsame Helfer zusammengeführt (Eier im Nest, Futtervorrat, Futterwahl, schwerste Krankheit, Jahreszeit eines Tages), feste Zahlen in der Oberfläche durch die Konstanten aus `data.ts` ersetzt und die Zielprüfungen nicht mehr jede Spielstunde neu angelegt.

## [0.3.2] – 2026-10-14

Prototyp, Quelltext unter dem Tag `v0.3.2`. Das Spiel hat jetzt eine Infoseite mit ausführlicher Anleitung.

### Neu
- Links zur **Anleitung** im Gackerhof-Wiki (gackerhof-wiki.schmaralde.de) und zu **Impressum & Datenschutz** auf dem Startbildschirm und unter **Mehr**. Die Hilfe (**?**) verweist ebenfalls auf die Anleitung.

### Geändert
- Die Schrift Fredoka wird mit dem Spiel ausgeliefert und nicht mehr von Google Fonts geladen. Das Spiel lädt damit keine externen Inhalte mehr. Die Lizenz der Schrift (SIL Open Font License 1.1) liegt in `public/fonts/OFL.txt`.
- Der GitHub-Pages-Workflow läuft nur noch auf Knopfdruck und veröffentlicht nicht mehr bei jedem Push auf `main`.

## [0.3.1] – 2026-10-14

Prototyp, Quelltext unter dem Tag `v0.3.1`. Das Spiel ist jetzt freie Software.

### Geändert
- Das Spiel steht jetzt unter der **GNU Affero General Public License v3.0 oder später** (`AGPL-3.0-or-later`). Der Lizenztext liegt in `LICENSE`.
- Unter **Mehr** stehen neben der Versionsnummer jetzt Links zur Lizenz und zum Quelltext auf GitHub.

## [0.3.0] – 2026-10-08

Prototyp, Quelltext unter dem Tag `v0.3.0`. Fünf Ideen aus der Ideen-Liste sind umgesetzt.

### Neu
- **Wechselweide** (Shop → Erweiterungen, 55 €):
  - Der Auslauf hat jetzt einen Weidezustand. Scharrende Hühner zertreten das Gras, und je abgegraster der Auslauf, desto öfter bekommen sie Würmer (bis doppelt so oft).
  - Mit der Wechselweide nutzen die Hühner nur eine Hälfte, die andere erholt sich. Gewechselt wird in der Hofübersicht oder über den Hinweis „Weide abgegrast“.
  - Auf dem Hof sieht man abgegraste Stellen, den Trennzaun und die ruhende Hälfte mit frischem Gras. Das Hühnermobil schont die Weide zusätzlich.
- **Stalllicht mit Zeitschaltuhr** (Shop → Erweiterungen, 35 €):
  - Es verlängert im Herbst und Winter den Tag im Stall. Die Hennen legen dann deutlich mehr (Herbst 88 % statt 60 %, Winter 80 % statt 45 % der Sommerleistung).
  - Strom (0,12 € pro Tag) kostet es nur im Herbst und Winter. In der Hofübersicht lässt es sich ausschalten.
  - In der Dämmerung leuchtet das Stallfenster.
- **Hühner-Album** (Tiere → Album oder Mehr):
  - Jede Rasse gibt es jetzt in 3 Farbvarianten, zum Beispiel Sussex hell, rot und porzellanfarbig. Das sind 15 Album-Einträge.
  - Ein Eintrag zählt, sobald ein Tier dieser Farbe auf dem Hof lebt. Küken zeigen ihre Farbe erst als Junghuhn.
  - Küken erben die Farbe von Mutter oder Vater (gleiche Rasse), selten gibt es eine Überraschung. Auf dem Markt sind noch fehlende Farben mit „📒 neu“ markiert.
  - Prämien: 20 € für alle Farben einer Rasse, 100 € für das ganze Album.
- **Geflügelschau** (Markt → Schau):
  - Einmal pro Jahreszeit (Tag 25), eine Woche vorher angekündigt. Bis zu 3 ausgewachsene, gesunde Rassetiere können für 4 € Standgeld antreten. Legehybriden sind nicht zugelassen.
  - Die Preisrichter vergeben Punkte für Gesundheit, Wohlbefinden, Gewicht, Alter und sauberes Gefieder, dazu kommt etwas Glück. Die Schau zeigt eine Prognose und Tipps je Tier.
  - Preise: „sehr gut“ (93) 5 €, „hervorragend“ (95) 12 €, „vorzüglich“ (97) 25 €. Das beste Tier mit 97 Punkten bekommt einen Pokal (+50 €), der danach auf dem Hof steht.
  - Ab 4 Sternen Hof-Ruf geht es auf die Landesschau mit doppelten Preisen.
- **Tutorial-Pfeile:** In den ersten Spieltagen zeigt ein gelber Pfeil mit kurzem Text direkt auf das nächste Ziel: Zaun, Stall, Tränke, Futterstelle, Futter kaufen und einfüllen, Hühner kaufen, Eier sammeln und verkaufen sowie morgens und abends die Klappe. Er zeigt auf Objekte im Hof, Knöpfe im Shop oder die Tabs. Mit ✕ oder unter „Mehr → Spiel“ lässt er sich ausschalten. Laufende Spielstände starten ohne Pfeile.

### Geändert
- Die Beschriftung „Gehege hier“ steht jetzt im Auslauf. Vorher war sie vom Schaukasten verdeckt.

### Technisch
- 14 neue Tests (40 insgesamt) für Weide, Stalllicht, Album und Vererbung, Geflügelschau und Tutorial.
- Ältere Spielstände bekommen beim Laden alle neuen Felder. Das Album wird aus den vorhandenen Tieren befüllt, alle bisherigen Tiere haben die erste Farbe ihrer Rasse.

## [0.2.1] – 2026-10-08

Prototyp, Quelltext unter dem Tag `v0.2.1`. Das Spiel ist am Handy im Hochformat besser spielbar.

### Geändert
- Der Hof wird näher herangezoomt und füllt mehr vom Bildschirm. Der Ausschnitt beginnt an der Stallklappe, der Rest ist per Wischen erreichbar. Die Wisch-Pfeile sitzen auf Höhe des Hofs statt im Himmel.
- Shop, Markt und Co. lassen sich an der Kopfzeile nach unten wischen und so schließen.
- Im Shop stehen Preis und Kaufknopf unter der Beschreibung, der Text bekommt die volle Breite.
- In Dialogen wie der Begrüßung bleibt der Bestätigen-Knopf immer sichtbar, auch auf kleinen Handys.
- Kopfzeile und Dialoge halten Abstand zu Notch und Statusleiste (als App installiert).
- Schnelles Mehrfachtippen (z. B. „+1“ auf dem Markt) zoomt die Seite nicht mehr versehentlich heran.

## [0.2.0] – 2026-10-06

Prototyp, Quelltext unter dem Tag `v0.2.0`. Ab dieser Version zählen Prototypen mit **0.x.x**. Die bisherigen Testversionen hießen noch 1.0.0 und 1.1.0. Umgesetzt sind die „Verbesserungen aus Test“ aus der Ideen-Liste.

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
