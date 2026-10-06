# 🐔 Gackerhof – Spielkonzept

> Arbeitstitel. Ein Browser-Aufbauspiel rund um die Hühnerhaltung, spielbar auf Desktop und Smartphone.
> Stand: Konzept v1, Grundlage für die erste spielbare Version.

---

## 1. Die Idee in drei Sätzen

Du startest mit 400 € und einer leeren Wiese. Du baust Schritt für Schritt einen Hühnerhof auf, kümmerst dich um Tiere mit echten Bedürfnissen und schützt sie vor Fuchs, Habicht und Milben. Aus ein paar Hühnern in einer gebrauchten Holzkiste wird mit kluger Planung ein großer, teilweise automatisierter Hof.

**Was das Spiel spannend macht:**
- **Knappes Geld am Anfang:** Jede Ausgabe ist eine Entscheidung. Kaufe ich lieber den Stromzaun oder zwei Hennen mehr?
- **Echte Risiken:** Fuchs, Greifvögel, Krankheiten und Wetter. Wer schlampt, verliert Tiere und muss dann auch noch die Entsorgung bezahlen.
- **Lebende Tiere:** Jedes Huhn hat einen Namen, eine Rasse, ein Alter und eine Persönlichkeit. Es schlüpft, wächst, legt Eier, wird alt und stirbt irgendwann.
- **Kurze Runden:** Eine sinnvolle Spielrunde dauert 5–15 Minuten. Man kann jederzeit pausieren.

**Leitlinie:** Realistisch, aber nicht trocken. Der Humor kommt aus dem Alltag: ein Hahn, der um 4 Uhr kräht, der Nachbar, der sich beschwert, eine Henne, die sich partout auf Golfbälle setzt. Keine Aliens, keine Magie.

---

## 2. Die Kernschleife

```
   ┌────────────────────────────────────────────────────────────┐
   │                                                            │
   ▼                                                            │
 VERSORGEN ──► ERNTEN ──► VERKAUFEN ──► INVESTIEREN ──► WACHSEN ─┘
 (Futter,      (Eier,      (Markt,       (Shop:          (mehr Tiere,
  Wasser,       Mist,       Hofladen,     Ausrüstung,     Rassen,
  Medizin)      Küken)      Schlachter,   Erweiterungen,  Grundstücke)
                            Aufträge)     Automatik)
        ▲
        └── STÖRUNGEN: Fuchs, Habicht, Krankheit, Wetter, Ereignisse
```

**Ein typischer Spieltag:**
1. 🌅 **Morgens:** Hühnerklappe öffnen, Wasser und Futter prüfen
2. ☀️ **Tagsüber:** Eier einsammeln, auf Warnsymbole reagieren, kranke Tiere behandeln, einkaufen und verkaufen
3. 🌇 **Abends:** Hühner gehen von selbst in den Stall. Klappe schließen, sonst kommt nachts der Fuchs
4. 🌙 **Nachts:** Gefahrenphase. Tagesabrechnung mit Eiern, Einnahmen und Vorfällen

Später nimmt die **Automatisierung** (automatische Klappe, Futterautomat, Bachpumpe) diese Routine ab. Der Spieler kümmert sich dann mehr um Planung, Zucht und Handel. So entsteht ein natürlicher Fortschritt vom „Hühner-Hüter“ zum „Hof-Manager“.

---

## 3. Zeit und Tempo

| Einstellung        | Wert                                                      |
|--------------------|-----------------------------------------------------------|
| 1 Spieltag         | ca. 60 Sekunden Echtzeit bei Tempo 1×                     |
| Tempo              | ⏸ Pause · ▶ 1× · ⏩ 2× · ⏭ 4×                           |
| Tageszeiten        | Morgen, Tag, Abend, Nacht (Licht und Farben ändern sich)  |
| Jahreszeiten       | 1 Jahreszeit = 30 Spieltage, also 1 Spieljahr = 120 Tage  |
| Spiel geschlossen  | **Der Hof ruht.** Es läuft keine Zeit weiter (siehe unten) |

**Warum keine Offline-Zeit?** Wenn die Zeit weiterliefe, während das Spiel geschlossen ist, würden Tiere verhungern, während man schläft. Das frustriert, statt zu fesseln. Stattdessen wird beim Schließen automatisch gespeichert und der Hof „schläft“. (Für später denkbar: ein optionaler „Echtzeit-Modus“ für Hardcore-Spieler.)

**Biologie im Zeitraffer:** Die Lebensphasen sind gestaucht, behalten aber ihre Reihenfolge und ihre Verhältnisse:

| Phase          | Echt                 | Im Spiel (Spieltage) | Besonderheit                                  |
|----------------|----------------------|----------------------|-----------------------------------------------|
| Brut (Ei)      | 21 Tage              | 7                    | Braucht Glucke oder Brutapparat, Wärme        |
| Küken          | 0–8 Wochen           | 10                   | Wärmelampe, Kükenstarter, anfällig für Kokzidiose |
| Junghuhn       | 8–20 Wochen          | 15                   | Geschlecht wird erkennbar, legt noch nicht    |
| Erwachsen      | ab ca. 5 Monaten     | ab Tag 32            | Henne legt Eier, Hahn befruchtet und beschützt |
| Legehöhepunkt  | 1.–2. Jahr           | bis ca. Tag 240      | Volle Legeleistung                            |
| Älteres Tier   | ab 3. Jahr           | ab ca. Tag 360       | Weniger Eier, anfälliger                      |
| Lebensende     | 6–10 Jahre           | ca. Tag 600–900      | Zufallsbasiert, Pflege verlängert das Leben   |

