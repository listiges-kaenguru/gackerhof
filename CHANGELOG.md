# Changelog

Alle wichtigen Änderungen am Gackerhof stehen hier, die neuesten oben.
Die Versionsnummer zeigt das Spiel unter **Mehr** ganz unten an.

## [Unveröffentlicht]

## [0.5.0] – 2026-11-09

Mehr Spiel für den späteren Hof, weiterhin ein Prototyp: Kapitel 4 und 5, Laufenten, Gänse und Wachteln,
ein Gemüsebeet für den Hühnermist, mehr Abwechslung bei Kundenaufträgen, Ereignisse zum Mitmachen und ein Game Over,
wenn der Hof dauerhaft pleite bleibt. Spielstände aus 0.4.1 und früher lassen sich weiterspielen.

### Hinzugefügt

- **Game Over „Zurück ins Büro“:** Wer nach dem Kredit dauerhaft pleite bleibt, muss den Hof aufgeben. Ist das Konto
  14 Tage am Stück im Minus, warnt Opa Heinz und sagt, wie viele Tage bleiben. Nach **30 Tagen** am Stück im Minus
  (**Leicht 60, Schwer 21**) ist Schluss, wenn keine legende Henne mehr da ist (Küken, Junghennen und alte Hennen
  zählen nicht) oder der letzte Monat mit Minus abgeschlossen hat. Kommt das Konto zwischendurch ins Plus, beginnt die
  Zählung von vorn. Wie bisher ist ohne Tiere und Geld sofort Schluss.
- Der Abschluss-Bildschirm zeigt eine Bilanz: Tage auf dem Hof, verkaufte Eier, geschlüpfte Küken, Pokale und das
  älteste Tier.
- **Wochentage:** Tag 1 ist ein Montag. Die Kopfzeile zeigt den Wochentag, Aufträge nennen ihre Frist als „heute“,
  „morgen“, „bis Freitag“ oder „bis Freitag nächster Woche“.
- **Sonderwünsche bei Aufträgen** (30 % mehr Lohn): braune Eier (nur von Marans, Sussex und Brahma), Bruteier einer
  bestimmten Rasse (braucht Henne und Hahn dieser Rasse, keine Hybriden) und Hähne (kein Küken). Sie kommen nur, wenn
  der Hof sie liefern kann.
- **Stammkunden:** Nach **3 erfüllten Aufträgen** wird ein Kunde Stammkunde. Er meldet sich öfter und zahlt **15 %
  mehr**.
- **Großaufträge** ab 3 Sternen, selten: 48–96 Eier mit 10–14 Tagen Frist. Teillieferungen bringen 80 % des Lohns
  anteilig, den Rest gibt es bei vollständiger Lieferung.
- **Aufträge ablehnen** kostet nichts.
- **Verstecktes Nest:** Ab und zu legt eine Henne bis zu 5 Tage lang in ein Versteck im Auslauf statt ins Stallnest.
  Das Nest liegt halb im Gras; Antippen bringt die Eier ins Lager. Wird es nicht gefunden, verderben die Eier.
- **Ausgebüxtes Huhn:** Tagsüber kann ein Huhn aus dem Auslauf entwischen und läuft dann vor dem Stall herum (mit ❗).
  Antippen fängt es ein, „Reinlocken“ hilft nicht. Ist es um 21 Uhr noch draußen, holt es meist (70 %) der Fuchs. Ein
  Knotengitter lässt am häufigsten eins entwischen, ein Maschendrahtzaun am seltensten, ein Volierennetz senkt das
  Risiko weiter. Im Winter büxt niemand aus.
- **Nachbar und Hahn:** Mit erwachsenem Hahn beschwert sich ab und zu der Nachbar. Du entscheidest: Eierkarton
  schenken (6 Eier, dann 30 Tage Ruhe), Stall verdunkeln (einmalig 20 €, danach viel seltener Beschwerden) oder
  ignorieren (bei der nächsten Beschwerde 50 € Bußgeld).
- **Gemüsebeet** (Erweiterungen, 40 €): Säen geht im Frühling und Sommer (Saatgut 3 €), nach **20 Tagen** ist das
  Gemüse reif. Ein Sack Hühnermist als Dünger verdoppelt den Ertrag von 4 auf 8 kg. Frost zerstört, was im Beet steht.
  Gemüse lässt sich verkaufen (**2,50 € je kg**, mit Hofladen 3,75 €, eigene Kategorie „Gemüse“ in den Finanzen) oder an
  die Hühner verfüttern (1 kg je angefangene 5 Tiere: satter und zufriedener). Mist lässt sich weiter verkaufen.
