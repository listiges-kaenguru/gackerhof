# Konzept: Langzeitspaß und Geld im späteren Spiel

> Stand: Oktober 2026, Spielversion 0.3.3. Nur Konzept, noch nichts umgesetzt.

**Problem:** Nach längerer Spieldauer geht das Geld aus, und das Spiel wird zäh. Dieses Konzept untersucht die Ursachen
mit Zahlen und schlägt Änderungen vor, damit der Spielspaß länger anhält.

## 1. Befund

### So wurde gemessen

- Ein Testprogramm hat einen Hof über ein bis eineinhalb Spieljahre durchgespielt, mit drei verschiedenen Zufallsstartwerten.
- Einstellungen: Schwierigkeit „Mittel“, Streuobstwiese, gute Ausstattung (Maschendraht, Untergrabschutz, Volierennetz,
  automatische Klappe, Trittfutterautomat).
- Der „Spieler“ versorgt täglich gründlich:
  - Wasser und Legemehl nachfüllen, Eier einsammeln und verkaufen, ausmisten, Mist verkaufen.
  - Jede Krankheit sofort behandeln, Eier-Aufträge erfüllen.
  - Alte Hennen zum Schlachter bringen und durch Junghennen ersetzen.
- Die „kluge“ Variante streut zusätzlich vorbeugend Kieselgur und wechselt die Weide.
- Die Zahlen sind Richtwerte. Ein echter Spieler spielt anders, aber die Richtung ist eindeutig.

### Ergebnis 1: Im ersten Winter verdurstet die ganze Herde

Mit normaler Tränke (Eimer oder Nippel) starben in **allen** Testläufen zwischen Tag 90 und 120 sämtliche Hühner,
obwohl jeden Morgen Wasser aufgefüllt wurde. Ursache ist der bekannte Fehler „Gefrorene Tränke“ aus `IDEEN.md`.
Wer gerade einen schönen Hof aufgebaut hat, verliert alles und muss obendrein die Entsorgung bezahlen. Das ist
vermutlich der häufigste Grund, warum es „nach einer Weile“ kippt.

> Inzwischen behoben (siehe CHANGELOG unter „Unveröffentlicht“): Mit täglichem Eisaufhacken überlebt die Herde den
> Winter jetzt auch mit normaler Tränke.

### Ergebnis 2: Auch sorgfältiges Spielen bringt dauerhaft Minus

Mit beheizter Tränke, also ohne den Fehler, kommt dabei heraus:

| Hof | Ergebnis pro Monat |
|---|---|
| 6 Legehybriden, Verkauf auf dem Markt | **−46 bis −86 €** |
| 6 Sussex, Verkauf auf dem Markt | **−57 bis −73 €** |
| 12 Legehybriden mit Hofladen, kluge Vorsorge | **−10 bis −23 €** |
| 12 Legehybriden mit Hofladen, ohne Vorsorge | **−200 bis −240 €** |

Pro Henne und Monat sieht es bei 12 Hennen mit Hofladen und kluger Vorsorge so aus:

| Ausgaben | € | Einnahmen | € |
|---|---|---|---|
| Tierarzt (Atemwegsinfekt, 25 € je Behandlung) | ~7,50 | Eier im Hofladen | ~16–18 |
| Medizin (Wurmkur, Kieselgur, Spray) | ~4,70 | Mist | ~3,30 |
| Einstreu | ~4,10 | Aufträge | ~1,10 |
| Futter (Legemehl) | ~3,70 | Suppenhühner | ~0,40 |
| Ersatz für alte Hennen | ~1,90 | | |
| **Summe** | **~22** | **Summe** | **~21–23** |

Dazu kommen Pacht und Strom, etwa 25–30 € pro Monat für den ganzen Hof.

### Die Ursachen

1. **Krankheiten sind der größte Kostenblock.** Selbst mit Vorsorge braucht jede Henne etwa **8–9 Behandlungen im
   Jahr**, im Schnitt rund 17 € pro Behandlung. Das ist ungefähr so viel, wie ihre Eier auf dem Markt einbringen
   (etwa 270 Eier × 0,50 € = 135 € im Jahr).
2. **Gegen den Atemwegsinfekt gibt es keine günstige Vorbeugung.** Die einzige Behandlung kostet 25 € beim Tierarzt.
   Das widerspricht dem Grundsatz aus `KONZEPT.md` §7: „Es gibt immer eine günstige Vorbeugung und eine teurere
   Behandlung.“
