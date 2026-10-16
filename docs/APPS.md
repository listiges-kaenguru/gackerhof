# Konzept: Gackerhof als eigenständige App (Android, Linux, Windows)

> Stand: Oktober 2026, Spielversion 0.3.3. Nur Konzept, noch nichts umgesetzt.

**Ziel:** Das Spiel zusätzlich als eigenständige App für Android, Linux und Windows verteilen. Die Apps laufen
komplett offline und hängen nicht am eigenen Hosting.

## 1. Ausgangslage

Für eigene Apps passt das Spiel gut:

- Es ist ein **reiner statischer Build**: kein Server, keine Daten aus dem Netz, die Schrift liegt im Projekt.
  Der Inhalt von `dist/` lässt sich 1:1 in eine App packen.
- **Der Spielstand liegt in `localStorage`** (`src/game/state.ts`). Das funktioniert auch in der WebView einer App.
- `base: './'` steht schon in `vite.config.ts`. Damit laufen die Pfade auch unter `file://` oder einem eigenen
  App-Protokoll.

Folgende Stellen funktionieren in einer App aber nicht oder nur schlecht:

| Stelle | Problem in der App |
|---|---|
| Spielstand exportieren (`src/ui/app.ts`, `<a download>` mit Blob) | Unter Android passiert gar nichts. Unter Linux (WebKitGTK) klappt es nicht zuverlässig. Es braucht einen echten Speichern-Dialog der App. |
| Links mit `target="_blank"` (`src/ui/links.ts`, Bereich **Mehr**) | Öffnen sich gar nicht oder *in* der App statt im Browser. Sie müssen an den System-Browser gehen. |
| Service Worker (`src/main.ts`, `public/sw.js`) | Wird in der App nicht gebraucht und stört eher, z. B. weil eine alte Version im Cache hängen bleibt. Im App-Build abschalten. |
| Icon nur als SVG (`public/manifest.webmanifest`) | Android, Windows und Linux brauchen PNG bzw. ICO in mehreren Größen. Android zusätzlich ein „adaptives“ Icon (Vordergrund und Hintergrund getrennt). |
| Spielstand mit falscher Version wird verworfen (`state.ts`: `if (s.version !== SAVE_VERSION) return null`) | **Wichtig:** App-Nutzer aktualisieren unregelmäßig und überspringen Versionen. Ändert sich `SAVE_VERSION`, wäre ihr Hof weg. Vorher braucht es eine Migration alter Spielstände. |
| Zurück-Taste unter Android | Beendet sonst sofort die App, statt einen Dialog zu schließen. |

Schon vorhanden und brauchbar: Safe-Area-Variablen in `src/style.css` (wichtig für Android 15, das die App bis an den
Bildschirmrand zeichnet), Speichern bei `pagehide` und `visibilitychange`, und „Geschlossen ruht der Hof“. Damit
braucht es keine Hintergrundprozesse.

## 2. Technikwahl

| Ziel | Empfehlung | Alternative | Verworfen |
|---|---|---|---|
| **Windows + Linux** | **Tauri 2**: nutzt die WebView des Systems, die App wird nur etwa 5–10 MB groß. Erzeugt Installer, AppImage und .deb selbst. | Electron (bringt Chromium mit, etwa 100 MB, sieht aber überall gleich aus) | Nur die PWA, weil sie nicht unabhängig vom Hosting ist |
| **Android** | **Capacitor**: ausgereift, braucht kein Rust, legt einen normalen Android-Studio-Ordner an. | Tauri 2 Mobile (dann ein Werkzeug für alles, aber auf Mobilgeräten weniger erprobt und mit Rust und NDK) | **TWA/Bubblewrap**, weil es die Website lädt, also am Hosting hängt |

Tauri und Capacitor stehen unter MIT- bzw. Apache-Lizenz und vertragen sich mit der AGPL.

### Linux: AppImage oder Flatpak?

- **AppImage**: Tauri erzeugt es direkt, es ist eine einzige Datei und braucht weder Store noch Prüfung.
  Nachteile: Manche Systeme brauchen erst `libfuse2`, und die mitgelieferte WebKitGTK kann auf exotischen
  Distributionen zicken.