- **Weitere Geflügelarten:** Laufenten, Pommerngänse und Legewachteln, jeweils in eigener Unterkunft (Landhandel →
  **Andere Geflügel**): Entenhaus (160 €, 6 Plätze) mit Wasserbecken (90 €), Gänsestall (220 €, 4 Plätze) mit
  Grasweide (80 €), Wachtelvoliere (140 €, 12 Plätze). Der Geflügelmarkt bietet eine Art erst an, wenn ihre Unterkunft
  steht (jede Woche Weibchen, Männchen und Bruteier). Mit Unterkunft wird die Szene nach rechts breiter.
  - Alle trinken in ihrer Unterkunft und fressen am Futterplatz der Hühner mit. Gänse auf der Grasweide grasen tagsüber
    und brauchen dann kein Futter.
  - **Laufenten** legen fleißig (Eier 1,6-facher Preis). Das Becken verschmutzt mit 6 % je Ente und Tag; unter 30 %
    sind die Enten unglücklich und legen nur halb so viel. Enten fressen Schnecken: weniger Würmer bei den Hühnern
    und ein Viertel mehr Gemüse.
  - **Gänse** legen fast nur im Frühling (Eier 5-facher Preis). Eine erwachsene Gans ist Wachgans: +10 % Fuchsschutz.
  - **Wachteln** legen fast täglich ein kleines Ei (0,3-facher Preis) und bleiben immer in der Voliere.
  - Mit Männchen derselben Art werden Eier zu Bruteiern. Brutdauer im Brutapparat: **Huhn 7, Ente 9, Gans 10,
    Wachtel 6 Tage**.
  - Erpel, Ganter und Wachtelhähne sind keine Hähne: Sie befruchten keine Hühnereier, schützen nicht vor dem Habicht
    und zählen nicht für das Kapitelziel „Einen Hahn halten“.
  - Steckbrief, Tierliste, Album und Markt nennen Ente/Erpel, Gans/Ganter, Wachtel/Wachtelhahn. Auf die Geflügelschau
    und zu Hahn-, Junghennen- und Suppenhuhn-Aufträgen dürfen weiter nur Hühner.
- **Kapitel 4 „Rassezucht“** (Belohnung 300 €): 3 Hühnerrassen gleichzeitig halten (ohne Legehybriden), an einer
  Geflügelschau teilnehmen, ein Tier mit „sehr gut“ (ab 93 Punkten) bewerten lassen, 8 Einträge im Hühner-Album.
- **Kapitel 5 „Der große Hof“** (Belohnung 500 €): 25 Tiere gleichzeitig, 4 Sterne Hof-Ruf, eine weitere Geflügelart,
  1.000 Eier verkaufen, 10 Kundenaufträge erfüllen. Danach gibt es eine Abschlussmeldung, der Hof läuft weiter.
- Wer Kapitel 3 schon geschafft hatte, bekommt beim Laden die Ziele von Kapitel 4.
- Meldungen können Auswahlknöpfe haben. Offene Meldungen aus dem Spielstand erscheinen gleich beim Laden.

### Geändert

- **Verpasste Aufträge** kosten jetzt 14 Tage lang 0,3 Sterne Hof-Ruf (mehrere summieren sich bis −1 Stern), und der
  Kunde verliert 2 Punkte auf dem Weg zum Stammkunden. Bereits Bezahltes aus Teillieferungen bleibt.

### Behoben

- Ein Spielstand, der schon zu Ende ist, zeigt beim Laden wieder den Abschluss-Bildschirm, statt still stehen zu
  bleiben.

### Intern

- Mutation Testing schneller: `npm run test:mutation` prüft nur noch `validate.ts`, `state.ts` und `actions.ts`, die
  ganze Spiellogik läuft mit `npm run test:mutation:alle`. Beide Läufe sind inkrementell und prüfen nur geänderten
  Code neu. Das Startskript `scripts/mutation.ts` erzwingt einen kompletten Neulauf, sobald sich Tests oder
  Konfiguration ändern, weil Stryker mit dem Command-Runner sonst veraltete Ergebnisse übernehmen würde.