Bei 1× Tempo dauert ein Hühnerleben damit etwa 10–15 Spielstunden. Man erlebt also Generationen, aber nicht in fünf Minuten.

---

## 4. Spielstart und Einführung

1. **Name und Hofname** eingeben (z. B. „Hof Sonnenwiese“)
2. **Avatar wählen:** einfache Spielfigur mit Grundoutfit (Hüte und Co. gibt es später im Shop)
3. **Grundstück wählen:** Es gibt drei Startgrundstücke mit echten Vor- und Nachteilen:

| Grundstück              | Pacht/Monat | Vorteile                                    | Nachteile                                   |
|-------------------------|-------------|---------------------------------------------|---------------------------------------------|
| 🌲 Wiese am Waldrand    | 15 €        | Günstig, natürlicher Schatten               | **Hohes Fuchsrisiko**, Marder               |
| 🍎 Streuobstwiese       | 25 €        | Bäume schützen vor Greifvögeln, Fallobst als Grünfutter | Mittelgroß, Nachbarn in Hörweite (Hahnkrähen!) |
| 🏞️ Grundstück am Bach   | 40 €        | Später Bachpumpe möglich (Wasser gratis)    | Teuer, feucht: höheres Risiko für Krankheiten und Parasiten |

4. **Geführtes Tutorial** mit Opa Heinz, einem alten Hühnerhalter aus dem Dorf, der Tipps gibt. Er hilft durch die ersten Käufe: Zaun → Stall → Tränke → Futterstelle → erste Tiere. Das Tutorial lässt sich überspringen.
5. Die ersten Tiere dürfen erst einziehen, wenn die **Mindestausstattung** steht: Zaun, Stall, Tränke und Futterstelle. Ohne Fuchs- und Greifvogelschutz erscheint eine deutliche Warnung, man kann aber trotzdem loslegen. Das ist ein bewusstes Risiko.

---

## 5. Gehege und Ausrüstung (Shop)

Alle Ausrüstungsgegenstände haben **Stufen**. Höhere Stufen sind teurer, schützen besser, bieten mehr Kapazität oder sparen Arbeit. Gegenstände nutzen sich mit der Zeit ab (Zustand 0–100 %), lassen sich reparieren und **gebraucht weiterverkaufen** (für 30–60 % des Neupreises, je nach Zustand).

### 5.1 Einzäunung
| Stufe | Artikel                       | Preis  | Effekt                                                  |
|-------|-------------------------------|--------|---------------------------------------------------------|
| 1     | Knotengitter 1,2 m            | 60 €   | Hühner bleiben drin, Fuchs kommt leicht drüber          |
| 2     | Maschendrahtzaun 2 m          | 140 €  | Deutlich besserer Schutz                                |
| 3     | Elektro-Geflügelnetz          | 190 €  | Sehr guter Fuchsschutz, braucht Weidezaungerät (Strom)  |

### 5.2 Stall
| Stufe | Artikel                       | Plätze | Preis   | Effekt                                       |
|-------|-------------------------------|--------|---------|----------------------------------------------|
| 1     | Gebrauchte Holzkiste          | 3      | 70 €    | Zugig, nicht mardersicher, schnell schmutzig |
| 2     | Kleintierstall mit Legenest   | 6      | 220 €   | Solide Basis                                 |
| 3     | Gartenhaus-Hühnerstall        | 15     | 850 €   | Gedämmt, mardersicher, Sitzstangen, Kotbrett |
| 4     | Hühnermobil                   | 40     | 5.500 € | Umsetzbar, frische Weide, weniger Parasiten  |

Dazu gibt es **Stallzubehör:** Legenester (+ saubere Eier), Sitzstangen (+ Zufriedenheit), Einstreu (Stroh oder Hobelspäne), Wärmelampe (für Küken und im Winter), Dämmung.

### 5.3 Tränken
| Artikel                    | Preis | Kapazität | Effekt                                         |
|----------------------------|-------|-----------|------------------------------------------------|
| Eimertränke 5 l            | 8 €   | 5 l       | Muss oft aufgefüllt werden, verschmutzt schnell |
| Nippeltränke 20 l          | 35 €  | 20 l      | Bleibt sauber                                  |
| Beheizte Tränke            | 75 €  | 10 l      | Friert im Winter nicht ein                     |
| Regentonne mit Anschluss   | 60 €  | Wetterabhängig | Füllt sich bei Regen von selbst          |
| Bachpumpe (nur Bachgrundstück) | 450 € | Unbegrenzt | Wasser kostenlos und automatisch          |
| Wasserleitung              | 900 € | Unbegrenzt | Automatisch, Wasser kostet etwas           |

### 5.4 Futterstellen
| Artikel                         | Preis | Effekt                                            |
|---------------------------------|-------|---------------------------------------------------|
| Futtertrog                      | 10 €  | Täglich befüllen, lockt Ratten und Spatzen an     |
| Futtersilo 10 kg                | 30 €  | Reicht mehrere Tage                               |
| Trittfutterautomat              | 95 €  | Rattensicher, kein Futterverlust                  |
| Automatische Fütterungsanlage   | 700 € | Wird aus dem Futterlager gespeist, kein Befüllen mehr nötig |