3. **Größere Herden werden pro Tier teurer.** Jedes kranke Tier kann jedes andere anstecken. Ohne Vorsorge steigt die
   Zahl der Behandlungen pro Henne von 3 auf 12 Hennen auf mehr als das Doppelte (0,025 → 0,06 pro Henne und Tag).
   „Wachsen“ wird bestraft, obwohl es zur Kernschleife gehört.
4. **Einnahmen wachsen nicht mit.** Der Eierpreis pendelt immer um 0,50 €. Der Hofladen verkauft höchstens
   2 + 3 × Sterne Eier am Tag (bei 5 Sternen also 17). Mehr Hennen bringen darüber hinaus nur Marktpreis. Rasse,
   Ruf und Erfahrung heben den Wert kaum.
5. **Nach Kapitel 3 fehlt ein Ziel.** Danach kommt „Das waren alle Kapitel dieser Version!“. Ohne neues Ziel wird
   die tägliche Versorgung zur Pflicht, und das Minus fällt doppelt auf.
6. **Das Sicherheitsnetz greift einmal und dann gar nicht mehr.** Es gibt einen einzigen Kredit, danach nur noch
   Game Over. Warum das Geld schwindet, sieht der Spieler nirgends auf einen Blick.

## 2. Ziel und Leitlinien

- **Am Anfang knapp, später zufrieden.** Am Anfang soll jeder Euro eine Entscheidung sein (`KONZEPT.md` §1). Ein
  gut geführter Hof soll aber auf „Mittel“ spürbar Gewinn machen. Richtwert: **12 Hennen mit Hofladen und guter
  Vorsorge bringen +50 bis +100 € im Monat**, 6 Hennen ohne Hofladen etwa ±0.
- **Vorbeugen lohnt sich immer.** Jede Krankheit braucht eine bezahlbare Vorbeugung, und Vorsorge muss sich in der
  Bilanz deutlich zeigen.
- **Wachsen lohnt sich.** Die Kosten pro Tier sollen mit der Herdengröße eher sinken (Mengenrabatt, Automatik)
  als steigen.
- **Später andere Sorgen.** Im späteren Spiel geht es weniger ums Überleben und mehr um Ziele: Zucht, Ruf,
  Ausbau, Sammeln.
- **Realistisch bleiben.** Alles soll so funktionieren wie bei echter Hühnerhaltung. Keine Fantasie-Boni.

## 3. Vorschläge

### A. Fehler und Stellschrauben (klein, sofort spürbar)

| # | Vorschlag | Wirkung |
|---|---|---|
| A1 | ✅ **Fehler „Gefrorene Tränke“ beheben** (erledigt, siehe CHANGELOG): Nach dem Eisaufhacken etwa 6 Stunden Trinken erlauben. Die Bachpumpe friert nicht ein. | Kein Totalverlust im ersten Winter |
| A2 | **Günstige Vorbeugung gegen den Atemwegsinfekt:** z. B. „Zugluftschutz / Stalldämmung“ (einmalig, senkt das Risiko im Herbst und Winter deutlich) und „Kräuter im Trinkwasser“ (Verbrauchsartikel, ähnlich wie Kieselgur). Der Gartenhaus-Stall ist laut Beschreibung schon „gedämmt“ und sollte entsprechend schützen. | Größter Kostenblock schrumpft |
| A3 | **Leichte Fälle billiger behandeln:** Ist ein Tier nur leicht erkrankt (Schwere < 30), reicht ein Hausmittel aus dem Lager. Erst schwere Fälle brauchen den Tierarzt. | Belohnt Aufmerksamkeit |
| A4 | **Ansteckung begrenzen:** Ein krankes Tier steckt nur einige Nachbarn an, nicht die ganze Herde. Die Wahrscheinlichkeit soll z. B. mit der Wurzel der Herdengröße wachsen statt linear. | Große Herden werden nicht bestraft |
| A5 | **Immunität nach Genesung:** Wer eine Krankheit überstanden hat, ist eine Weile geschützt (z. B. 30 Tage). | Weniger Wiederholungen |
| A6 | **Quarantänebox** (schon in `KONZEPT.md` §7 vorgesehen): Ein krankes Tier steckt während der Behandlung niemanden an. | Spieler kann selbst eingreifen |

### B. Mehr und bessere Einnahmen (mittel)