- Der Stryker-Befehl ruft Vitest direkt auf und lässt Testdateien aus, die die Spiellogik nicht laden. Das spart pro
  Mutant etwa ein Drittel der Zeit (Stichprobe `state.ts`: 194 statt 288 Sekunden).
- Jeder Vitest-Lauf im Stryker-Befehl nutzt höchstens 2 Worker, die Zeitgrenze liegt 10 statt 5 Sekunden über dem
  ersten Testlauf. Ohne Begrenzung startete jeder Lauf einen Thread je Testdatei; bei 4 parallelen Läufen wurden so
  Hunderte Mutanten fälschlich als Timeout und damit als erkannt gezählt.
- Neue Tests für die Prüfung fremder Spielstände (`tests/validate.test.ts`, direkt und Feld für Feld), für neuen Hof,
  neue Tiere und ältere Spielstände (`tests/state.test.ts`) und für die genaue Wirkung der Spieleraktionen auf Geld,
  Finanzkategorien, Lager und Tiere (`tests/aktionen-wirkung.test.ts`). Mutation Score im Kernumfang von 52 % auf
  93,7 % (validate 99 %, state 98 %, actions 90 %); übrig sind vor allem Meldungstexte und gleichwertige Mutanten.
  Der alte Bericht vom 17./18.10. hatte viele Mutanten fälschlich als erkannt gezählt.
- Hinweise für Mitwirkende (`CLAUDE.md`, README, CHANGELOG) allgemein formuliert, ohne lokale Pfade, Hoster-Namen und eigene Werkzeuge.; Release-Ablauf vollständig in `CLAUDE.md`.
- Testskripte nennen in Meldungen und Kommentaren keinen lokalen Pfad mehr, sondern verweisen auf einen Container mit den Testwerkzeugen und die README.
- Hinweise für Mitwirkende beziehen sich nicht mehr auf andere Projekte; jedes Projekt ist für sich beschrieben.
- Kredit und Pleite-Regeln in eigenem Modul `src/game/pleite.ts` mit Tests (`tests/pleite.test.ts`, Coverage 100 %,
  Mutation Score 82 %; übrig sind Meldungstexte). Neue optionale Felder im Spielstand: `brokeSince`, `brokeWarned`,
  `gameOverReason`.
- Kundenaufträge in eigenem Modul `src/game/orders.ts` mit Tests (`tests/auftraege.test.ts`,
  `tests/auftraege-formeln.test.ts` mit festgelegtem Zufall). Mutation Score 95 %. Neue optionale Felder:
  `customers`, `orderEffect`, `stats.ordersDone`, bei Aufträgen `brown`, `breed`, `big`, `delivered`, `paid`.
- Ereignisse in eigenem Modul `src/game/ereignisse.ts` mit Tests (`tests/ereignisse.test.ts`,
  `tests/ereignisse-zufall.test.ts` mit festgelegtem Zufall). Coverage 99 %, Mutation Score 88 %. Neue optionale Felder:
  `hiddenNest`, `escapee`, `neighbor`, bei Meldungen `choices` (nur feste Aktionen erlaubt). Der Browsertest tippt
  Nest, Ausbüxer und Nachbar-Auswahl an.
- Gemüsebeet in eigenem Modul `src/game/beet.ts` mit Tests (`tests/beet.test.ts`), Coverage 100 %, Mutation Score
  92 % vor den Grenzwert-Tests. Neues optionales Feld `bed`.
- Weitere Arten in `src/game/arten.ts` mit Tests (`tests/arten.test.ts`, `tests/arten-formeln.test.ts` mit festgelegtem
  Zufall), Mutation Score 99,6 %. `flock()` meint jetzt nur die Hühner (ohne Küken), `othersOf()` die anderen Arten;
  die Art ergibt sich aus der Rasse (`BREEDS[…].species`). Neues optionales Feld `pond`. `requires` bei Ausrüstung
  gilt jetzt für jeden Besitz, nicht nur den Zaun.
- Kapitelziele 4 und 5 mit Tests (`tests/kapitel.test.ts`). Der bestehende Test „Kapitel gibt es nicht“ nimmt jetzt 6
  statt 4 als Beispiel.
- Ein Ausbüxer steht in der Szene sofort vor dem Zaun, auch in der Pause.
- Der Frosttest kauft Mardergitter und Volierennetz, damit er nur den Frost prüft und nicht vom Zufall bei Raubtieren
  abhängt.