- **Flatpak über Flathub**: die beste Verbreitung, die WebView kommt sauber aus der GNOME-Laufzeitumgebung, und
  Updates laufen über die Softwareverwaltung. **Aber:** Flathub baut aus dem Quelltext und *ohne Netz*. Deshalb müssen
  alle npm- und Cargo-Abhängigkeiten vorab als Quellen aufgelistet werden (Werkzeug `flatpak-builder-tools`). Dazu
  kommen eine AppStream-Metadatei, Screenshots und eine Prüfung. Das ist spürbar mehr Arbeit.
- **Empfehlung:** zuerst AppImage und zusätzlich .deb über GitHub Releases, Flathub später als eigener Schritt.

### Windows

Tauri erzeugt einen NSIS-Installer (`.exe`) und/oder MSI. WebView2 ist auf Windows 10 und 11 vorinstalliert. Für
Rechner ganz ohne Netz kann der Installer WebView2 mitbringen (Modus „offlineInstaller“, etwa +130 MB). Ein
mitgelieferter Bootstrapper allein reicht nicht, weil er beim Installieren nachlädt. Möglich wäre zusätzlich eine
portable `.exe` ohne Installation.

## 3. Nötige Änderungen am Code

Alles kommt in eine kleine Plattform-Schicht, damit die Spiellogik unberührt bleibt:

1. **`src/platform/`** mit drei Funktionen: `saveFile(name, text)`, `openExternal(url)` und `onBack(handler)`.
   Im Web bleibt das Verhalten wie heute. In den Apps rufen sie das jeweilige Plugin auf: Tauri `dialog` + `fs` +
   `opener`, Capacitor `Filesystem` + `Share` + `App`.
2. **Build-Ziel** über `vite build --mode app` mit einer Konstante `__PLATFORM__` (`web`/`desktop`/`android`).
   Im App-Build fallen Service Worker und Manifest weg.
3. **Migration der Spielstände** statt Verwerfen bei neuer `SAVE_VERSION`, mit Tests in `tests/`. Das lohnt sich
   auch für die Web-Version.
4. **Icons:** aus `icon.svg` per Skript PNGs, ICO und das adaptive Android-Icon erzeugen. Dazu einen
   Startbildschirm für Android.
5. **Herkunft der Spielstände fest halten:** `localStorage` hängt an der Herkunft (Origin) der App. Paketname bzw.
   Bundle-ID (z. B. `de.schmaralde.gackerhof`) dürfen sich nie mehr ändern, sonst sind die Spielstände weg.
6. **Wechsel Browser ↔ App:** Speicher teilen geht nicht. Den Weg bilden Export und Import, die es schon gibt. Im
   Wiki sollte das erklärt werden.
7. **Desktop-Feinheiten:** sinnvolle Mindestgröße des Fensters, F11 für Vollbild, keine Entwicklerwerkzeuge und kein
   Neuladen per Strg+R im Release. Nur eine Instanz gleichzeitig zulassen, sonst überschreiben sich die Spielstände
   gegenseitig.
8. **Offline-Hinweis bei Links:** Wiki und Impressum sind online. In der App sollte das ehrlich dranstehen. Optional
   die Kurzanleitung mit in die App packen.
9. **Versionsnummer:** sie kommt weiter aus `package.json`. Android braucht zusätzlich einen ganzzahligen
   `versionCode`, z. B. 0.3.3 → 303 (Haupt·10000 + Neben·100 + Patch).

Neue Ordner `src-tauri/` und `android/` (ins Repo einchecken) und die neuen Skripte kommen in `.gitattributes` als
`export-ignore`.

## 4. Plan in Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 – Vorbereitung im Web-Code** | Plattform-Schicht, Migration der Spielstände, Icons, App-Build-Modus | Die Web-Version läuft unverändert, Apps sind möglich |
| **1 – Desktop** | Tauri einrichten; GitHub Actions mit Runnern für Ubuntu und Windows | AppImage, .deb und Windows-Setup als Release-Anhänge, vorerst unsigniert |
| **2 – Android** | Capacitor einrichten, Zurück-Taste, Ränder, Signierschlüssel | Signierte APK im Release |
| **3 – Stores (alle optional)** | F-Droid, Flathub, Google Play, Microsoft Store | Updates kommen automatisch über den jeweiligen Store |
| **Daneben** | Release-Ablauf in `CLAUDE.md` und `README` erweitern, neue Wiki-Seite „Herunterladen“, CHANGELOG | |

Phase 0 bringt auch ohne Apps etwas (Migration der Spielstände). Danach lässt sich jederzeit anhalten.

## 5. Voraussetzungen

**Werkzeuge** (lokal oder nur in GitHub Actions):