### 5.5 Schutz vor Füchsen (und Mardern)
| Artikel                          | Preis | Effekt                                                |
|----------------------------------|-------|-------------------------------------------------------|
| Untergrabschutz (Gitter im Boden)| 45 €  | Fuchs kann sich nicht durchgraben                     |
| Weidezaungerät (für E-Netz)      | 120 € | Macht das Elektronetz scharf, Batterie muss geladen werden |
| Automatische Hühnerklappe        | 130 € | Öffnet und schließt mit Licht, kein Vergessen mehr    |
| Bewegungsmelder-Licht            | 40 €  | Schreckt nachts ab (nur geringe Wirkung)              |
| Mardersicheres Stallgitter       | 60 €  | Schützt vor Mardern im Stall                          |

### 5.6 Schutz vor Greifvögeln
| Artikel                         | Preis | Effekt                                                  |
|---------------------------------|-------|---------------------------------------------------------|
| Flatterband und alte CDs        | 5 €   | Geringe Wirkung, die nach ein paar Wochen nachlässt (Gewöhnung) |
| Unterstand / Büsche pflanzen    | 25 €  | Hühner können sich verstecken                           |
| Volierennetz über dem Auslauf   | 160 € | Fast vollständiger Schutz, schützt auch vor Vogelgrippe-Kontakt |
| Hahn in der Gruppe              | –     | Warnt die Hennen, sie flüchten schneller (+ Schutz)     |

### 5.7 Verbrauchsmaterial (Lager)
Futter, Einstreu, Medikamente und Leckerlis kommen ins **Lager**. Das Lager hat begrenzten Platz und kann ausgebaut werden. Futter verdirbt nach einer Weile. Großpackungen sind günstiger pro Kilo, binden aber Kapital. Das ist eine kleine, aber spannende Entscheidung.

---

## 6. Die Tiere

### 6.1 Geflügelmarkt: Einkauf
| Angebot                         | Preis      | Hinweise                                                    |
|---------------------------------|------------|-------------------------------------------------------------|
| Bruteier (Hybrid / Rasse)       | 1,50–5 €   | Schlupfrate ca. 60–85 %, **Geschlecht zufällig (50/50)**   |
| Eintagsküken                    | 4–8 €      | Unsortiert, brauchen Wärmelampe                             |
| Junghenne (kurz vor Legebeginn) | 18–28 €    | Sicherer Einstieg                                           |
| Legehenne (1–2 Jahre)           | 12–20 €    | Legt sofort, aber das genaue Alter ist ungewiss             |
| Hahn                            | 10–25 €    | Nötig für befruchtete Eier und eigene Nachzucht             |
| Rassetiere mit Abstammung       | 40–120 €   | Ausstellungsfähig, wertvolle Nachzucht                      |

**Marktfeeling:** Es gibt mehrere Händler mit wechselnden Angeboten (Angebot und Nachfrage). Bei Verkäufern von Gebrauchttieren lohnt ein genauer Blick: Manche Henne ist älter als angegeben oder hat Milben. Mit einem gekauften **„Gesundheitscheck“ (3 €)** oder etwas Erfahrung des Spielers lässt sich das erkennen.

### 6.2 Rassen in Version 1
| Rasse          | Eier/Jahr | Fleisch | Brütet selbst? | Charakter / Besonderheit                         |
|----------------|-----------|---------|----------------|--------------------------------------------------|
| Legehybride    | sehr viele| wenig   | nein           | Günstig, legt fleißig, lebt kürzer               |
| Sussex         | viele     | gut     | manchmal       | Zweinutzungshuhn, robust, ein guter Allrounder   |
| Marans         | mittel    | gut     | manchmal       | **Schokobraune Eier**, die mehr Geld bringen     |
| Brahma         | wenige    | sehr gut| ja             | Groß, ruhig, kältefest, frisst viel              |
| Seidenhuhn     | wenige    | –       | **sehr gern**  | Die beste Glucke, flauschig, beliebt auf Schauen |

### 6.3 Eigenschaften eines Tieres
Jedes Tier hat eine **Steckbrief-Karte:**
- **Name** (zufällig vergeben, umbenennbar: „Berta“, „Hilde“, „Gustav“ …)
- Rasse, Geschlecht, Alter, Lebensphase
- **Bedürfnis-Balken:** Hunger, Durst, Gesundheit, Wohlbefinden, Sauberkeit
- **Werte:** Gewicht, Legeleistung, Ausstellungsqualität
- **Persönlichkeit** (1 Merkmal): *mutig, scheu, gefräßig, neugierig, zänkisch, brütig*. Das wirkt sich leicht auf das Verhalten aus. Eine zänkische Henne löst schneller Federpicken aus, eine neugierige findet mehr Würmer.
- Eltern (bei eigener Nachzucht), Lebensereignisse („hat den Fuchs überlebt“)