## [0.4.1] – 2026-10-18

Sicherheitskorrektur für den Import von Spielständen. Spielstände aus 0.4.0 und früher lassen sich weiterspielen.

### Sicherheit

- Spielstände aus fremden Dateien werden vor dem Laden vollständig geprüft. Bisher ließ sich über eine präparierte Datei
  (z. B. in einer Tier-ID oder einer Zahl) Code in die Seite einschleusen. Zusätzlich gibt die Oberfläche IDs, Zähler
  und Geldbeträge nur noch als Zahl aus.

### Behoben

- Ein kaputter oder unvollständiger Spielstand wird beim Import abgelehnt („kein gültiger Spielstand“), statt das Spiel
  abstürzen zu lassen und den bisherigen Hof zu überschreiben. Spielstände früherer Versionen laden weiter.

### Intern

- Neue Tests: Speichern und Import (auch mit Spielständen aus 0.2.1, 0.3.3 und 0.4.0), Versionsprüfung ohne Netz,
  Spieleraktionen mit Geld, Browsertest für präparierte Spielstände. Coverage (`npm run test:coverage`) und
  Mutation Testing mit Stryker (`npm run test:mutation`) eingerichtet.
- Stryker nutzt den Command-Runner (`npx vitest run`): Der Vitest-Runner von Stryker 10 schaltet mit Vitest 5 die
  Mutanten nicht ein und meldete deshalb fast alle als überlebt.

## [0.4.0] – 2026-10-17

Mehr Langzeitspaß, weiterhin ein Prototyp. Im ersten Winter verdurstet die Herde nicht mehr, Krankheiten kosten weniger, und neue Einnahmen und Großpackungen bringen den Hof leichter ins Plus. Dazu kommen eine Finanzübersicht, Hofbesuche und eine Versionsprüfung. Spielstände aus 0.3.3 lassen sich weiterspielen.

### Neu
- **Spielstand importieren auf dem Startbildschirm:** Ein exportierter Hof lässt sich jetzt direkt beim Start laden, ohne vorher einen neuen Hof zu gründen. Ist schon ein Hof gespeichert, fragt das Spiel vorher nach, ob er ersetzt werden soll.
- **Finanzübersicht** unter **Mehr → Finanzen**: Einnahmen und Ausgaben des laufenden und des letzten Monats nach Kategorien (Eier, Tierverkauf, Aufträge, Mist, Hofbesuche, Futter, Einstreu, Medizin, Tierarzt, Tierkauf, Ausrüstung, Pacht/Strom/Wasser …). Das **laufende Ergebnis** zeigt ohne Ausrüstung, Kredite und Geschenke, ob sich der Hof trägt.
- **Opa Heinz gibt Rat:** Steht das laufende Ergebnis zwei Monate in Folge im Minus, schaut er vorbei, nennt den größten Kostenblock und gibt passende Tipps (z. B. Dämmung und Kräuter gegen Tierarztkosten, Trittfutterautomat und Großpackungen gegen hohe Futterkosten). Höchstens alle zwei Monate.
- **Großpackungen:** Körnerfutter und Legemehl im 25-kg-Sack (12 € bzw. 18 €, ein Fünftel günstiger pro Kilo), Stroh als Rundballen mit 6 Ballen (21 € statt 30 €).
- **Lagerplatz und Lagerschuppen:** Ins Lager passen 60 kg Futter und 8 Ballen Stroh. Der neue **Lagerschuppen** (Erweiterungen, 150 €) schafft Platz für 300 kg und 30 Ballen.
- **Futter verdirbt:** Legemehl und Kükenstarter verlieren im Lager etwa 1 % am Tag, Körner 0,5 %, im Lagerschuppen nur halb so viel. Große Vorräte lohnen sich deshalb erst bei vielen Hühnern.
- **Hofbesuche:** Ab 4 Sternen fragen Kita, Schulklassen oder Vereine nach einem Besuch (Markt → Aufträge). Wer zusagt und am Besuchstag um 10 Uhr einen sauberen Stall (mindestens 60 %), gesunde Tiere und kein totes Tier im Gehege hat, bekommt 25–50 € und 30 Tage lang einen besseren Hof-Ruf. Geht der Besuch daneben, gibt es kein Geld und 15 Tage lang einen schlechteren Ruf. Eine Checkliste zeigt vorher, was noch fehlt.
- **Stalldämmung und Zugluftschutz** (Shop → Erweiterungen, 60 €): Im Herbst und Winter gibt es viel weniger Atemwegsinfekte, auch die zugige Holzkiste verliert ihren Nachteil. Gartenhaus-Stall und Hühnermobil gelten als schon gedämmt.
- **Kräuter fürs Trinkwasser** (Shop → Futter & Medizin, 5 € je Beutel): Vorbeugend über **Lager → Kräuter ins Trinkwasser** 10 Tage lang deutlich weniger Atemwegsinfekte. Ein leichter Infekt (bis 30 %) heilt damit ganz ohne Tierarzt und ohne Wartezeit. Erst schwere Fälle brauchen den Tierarzt.
- **Immunität:** Wer einen Atemwegsinfekt oder als Küken Kokzidiose überstanden hat, ist 30 Tage lang dagegen immun. Der Steckbrief zeigt das an. Gegen Milben und Würmer gibt es wie in echt keine Immunität, dafür Kieselgur, Sandbad und Wechselweide.
- **Versionsprüfung:** Unter **Mehr** steht unter der Versionsnummer, ob auf GitHub schon eine neuere Version
  erschienen ist (mit Link zum Release), sonst „Das ist die neueste Version.“ Der Browser fragt dafür die GitHub-API
  höchstens einmal am Tag und erst beim Öffnen von **Mehr**; ohne Netz bleibt die Zeile leer. Das ist die einzige
  Verbindung des Spiels nach außen.