- Für Desktop: Rust-Toolchain. Unter Linux zusätzlich WebKitGTK-4.1-Dev-Pakete.
- Für Windows-Builds: ein Windows-Runner. Von Linux aus für Windows zu bauen ist bei Tauri nur experimentell.
- Für Android: JDK 21, Android SDK und Gradle (am bequemsten über Android Studio).

**Geräte zum Testen:**

- Ein echtes Android-Gerät, gern zusätzlich ein älteres.
- Ein Windows-Rechner oder eine VM.
- Mindestens eine Linux-Distribution außer der eigenen.

**Schlüssel und Geheimnisse:**

- Ein Android-Keystore. Diesen **dauerhaft sicher aufbewahren**: Ohne ihn gibt es nie wieder ein Update für dieselbe
  App.
- Den Keystore als Secret in GitHub hinterlegen.

**Konten und Kosten (nur für die Stores):**

| Weg | Kosten | Aufwand |
|---|---|---|
| GitHub Releases | keine | gering |
| F-Droid | keine | mittel: baut selbst aus dem Quelltext und prüft, dass nichts Proprietäres drin ist; passt zur AGPL |
| Flathub | keine | hoch (siehe oben) |
| Google Play | 25 $ einmalig | hoch (siehe Hürden) |
| Microsoft Store | als Privatperson derzeit kostenlos | mittel: MSIX-Paket, dafür signiert Microsoft und die SmartScreen-Warnung entfällt |

## 6. Hürden, nach Gewicht sortiert

1. **Google Play für neue Privatkonten:** Vor der Veröffentlichung ist ein geschlossener Test mit **mindestens 12
   Testern über 14 Tage** Pflicht. Dazu kommen Identitätsprüfung, Formular zur Datensicherheit (einfach: „keine
   Daten“) und Link zur Datenschutzerklärung (gibt es). Außerdem muss das Ziel-SDK jedes Jahr angehoben werden, sonst
   wird die App ausgeblendet.
2. **Android-Entwicklerverifizierung:** Google hat angekündigt, dass auch frei installierte APKs auf zertifizierten
   Geräten nach und nach von registrierten Entwicklern stammen müssen. Das trifft auch Verteilung über GitHub und
   F-Droid. Den genauen Stand vor Phase 2 prüfen.
3. **Windows-SmartScreen:** Ein unsignierter Installer zeigt „Der Computer wurde durch Windows geschützt“, das
   schreckt ab. Lösungen:
   - ein Code-Signing-Zertifikat (mehrere hundert Euro im Jahr),
   - SignPath Foundation (kostenlos für Open Source, mit Antrag),
   - der Microsoft Store.
4. **Spielstände über Versionen hinweg:** siehe Abschnitt 3, Punkt 3. Ohne Migration verlieren App-Nutzer bei einem
   Update ihren Hof.
5. **Unterschiedliche WebViews:** WebKitGTK unter Linux und alte Android-WebViews (Geräte ohne Play-Dienste) zeigen
   CSS und Animationen teils anders oder langsamer. Jede Plattform muss im Release-Test vorkommen.
6. **Flathub-Aufwand:** Das Bauen ohne Netz mit allen Abhängigkeiten aufgelistet ist der aufwendigste Teil auf
   Linux-Seite.
7. **Mehr Pflege:** jährliche Android-Vorgaben, Updates für Tauri, Capacitor und Rust, CI für drei Plattformen. Der
   Release-Ablauf wird deutlich länger als „ZIP hochladen“.
8. **Updates:** Damit die Apps unabhängig vom Hosting bleiben, bekommen sie **keinen eingebauten Updater**. Nutzer
   ohne Store aktualisieren also von Hand über GitHub. Höchstens ein Hinweis „Version X.Y.Z“ unter **Mehr**, wie
   bisher.
9. **AGPL:** unproblematisch. Der Quelltext-Link bleibt im Spiel, jedes Release zeigt auf den passenden Tag.

## 7. Empfehlung

Mit Phase 0 und Phase 1 anfangen (Tauri, AppImage und Windows-Setup über GitHub Releases), dann folgt die
Android-APK über GitHub und F-Droid. Das ist kostenlos, ohne Konten bei Google oder Microsoft und komplett offline.
Google Play und Flathub erst, wenn sich zeigt, dass es Nachfrage gibt. Bei Windows lohnt sich ein früher Blick auf
SignPath oder den Microsoft Store wegen der SmartScreen-Warnung.