### 6.4 Fortpflanzung und Brut
- **Befruchtete Eier** gibt es nur, wenn ein Hahn in der Gruppe ist (empfohlen: 1 Hahn pro 8–12 Hennen)
- Zu viele Hähne führen zu **Rangkämpfen** (Verletzungen, Stress, keine Eier)
- **Naturbrut:** Eine brütige Henne (Glucke) setzt sich auf die Eier. Das kostet nichts, aber sie legt in dieser Zeit nicht
- **Kunstbrut:** Brutapparat (ab 90 €). Eier müssen gewendet werden (Automatik-Wender als Upgrade) und **geschiert** werden: Am Tag 3 kann man die Eier durchleuchten und unbefruchtete aussortieren (diese lassen sich noch als Futter verwenden)
- Nach dem Schlupf zeigt sich erst ab der Junghuhn-Phase, ob ein Tier Henne oder Hahn ist. **Überzählige Hähne** sind ein realistisches Dauerthema: verkaufen, behalten oder zum Schlachter bringen

### 6.5 Tod und Entsorgung
- Todesursachen: Altersschwäche, unbehandelte Krankheit, Raubtier, Hitzschlag/Erfrieren, Verhungern/Verdursten
- Ein verstorbenes Tier muss **kostenpflichtig entsorgt werden** (Tierkörperbeseitigung: 15 €). Ein Schlachterlös ist dann nicht mehr möglich
- Wird ein totes Tier nicht innerhalb eines Tages entsorgt, steigt das Krankheitsrisiko für die ganze Gruppe
- Dezente Darstellung: Das Tier bekommt einen kleinen Gedenkeintrag im **Hof-Tagebuch** („Hilde, Sussex, 3 Jahre – friedlich eingeschlafen“). Es gibt keine drastischen Bilder

---

## 7. Bedürfnisse und Lösungen

| Bedürfnis / Problem      | Anzeichen im Spiel                         | Lösungen                                                                 | Folgen bei Vernachlässigung              |
|--------------------------|--------------------------------------------|--------------------------------------------------------------------------|------------------------------------------|
| 🌾 **Hunger**            | Balken sinkt, Huhn pickt am leeren Trog    | Körnerfutter (günstig), **Legemehl** (+ Eier), Kükenstarter (Pflicht für Küken), Grünfutter, Küchenreste | Weniger Eier → Gewichtsverlust → Tod     |
| 💧 **Durst**             | Tropfen-Symbol, Hecheln                    | Tränke auffüllen, größere Tränke, Bachpumpe, im Winter beheizte Tränke   | Geht schneller als Hunger, Legestopp, Tod |
| 🐜 **Milbenbefall**      | Huhn kratzt sich, blasser Kamm, Stallsymbol | **Sandbad** (vorbeugend), Kieselgur, Stall ausmisten, Milbenspray        | Blutarmut, kaum Eier, Ausbreitung, Tod   |
| 🪱 **Würmer**            | Abmagerung trotz Futter                    | Wurmkur (danach **5 Tage keine Eier verkaufen**: Wartezeit!), Weidewechsel | Schwäche, Ansteckung                     |
| 🤧 **Atemwegsinfekt**    | Niesen, Schnupfensymbol                    | Tierarzt + Medikament (teuer), kranke Tiere absondern (Quarantänebox)    | Ansteckung, Tod                          |
| 🦠 **Kokzidiose (Küken)**| Küken lustlos, aufgeplustert               | Medikament, saubere Einstreu, Hygiene                                    | Hohe Kükensterblichkeit                  |
| 🥵 **Hitze**             | Hecheln, Flügel abgespreizt                | Schatten, viel Wasser, Wassermelone (Leckerli)                          | Hitzschlag                               |
| 🥶 **Kälte**             | Aufgeplustert, Kamm wird blass             | Stalldämmung, mehr Einstreu, energiereiches Futter                       | Erfrierungen am Kamm, Legestopp          |
| 😤 **Langeweile / Stress** | Federpicken, Zank                        | Mehr Platz, Pickstein, Mehlwürmer streuen, Sitzstangen, weniger Hähne   | Verletzungen, Kannibalismus-Risiko       |
| 🪶 **Mauser** (im Herbst)| Federn fallen aus                          | Eiweißreiches Futter, Ruhe. Das ist natürlich und keine Krankheit       | Kein Legen für einige Tage (normal)      |
| 🧹 **Stallhygiene**      | Stall-Sauberkeit sinkt                     | Ausmisten, frische Einstreu → **Mist lässt sich als Dünger verkaufen**  | Mehr Milben und Krankheiten, schmutzige Eier |
| 🥚 **Schalenqualität**   | Dünnschalige Eier                          | Muschelkalk / Grit                                                       | Bruch, geringerer Verkaufspreis          |

**Gestaltungsprinzip:** Jedes Problem kündigt sich **früh und sichtbar** an (Symbol über dem Tier, Hinweis im Tagebuch). Es gibt immer eine günstige Vorbeugung und eine teurere Behandlung. Wer aufmerksam spielt, spart Geld.

---

## 8. Gefahren und Ereignisse

### 8.1 Raubtiere
| Räuber       | Wann         | Wie er zuschlägt                                  | Gegenmittel                                 |
|--------------|--------------|---------------------------------------------------|---------------------------------------------|
| 🦊 Fuchs     | Dämmerung/Nacht | Über oder unter dem Zaun hindurch, offene Klappe | Hoher Zaun, E-Netz, Untergrabschutz, Klappe |
| 🦅 Habicht   | Tagsüber     | Greift einzelne Hühner im offenen Auslauf an       | Netz, Unterstände, Büsche, Hahn             |
| 🦡 Marder    | Nachts       | Dringt durch kleine Lücken in den Stall ein        | Mardersicherer Stall, Gitter                |
| 🐀 Ratten    | Laufend      | Fressen Futter, stehlen Eier, übertragen Krankheiten | Trittfutterautomat, Hygiene, Falle         |

