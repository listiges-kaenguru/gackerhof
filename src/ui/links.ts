// Adressen außerhalb des Spiels

/** Öffentlicher Quelltext (AGPL §13: Spieler müssen ihn erreichen können) */
export const SOURCE_URL = 'https://github.com/listiges-kaenguru/gackerhof';
/** Infoseite mit ausführlicher Anleitung */
export const WIKI_URL = 'https://gackerhof-wiki.schmaralde.de/';
/** Impressum und Datenschutzerklärung (gelten auch für das Spiel) */
export const IMPRESSUM_URL = `${WIKI_URL}impressum.html`;

/** Fußzeile mit Anleitung und Impressum, für Startbildschirm und „Mehr“ */
export const infoLinks = () =>
  `<a href="${WIKI_URL}anleitung/" target="_blank" rel="noopener">📖 Anleitung</a> · <a href="${IMPRESSUM_URL}" target="_blank" rel="noopener">Impressum &amp; Datenschutz</a>`;