| # | Vorschlag | Beschreibung |
|---|---|---|
| B1 | **Hofladen ausbauen** | Stufen wie beim Stall: Vertrauenskasse → Eierautomat mit Kühlung → Hofladen mit Regal. Jede Stufe hebt die Höchstmenge pro Tag (z. B. 17 → 30 → 50 Eier) und lockt mehr Kundschaft. |
| B2 | **Eier-Abo / Stammkunden** | Familien abonnieren eine feste Menge pro Woche zu einem guten Preis. Das gibt planbares Einkommen. Wer nicht liefert, verliert Kunden und Ruf. |
| B3 | **Ruf bestimmt den Preis** | Der Eierpreis im Hofladen steigt mit den Sternen (z. B. 1 Stern ×1,2 … 5 Sterne ×1,8 statt pauschal ×1,5). Gute Haltung zahlt sich aus, wie es `KONZEPT.md` §9.3 verspricht. |
| B4 | **Großpackungen und Mengenrabatt** (`KONZEPT.md` §5.7) | Futter und Einstreu im 25-kg-Sack bzw. als Rundballen günstiger pro Einheit, dafür bindet es Geld und braucht Lagerplatz. Futter verdirbt. |
| B5 | **Gemüsebeet mit Hühnermist** (steht schon in `IDEEN.md`) | Mist düngt das Beet. Gemüse verkauft man oder verfüttert es als Grünfutter: weniger Futterkosten, mehr Wohlbefinden. |
| B6 | **Zucht als Geschäft** | Gut gepflegte Rassetiere mit hoher Schauqualität erzielen auf dem Markt deutlich mehr. Bruteier von prämierten Tieren sind gefragt. Preise der Geflügelschau anheben, denn 25 € für „vorzüglich“ sind kaum der Mühe wert. |
| B7 | **Hofbesuche** | Ab 4 Sternen fragen Kita oder Schulklasse nach einem Besuch. Das bringt etwas Geld und Ruf. Voraussetzung ist ein sauberer, gesunder Hof. |
| B8 | **Veredeln** (später) | Eine „Hofküche“ verarbeitet überzählige Eier zu Eiernudeln oder Eierlikör, die mehr wert sind und länger halten. Verhindert, dass Überschuss im Lager verdirbt. |

### C. Kosten planbar machen

| # | Vorschlag | Beschreibung |
|---|---|---|
| C1 | **Finanzübersicht** unter **Mehr → Finanzen** | Einnahmen und Ausgaben des Monats nach Kategorien (Futter, Tierarzt, Medizin, Einstreu, Pacht/Strom, Eier, Mist, Aufträge), dazu der Vormonat. Der Spieler sieht sofort: „Der Tierarzt frisst mein Geld.“ Entspricht `KONZEPT.md` §13.5 („Die Tagesbilanz zeigt, wohin das Geld geflossen ist“). |
| C2 | **Bestandstierarzt** | Ein Vertrag mit festem Monatsbeitrag, dafür günstigere Behandlungen und ein Hinweis, wenn sich eine Krankheit anbahnt. Das gibt es auch in echt. Lohnt sich erst ab einer größeren Herde: eine schöne Entscheidung. |
| C3 | **Prognose** | Kleiner Hinweis wie „Bei diesem Verlauf reicht dein Geld noch etwa 20 Tage.“ |

### D. Hilfe in der Not statt plötzlichem Ende

| # | Vorschlag | Beschreibung |
|---|---|---|
| D1 | **Opa Heinz gibt Rat** | Ist der Kontostand zwei Monate in Folge gesunken, schaut Opa Heinz vorbei und nennt den größten Kostenblock samt Lösung („Deine Hühner niesen dauernd. Dämm mal den Stall.“). Kostet nichts und hilft beim Lernen. |
| D2 | **Nebenjob als Notlösung** | Aushilfe im Landhandel bringt etwas Geld, aber du bist ein paar Stunden am Tag weg und kannst nicht eingreifen. Ohne Automatik wird es dann eng. Das greift den Büro-Job-Humor aus der Game-Over-Idee in `IDEEN.md` auf. |
| D3 | **Notverkauf mit Vorschlag** | Bevor es zum Game Over kommt, schlägt das Spiel vor, Ausrüstung oder überzählige Tiere zu verkaufen, und zeigt, was das bringt. |
| D4 | **Game Over** (Idee aus `IDEEN.md`) | Erst wenn das Konto lange im Minus ist und keine Besserung in Sicht ist. Mit freundlicher Bilanz und der Wahl „neuer Hof“ oder „mit Kredit weitermachen“ (dann mit Zinsen). |