**Spannungsmoment:** Wird eine Gefahr bemerkt (z. B. „🦊 Fuchsspuren am Zaun entdeckt!“), bleibt dem Spieler ein Spieltag zum Reagieren. Fehlt der Schutz, kommt es mit gewisser Wahrscheinlichkeit zum Angriff. Nach einem Angriff zeigt ein kurzer **Morgenbericht**, was passiert ist und welcher Schutz gefehlt hat. Verluste sollen sich fair anfühlen, nie zufällig unvermeidbar.

### 8.2 Wetter und Jahreszeiten
- **Frühling:** Brutsaison, Hühner legen viel, Glucken werden brütig
- **Sommer:** Hitzewellen, Milben vermehren sich stark
- **Herbst:** Mauser, Legeleistung sinkt, Füchse sind aktiver (Jungfüchse)
- **Winter:** Kälte, Tränken frieren ein, wenig Tageslicht (weniger Eier, außer mit Stalllicht)
- **Wettereignisse:** Gewitter (Zaun beschädigt), Sturm (Stall beschädigt), Dauerregen (Matsch → Parasiten)

### 8.3 Zufallsereignisse (Auswahl)
- 📢 **Stallpflicht wegen Vogelgrippe:** Für 10 Tage dürfen die Hühner nicht in den offenen Auslauf. Wer ein Volierennetz oder einen großen Stall hat, ist im Vorteil
- 😠 **Nachbar beschwert sich** über den krähenden Hahn: Man kann eine Hahnenbox bauen oder den Nachbarn mit Eiern besänftigen
- 🎪 **Dorffest / Ostermarkt:** Eierpreise kurzzeitig doppelt so hoch
- 🐣 **Henne versteckt ihr Nest:** Eier verschwinden, man muss suchen (kleines Suchspiel im Gehege)
- 🐔 **Huhn ausgebüxt:** Schnell antippen und einfangen, bevor der Habicht kommt
- 📦 **Lieferengpass beim Futter:** Preise steigen für eine Woche
- 👴 **Opa Heinz bringt ein Geschenk** (z. B. Bruteier einer seltenen Rasse)

---

## 9. Wirtschaft

### 9.1 Einnahmen
| Quelle                        | Ertrag (Richtwert)        | Bemerkung                                        |
|-------------------------------|---------------------------|--------------------------------------------------|
| Eier auf dem Markt            | 0,30–0,50 €/Stück         | Marktpreis schwankt                              |
| Eier im **Hofladen** (Upgrade)| 0,50–0,80 €/Stück         | Verkauft langsamer, abhängig vom Ruf             |
| Besondere Eier (Marans …)     | bis 1,20 €/Stück          |                                                  |
| Bruteier verkaufen            | 1–4 €/Stück               | Nur befruchtete Eier, mit Hahn                   |
| Tiere verkaufen               | Je nach Rasse, Alter, Qualität | Junghennen sind am gefragtesten             |
| Schlachter                    | Gewicht × Kilopreis − Schlachtgebühr (ca. 5–15 € Erlös) | Nur lebende, gesunde Tiere, die nicht in der Medikamenten-Wartezeit sind |
| Mist / Dünger                 | 2 € pro Sack              | Fällt beim Ausmisten an                          |
| **Aufträge**                  | Bonus auf den Marktpreis  | z. B. „Bäckerei Krause braucht 30 Eier bis Freitag“ |
| Rassegeflügelschau            | Preisgeld und Pokal       | Für gut gepflegte Rassetiere                     |
| Gebrauchte Ausrüstung         | 30–60 % des Neupreises    |                                                  |

### 9.2 Ausgaben
- **Laufend:** Pacht, Futter, Einstreu, Strom (Wärmelampe, Weidezaun, Licht), Wasser (bei Leitung)
- **Einmalig:** Ausrüstung, Tiere, Erweiterungen
- **Unvorhergesehen:** Tierarzt, Medikamente, Reparaturen, Entsorgung

### 9.3 Der Ruf (Tierwohl-Sterne ⭐)
Ein Hof-Ruf von 1 bis 5 Sternen ergibt sich aus Platz pro Tier, Gesundheit, Sterberate und Sauberkeit. Ein hoher Ruf bringt bessere Preise im Hofladen, mehr und lukrativere Aufträge und die Zulassung zu größeren Geflügelschauen. **Gute Tierhaltung zahlt sich also direkt aus.**

### 9.4 Balancing-Ziel
- **Startgeld 400 €.** Eine Minimalausstattung (Holzkiste, Knotengitter, Eimertränke, Trog, Untergrabschutz, Flatterband) kostet ca. 200 €. Für 3 Junghennen und Futter bleibt dann noch etwas übrig, aber kaum Reserve
- Nach etwa 20–30 Minuten Spielzeit sollte das erste größere Upgrade (z. B. ein Kleintierstall) erreichbar sein
- Pleite? Wenn das Geld unter 0 € fällt, gibt es einen **Kleinkredit** von Opa Heinz (einmalig, zinslos) und danach einen Bankkredit mit Zinsen. Ein echtes Game Over tritt erst ein, wenn keine Tiere mehr da sind und kein Geld für einen Neustart. Dann folgt eine freundliche Bilanz mit „Nochmal versuchen“