### Geändert
- **Eierpreis nachvollziehbar:** Markt und Lager schlüsseln den Wert der Eier nach Rassen auf, z. B. „5× Legehybride à 0,51 € · 2× Marans à 1,02 €“, und nennen die Faktoren (Marans-Eier zählen doppelt, Seidenhuhn-Eier 1,2-fach, auf „Leicht“ 15 % Bonus). Bisher zeigte der Markt nur die Summe, was wie ein Rechenfehler wirkte. Der Gesamtpreis ist jetzt genau die Summe der angezeigten Stückpreise.
- **Eier-Aufträge** liefern zuerst die günstigsten Eier (wertvolle Marans-Eier zuletzt, Bruteier erst ganz am Ende). Der Auftrag zeigt, welche Eier geliefert werden und was genau diese Eier auf dem Markt bringen würden.
- **Ansteckung in großen Herden:** Ein krankes Tier steckt nicht mehr jedes andere im Stall an. Bis zu 4 Stallgenossen bleibt alles wie bisher, darüber wächst die Zahl der engen Kontakte nur mit der Wurzel der Herdengröße. Größere Herden werden dadurch pro Tier nicht mehr teurer.
- Krankheiten waren auf Dauer der größte Kostenblock, sodass auch sorgfältige Höfe ins Minus rutschten. In einer Simulation über ein Spieljahr („Mittel“, 12 Legehybriden mit Hofladen, gute Vorsorge) wird aus etwa −15 € jetzt etwa +85 € im Monat. Ein Hof mit 6 Hennen ohne Hofladen kommt ungefähr auf null.
- Die Hilfe (**?**) erklärt Hausmittel, Immunität und Vorbeugung.

### Behoben
- Bei Frost konnten die Hühner aus einer normalen Tränke den ganzen Tag nicht trinken, auch nicht nach „Eis aufgehackt“. Ohne beheizte Tränke verdurstete im ersten Winter oft die ganze Herde. Jetzt können sie nach dem Aufhacken etwa 6 Stunden trinken, bevor das Wasser wieder zufriert. Wer morgens das Eis aufhackt, bringt seine Hühner durch den Winter. Die Frostmeldung erklärt das.
- Die Bachpumpe friert nicht mehr ein und versorgt die Tränke auch bei Frost, wie die Wasserleitung.

### Intern
- Repository aufgeräumt: GitHub-Pages-Workflow entfernt (nicht genutzt, das Spiel liegt bei einem eigenen Webhoster),
  Spielkonzept nach `docs/KONZEPT.md` verschoben, Grafikstil-Entwürfe liegen nicht mehr im Repo,
  `CLAUDE.md` und `CONTRIBUTING.md` ergänzt, `IDEEN.md` in ToDo und Ideen gegliedert.

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