### E. Langzeitziele jenseits des Geldes

| # | Vorschlag | Beschreibung |
|---|---|---|
| E1 | **Kapitel 4 und 5** (im Konzept vorgesehen) | „Rassezucht“ und „Der große Hof“. Dazu nach dem letzten Kapitel **Jahresziele**, die jedes Spieljahr neu kommen (z. B. „500 Eier im Frühling“, „ein Huhn auf der Schau mit ‚hervorragend‘“). |
| E2 | **Erfolge** (`IDEEN.md`) | „Fuchsfrei“, „Hühnerflüsterer“, „Eiermillionär“ und weitere, z. B. „Ein Jahr ohne Tierarzt“. Das macht Vorsorge zum Ziel. |
| E3 | **Jahresrückblick** | Am Ende jedes Spieljahres eine kleine Bilanz: Eier, Küken, Verluste, bestes Huhn, Einnahmen. Ein Moment zum Stolzsein und ein natürlicher Haltepunkt. |
| E4 | **Vererbung bei der Zucht** | Legeleistung und Schauqualität werden von den Eltern weitergegeben. Langfristiges Ziel ist die eigene, prämierte Linie. Das passt zu Album und Geflügelschau. |
| E5 | **Hofübergabe** (später) | Einen erfolgreichen Hof „übergeben“ und neu anfangen. Album, Erfolge und ein kleiner Startbonus bleiben erhalten. |
| E6 | **Weitere Geflügelarten** (`IDEEN.md`) | Laufenten, Gänse, Wachteln als Belohnung für späte Kapitel. Sie bringen neue Abläufe statt nur größerer Zahlen. |

## 4. Werkzeug: Balancing-Test

Die Messung aus Abschnitt 1 sollte als fester Test in `tests/` landen, wie in `KONZEPT.md` §14 vorgesehen
(„Balancing-Simulationen“). Ein Bot-Spieler versorgt den Hof ein Spieljahr lang, und der Test prüft die
Richtwerte aus Abschnitt 2, z. B.:

- 12 Hennen mit Hofladen und Vorsorge: nach einem Jahr im Plus
- 6 Hennen ohne Hofladen: nicht mehr als 20 € Minus im Monat
- kein Totalverlust im Winter bei täglicher Versorgung

So lässt sich jede Änderung an Preisen oder Krankheiten sofort nachprüfen, und das Balancing kippt nicht
unbemerkt wieder.

## 5. Empfohlene Reihenfolge

| Etappe | Inhalt | Aufwand |
|---|---|---|
| **1 – Reparieren und messen** | A1 Tränke, Balancing-Test, C1 Finanzübersicht | klein |
| **2 – Krankheiten ausbalancieren** | A2–A5, danach mit dem Balancing-Test nachjustieren | klein bis mittel |
| **3 – Einnahmen** | B1 Hofladen-Stufen, B3 Ruf-Preis, B4 Großpackungen, D1 Opa Heinz gibt Rat | mittel |
| **4 – Langzeit** | E1 Kapitel 4/5 und Jahresziele, E2 Erfolge, E3 Jahresrückblick | mittel |
| **5 – Ausbau** | B2 Eier-Abo, B5 Gemüsebeet, C2 Bestandstierarzt, D2 Nebenjob, A6 Quarantänebox | mittel |
| **Später** | B6–B8, D4 Game Over, E4 Vererbung, E5 Hofübergabe, E6 neue Arten | groß |

Etappen 1 und 2 beheben den Kern des Problems. Danach geht es um Abwechslung. Bei jeder Etappe die Anleitung im Wiki
mitziehen (Preise, Krankheiten, Tipps).

## 6. Offene Fragen

- **Wie viel Gewinn ist gewollt?** Soll ein guter Hof auf „Mittel“ reich werden können, oder nur „über die Runden
  kommen“? Davon hängen die Richtwerte in Abschnitt 2 ab.
- **Schwierigkeitsgrade:** Sollen die Änderungen auf allen Stufen gleich wirken? Für „Schwer“ wäre ein dauerhaft
  enges Budget durchaus passend.
- **Spielstände:** Neue Werte im Spielstand (Immunität, Hofladen-Stufe, Abos) brauchen eine Migration. Siehe auch
  `docs/APPS.md`, Abschnitt 3, Punkt 3.