---

## 10. Erweiterungen und Fortschritt

### 10.1 Bauliche Erweiterungen
- **Auslauf vergrößern** (in Abschnitten): mehr Platz pro Huhn → weniger Stress, bessere Sterne
- **Stall ausbauen** oder größeren Stall bauen
- **Neue Grundstücke kaufen oder pachten:** getrennte Gehege, z. B. für Zuchtgruppen, Quarantäne oder Junghühner
- **Lagerschuppen:** mehr Platz für Futter und Material
- **Kükenaufzuchtstation:** Wärmeplatte, eigenes Mini-Gehege
- **Hofladen mit Kasse des Vertrauens:** verkauft Eier passiv
- **Wechselweide:** Der Auslauf wird geteilt und abwechselnd genutzt → weniger Würmer

### 10.2 Automatisierung
| Upgrade                          | Nimmt dem Spieler ab                    |
|----------------------------------|-----------------------------------------|
| Automatische Hühnerklappe        | Morgens öffnen, abends schließen        |
| Futterautomat / Fütterungsanlage | Futter auffüllen                        |
| Bachpumpe / Wasserleitung        | Wasser auffüllen                        |
| Eier-Abrollnester                | Eier sammeln (landen automatisch im Lager) |
| Kotband im Großstall             | Halbiert das Ausmisten                  |
| Brutapparat mit Wendeautomatik   | Eier wenden                             |
| Solarpanel                       | Senkt die Stromkosten                   |

### 10.3 Kapitel und Ziele (roter Faden)
Das Spiel ist in lockere **Kapitel** gegliedert. Jedes Kapitel hat 3–5 Ziele und eine kleine Belohnung:

1. **„Die ersten Eier“:** Gehege bauen, 3 Hühner kaufen, 10 Eier verkaufen
2. **„Eigene Nachzucht“:** Hahn kaufen, erstes Küken schlüpfen lassen, ein Junghuhn aufziehen
3. **„Der Hofladen“:** Hofladen bauen, 3 Sterne erreichen, 5 Aufträge erfüllen
4. **„Rassezucht“:** 3 Rassen halten, an einer Geflügelschau teilnehmen
5. **„Der große Hof“:** zweites Grundstück, 50 Tiere, vollständige Automatisierung

Daneben gibt es **Erfolge** wie „Fuchsfrei“ (100 Tage ohne Verlust), „Hühnerflüsterer“ (ein Huhn wird 8 Jahre alt) oder „Eiermillionär“ (10.000 Eier).

### 10.4 Hühner-Album (Sammeln)
Jede Rasse und Farbvariante, die man einmal besessen hat, wird im Album freigeschaltet. Das motiviert zur Zucht, ohne den Fortschritt zu blockieren.

---

## 11. Gimmicks (rein kosmetisch)

Kosmetik-Artikel im Shop haben **keinen spielerischen Vorteil**. Sie sind nur zum Spaß da und machen den Hof persönlich:

- 🎩 **Hüte für den Spieler:** Strohhut, Cowboyhut, Bommelmütze, Kapitänsmütze, Imkerhut, Krone aus Pappe
- 🥾 **Outfits:** Gummistiefel in allen Farben, Latzhose, Regencape, Karohemd
- 🏡 **Hofdeko:** Gartenzwerg, Wetterhahn auf dem Stall, Hofschild mit eigenem Namen, Blumenkästen, Windrad, Fahnenmast
- 🐔 **Für die Hühner:** Hühnerschaukel, kleines Hühner-Häuschen in Bunt, Namensschilder
- 🎵 **Kleinkram:** andere Krähgeräusche für den Wecker, Fotomodus mit Rahmen, Hof-Hintergrundmusik

---

## 12. UI-Skizzen

### 12.1 Grundaufbau

Das Hauptbild ist der **Hof von oben** (2D, leicht schräge Draufsicht, freundlicher Zeichenstil). Hühner laufen herum, picken, nehmen Sandbäder und gehen abends in den Stall. Menüs öffnen sich als Panel (Desktop) bzw. als **Bottom Sheet** (Mobil). Der Hof bleibt so immer im Blick.

### 12.2 Desktop (Querformat)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 🐔 Hof Sonnenwiese    💰 237,40 €   ⭐⭐⭐☆☆   📅 Tag 14 · Frühling   ☀️ 18°C  🕐 Morgen │
│                                                          ⏸  ▶  ⏩  ⏭     ⚙️    │
├───────────────────────────────────────────────────────────┬──────────────────────┤
│                                                           │  🔔 HINWEISE          │
│   🌲🌲        ┌─────────────────────────────┐   🌲         │ ⚠ Tränke fast leer   │
│               │  🐔      🐔        🌳       │              │ 🐜 Berta kratzt sich │
│   🌲          │       🐓     [Tränke]💧     │  🧑‍🌾        │ 🦊 Fuchsspuren am    │
│               │  [STALL]       🐔           │  (Spieler)   │    Zaun! (1 Tag)     │
│               │   🏠  🥚🥚    [Futter]🌾     │              ├──────────────────────┤
│               │       🐔                    │              │  📋 ZIELE Kap. 1      │
│               └──────────────────── Zaun ───┘              │ ☑ Gehege bauen       │
│                                                           │ ☑ 3 Hühner kaufen    │
│   [ 🥚 Eier sammeln (2) ]  [ 💧 Auffüllen ]  [ 🚪 Klappe ] │ ☐ 10 Eier verkaufen  │
├───────────────────────────────────────────────────────────┴──────────────────────┤
│   🏡 Hof     🛒 Shop     🐣 Markt     🐔 Tiere (4)     📦 Lager     📖 Tagebuch    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Mobil (Hochformat)

