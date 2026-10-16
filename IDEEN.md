# 💡 Ideen & ToDo

Offene Punkte und Ideen für spätere Versionen. Nichts unter „Ideen“ ist fest eingeplant.
Erledigtes wird hier gestrichen und ins [CHANGELOG](CHANGELOG.md) übernommen.

## ToDo

- [ ] **Wiki beim nächsten Release anpassen** (alles unter „Unveröffentlicht“ im CHANGELOG), Seiten in `../gackerhof-wiki`:
  - **Frost:** Nach dem Eisaufhacken können die Hühner etwa 6 Stunden trinken, Bachpumpe und Wasserleitung frieren nicht ein (Tagesablauf, Shop, Tipps).
  - **Finanzen und Lager:** Finanzübersicht unter Mehr → Finanzen, Rat von Opa Heinz, Großpackungen, Lagerplatz (60 kg / 8 Ballen), Lagerschuppen, Futter verdirbt (Shop, Lager, Tipps, Mehr).
  - **Hofbesuche:** ab 4 Sternen, Bedingungen, Lohn und Wirkung auf den Hof-Ruf (Markt/Aufträge, Hof-Ruf).
  - **Krankheiten:** Stalldämmung, Kräuter fürs Trinkwasser (Vorbeugung und Hausmittel bis 30 %), Immunität nach Atemwegsinfekt und Kokzidiose, geringere Ansteckung in großen Herden (Krankheiten, Shop, Tipps).

Neue Testergebnisse hier sammeln. Alle Punkte aus dem Test von 1.1.0 sind in [0.2.0](CHANGELOG.md) umgesetzt.

## Ideen

### Spielstand & Speichern

| Idee | Beschreibung | Aufwand |
|---|---|---|
| **Mehrere Speicherplätze** | Mehrere Höfe pro Browser, z. B. für Geschwister am selben Tablet. Auswahl im Startbildschirm. | klein |
| **Getrennte Speicher für Testversionen** | Eigener Speicherschlüssel je Version oder Kanal (z. B. „Test“), damit sich Test- und Hauptversion auf derselben Domain nicht in die Quere kommen. | klein |
| **Speichern auf dem Server** | Derselbe Hof auf allen Geräten. Braucht ein Backend mit Datenbank und Anmeldung, und der Webserver muss Code ausführen können (PHP, Node o. Ä.). | groß |
| **Import auf dem Startbildschirm** | Spielstand direkt im Startbildschirm importieren; bisher geht es nur über den Umweg eines neuen Hofs (so beschreibt es die Anleitung im Wiki). | klein |
| **Spielstand per QR-Code übertragen** | Alternative zum Datei-Export: Spielstand als QR-Code vom Rechner aufs Handy übertragen. | mittel |

### Veröffentlichung

| Idee | Beschreibung | Aufwand |
|---|---|---|
| **Geschützter Zugang** | Online spielbar, aber nur für freigegebene Personen, z. B. über Cloudflare Pages mit Cloudflare Access. | mittel |
| **Eigenständige Apps** | Offline-Apps für Android, Linux und Windows, unabhängig vom Hosting. Konzept mit Plan, Voraussetzungen und Hürden in [`docs/APPS.md`](docs/APPS.md). | groß |

### Gameplay (aus dem Konzept, noch offen)

- **Langzeitspaß und Geld:** Im späteren Spiel geht das Geld aus. Befund mit Zahlen und Vorschläge in
  [`docs/LANGZEIT.md`](docs/LANGZEIT.md)

- **Erfolge** wie „Fuchsfrei“ (100 Tage ohne Verlust), „Hühnerflüsterer“ (ein Huhn wird 8 Jahre alt), „Eiermillionär“
- **Kapitel 4 „Rassezucht“ und 5 „Der große Hof“**
- **Kundenaufträge** („Bäckerei Krause braucht 30 Eier bis Freitag“)
- **Abnutzung und Reparatur** von Ausrüstung
- **Weitere Ereignisse:** Nachbar beschwert sich über den Hahn, verstecktes Nest suchen, ausgebüxtes Huhn einfangen
- **Hühnermist als Dünger** im eigenen Gemüsebeet statt nur verkaufen

### Oberfläche & Präsentation

- **Sound:** Gackern, Hahnenschrei am Morgen, Hintergrundmusik (abschaltbar)
- **Fotomodus** mit Rahmen zum Teilen
- **Weitere Sprachen** (Texte zentral sammeln)

### Spätere Erweiterungen

- **Weitere Geflügelarten:** Laufenten (Wasserbecken, fressen Schnecken), Gänse (Grasweide, Wachgans gegen Füchse), Wachteln
- **Game Over:** Wenn der Spieler längere Zeit pleite ist und kaum Chancen bestehen, das wieder aufzuholen, soll es ein Game Over geben. Dann muss er zurück in seinen langweiligen Büro-Job.