```
┌─────────────────────────┐
│ 💰 237 €  📅 T14  ☀️ 🕐 │
│ ⭐⭐⭐   ⏸ ▶ ⏩    🔔 3  │
├─────────────────────────┤
│                         │
│   🌲   ┌──────────┐     │
│        │🐔   🐓  💧│    │
│        │ 🏠 🥚    │     │
│        │  🐔  🌾 🐔│     │
│        └──────────┘     │
│              🧑‍🌾        │
│  (Wischen = Karte       │
│   bewegen, Pinch=Zoom)  │
│                         │
├─────────────────────────┤
│ [🥚 2] [💧] [🌾] [🚪]   │  ← Schnellaktionen
├─────────────────────────┤
│ 🏡   🛒   🐣   🐔   ☰  │  ← Navigation
│ Hof  Shop Markt Tiere Mehr│
└─────────────────────────┘
```

### 12.4 Tier-Steckbrief (Bottom Sheet bzw. Seitenpanel)

```
┌─────────────────────────────────────┐
│  ━━━━━                              │
│  🐔  BERTA            ✏️ umbenennen │
│  Sussex · Henne · 1 Jahr, 2 Monate  │
│  Persönlichkeit: neugierig          │
│                                     │
│  🌾 Hunger      ████████░░  80 %    │
│  💧 Durst       ██████░░░░  60 %    │
│  ❤️ Gesundheit  ███████░░░  70 %  ⚠ │
│  😊 Wohlbefinden█████████░  90 %    │
│                                     │
│  ⚠ Milbenbefall (leicht)            │
│    [ Kieselgur 4 € ] [ Spray 9 € ]  │
│                                     │
│  🥚 Legeleistung: hoch · 47 Eier    │
│  ⚖️ Gewicht: 2,8 kg                 │
│                                     │
│  [ Verkaufen ] [ Schlachter ] [ ⋯ ] │
└─────────────────────────────────────┘
```

### 12.5 Shop

```
┌──────────────────────────────────────────────────┐
│ 🛒 Landhandel Meier                    💰 237 €   │
│ [Gehege] [Stall] [Wasser] [Futter] [Schutz]       │
│ [Medizin] [Erweiterungen] [🎩 Gimmicks]           │
├──────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│ │  [Bild]      │ │  [Bild]      │ │  [Bild]    │ │
│ │ Maschendraht │ │ E-Netz       │ │ Untergrab- │ │
│ │ 2 m          │ │              │ │ schutz     │ │
│ │ 🦊 ●●○       │ │ 🦊 ●●●       │ │ 🦊 +●      │ │
│ │ 140 €        │ │ 190 €        │ │ 45 €       │ │
│ │ [Kaufen]     │ │ 🔒 braucht   │ │ ✔ besitzt  │ │
│ └──────────────┘ │ Weidezaungerät│ └────────────┘ │
│                  └──────────────┘                 │
└──────────────────────────────────────────────────┘
```
Jede Karte zeigt **auf einen Blick, wogegen sie hilft** (Symbole mit Punkten 1–3), was sie kostet und ob man sie schon hat. Ein Antippen öffnet die Details mit einem Vergleich zur aktuellen Ausstattung („+40 % Fuchsschutz“).

### 12.6 Geflügelmarkt

```
┌──────────────────────────────────────────────────┐
│ 🐣 Geflügelmarkt · Samstag     [Kaufen] [Verkaufen]│
├──────────────────────────────────────────────────┤
│ 👨 Händler Brandt  „Beste Junghennen weit und breit!“│
│   🐔 Junghenne Legehybride   ×6   22 € /Stk  [+] │
│   🐓 Hahn Sussex             ×1   18 €       [+] │
│ 👵 Frau Lindner   „Von meinen eigenen Hühnern.“  │
│   🥚 Bruteier Marans  ×10   3,50 € /Stk     [+]  │
│   🐔 Legehenne „ca. 2 J.“ ×2  14 €  🔍 Check 3 € │
├──────────────────────────────────────────────────┤
│ Eierpreis heute: 0,42 € ↑    Platz im Stall: 2 frei│
└──────────────────────────────────────────────────┘
```
Der Markt zeigt immer an, **wie viel Platz noch frei ist**. Man kann also nicht aus Versehen mehr Tiere kaufen, als man unterbringen kann (eine Warnung erscheint, Überbelegung ist aber erlaubt und hat Folgen).

---

## 13. UX-Prinzipien

1. **Mobile first, Daumen-freundlich:** Alle wichtigen Aktionen liegen im unteren Bildschirmdrittel. Schaltflächen sind mindestens 44 × 44 px groß
2. **Ein Tipp genügt:** Häufige Aktionen (Eier sammeln, Wasser auffüllen) sind Schnellbuttons. Auf dem Desktop gibt es zusätzlich Tastenkürzel (E = Eier, W = Wasser, F = Futter, K = Klappe, Leertaste = Pause)
3. **Probleme direkt am Ort zeigen:** Symbole über Tieren und Gegenständen (💧 🌾 🐜 🤧). Ein Antippen des Symbols öffnet direkt die passende Lösung
4. **Warnung vor Strafe:** Keine plötzlichen Verluste ohne Vorwarnung. Jede Gefahr lässt sich im Rückblick nachvollziehen
5. **Klare Zahlen:** Jeder Kauf zeigt vorher, was er bewirkt. Die Tagesbilanz zeigt, wohin das Geld geflossen ist
6. **Kurze Sessions:** Automatisches Speichern, sofortiger Einstieg, „Was ist seit gestern passiert?“-Zusammenfassung beim Laden
7. **Lebendigkeit:** Kleine Animationen (Huhn schüttelt sich, Hahn kräht, Küken folgen der Glucke) und dezente Geräusche, die sich abschalten lassen
8. **Zugänglichkeit:** Symbole immer mit Text oder Tooltip, gut unterscheidbare Farben (nicht nur Rot/Grün), skalierbare Schrift

---

## 14. Technische Umsetzung

| Bereich         | Vorschlag                                                                 |
|-----------------|---------------------------------------------------------------------------|
| Sprache / Build | **TypeScript + Vite**, kein Backend nötig                                 |
| Darstellung     | Hof als **HTML5-Canvas** (ggf. mit PixiJS), Menüs als normales HTML/CSS (responsiv, barrierearm) |
| Spiellogik      | Getrennte Simulations-Schicht (reine Funktionen, „Tick“ pro Spielstunde). Das ist gut testbar und unabhängig von der Grafik |
| Daten           | Rassen, Artikel und Krankheiten als **Konfigurationsdateien (JSON/TS)**. So lassen sich später Enten und Gänse leicht ergänzen |
| Speichern       | `localStorage` / IndexedDB, Autosave, Export/Import des Spielstands als Datei |
| Offline / Mobil | **PWA:** auf dem Homescreen installierbar, läuft offline                  |
| Grafik          | Eigener, einheitlicher Flat-Stil (SVG-Sprites). Für den Prototyp genügen einfache Formen und Platzhalter |
| Tests           | Vitest für die Spiellogik (Balancing-Simulationen: „Überlebt ein Hof mit X ohne Fuchsschutz 30 Tage?“) |
| Hosting         | Statisch, z. B. über GitHub Pages                                         |

**Vorbereitung auf andere Geflügelarten:** Tierart, Bedürfnisse und Krankheiten sind von Anfang an datengetrieben aufgebaut (`species: "huhn"`). Laufenten (brauchen Wasserbecken, fressen Schnecken), Gänse (Grasweide, Wachgans gegen Füchse) usw. lassen sich später als neue Datensätze plus einige spezielle Regeln ergänzen.

---

## 15. Umfang und Etappen

### Version 1 (dieses Konzept)
- ✅ Grundstückswahl (3 Grundstücke), Shop mit allen 6 Ausrüstungskategorien
- ✅ Geflügelmarkt (Kauf/Verkauf), 5 Hühnerrassen, Bruteier, Küken, Hennen, Hähne
- ✅ Kompletter Lebenszyklus inklusive Brut (Glucke und Brutapparat), Altern und Tod
- ✅ Bedürfnisse, Krankheiten und Medikamente aus Abschnitt 7
- ✅ Fuchs, Habicht, Marder, Ratten
- ✅ Jahreszeiten und Wetter, eine Auswahl an Zufallsereignissen
- ✅ Schlachter, Entsorgung, Hofladen, Aufträge
- ✅ Erweiterungen und Automatisierung, Kosmetik-Shop
- ✅ Kapitel 1–3, Tagebuch, Autosave, PWA

### Etappenplan für die Umsetzung
1. **Prototyp:** Simulationskern (Zeit, Tiere, Bedürfnisse), einfacher Hof, Shop und Markt mit Platzhaltergrafik. Ziel: Ist die Kernschleife spaßig?
2. **Spielbar:** Gefahren, Krankheiten, Brut, Wirtschaft, Tutorial, Speichern
3. **Rund:** Grafik, Animationen, Sound, Ereignisse, Kapitel, Kosmetik, Feinschliff am Balancing
4. **Später:** Kapitel 4–5, Geflügelschau, weitere Rassen, **Laufenten, Gänse, Wachteln …**

---

## 16. Offene Fragen an dich

1. **Zeit beim Schließen:** Passt „der Hof ruht, solange das Spiel zu ist“? Oder soll die Zeit (begrenzt) weiterlaufen?
2. **Schlachter-Darstellung:** Ich habe es bewusst dezent geplant (Menüaktion mit Erlös, keine Bilder). Passt das?
3. **Grafikstil:** Freundlich-bunter Flat-/Cartoon-Stil oder eher Pixel-Art?
4. **Name des Spiels:** „Gackerhof“ als Arbeitstitel oder hast du einen Wunschnamen?
5. **Sprache:** Nur Deutsch, oder soll die Technik von Anfang an mehrsprachig vorbereitet sein?
6. **Schwierigkeit:** Ein Schwierigkeitsgrad oder wählbar (z. B. „Gemütlich“ mit mehr Startgeld und weniger Füchsen, „Realistisch“)?
