import './style.css';
import { DIFFICULTIES, DIFFICULTY_ORDER, PLOTS } from './game/data';
import { euro } from './game/helpers';
import { refreshOffers } from './game/sim';
import { importSave, load, newGame, save } from './game/state';
import type { Difficulty, GameState, PlotId } from './game/types';
import { startApp } from './ui/app';
import { DEFS, INK, playerSvg } from './ui/art';
import { infoLinks } from './ui/links';
import { esc } from './ui/scene';

const root = document.getElementById('root')!;

function startScreen() {
  const saved = load();
  let difficulty: Difficulty = 'mittel';
  let plot: PlotId = 'obst';
  /** Importierter Spielstand, der den gespeicherten Hof ersetzen würde (wartet auf Bestätigung) */
  let pending: GameState | null = null;
  let importError = '';
  const farmLabel = (s: GameState) => `„${esc(s.farmName)}“ (Tag ${s.day}, ${euro(s.money)})`;
  const importCard = () => pending && saved
    ? `<div class="start-import warnbox">
        <p>${farmLabel(pending)} laden? Dein gespeicherter Hof ${farmLabel(saved)} wird dabei ersetzt.</p>
        <div class="row"><button class="btn primary" data-start="import-ok">📂 Laden</button><button class="btn" data-start="import-cancel">Abbrechen</button></div>
      </div>`
    : `<div class="start-import">
        <label class="btn">📂 Spielstand importieren<input type="file" accept="application/json,.json" data-start-import hidden></label>
        <p class="muted">Eine Datei, die du im Spiel unter <b>Mehr → Spielstand exportieren</b> gespeichert hast, z. B. von einem anderen Gerät.</p>
        ${importError ? `<p class="bad">${importError}</p>` : ''}
      </div>`;
  const render = () => {
    root.innerHTML = `
      <div class="start">
        <div class="start-card">
          <svg class="start-hero" viewBox="0 0 220 110" aria-hidden="true">
            <defs>${DEFS}</defs>
            <g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
              <path d="M0 96 Q 110 80 220 96 V110 H0Z" fill="#7cc35a"/>
              <g transform="translate(60 88)" style="--b:#b5652b;--bd:#7d3f17"><use href="#sym-hen"/></g>
              <g transform="translate(110 86) scale(-1.1 1.1)" style="--b:#c4552a;--bd:#8f3416;--n:#e8a23a;--t:#2d5a3a"><use href="#sym-rooster"/></g>
              <g transform="translate(150 92) scale(.9)" style="--b:#ffe066"><use href="#sym-chick"/></g>
              <g transform="translate(166 96) scale(-.9 .9)" style="--b:#ffe066"><use href="#sym-chick"/></g>
              <g transform="translate(192 30) scale(.62)">${playerSvg('stroh', 0, 0)}</g>
            </g>
          </svg>
          <h1>Gackerhof</h1>
          <p class="tagline">Vom leeren Feld zum großen Hühnerhof</p>
          ${saved ? `<button class="btn primary big" data-start="continue">▶ Weiterspielen: ${esc(saved.farmName)} <small>(Tag ${saved.day}, ${euro(saved.money)})</small></button><p class="or">oder neu anfangen:</p>` : ''}
          <label class="field">Name deines Hofs
            <input id="farm" maxlength="24" placeholder="z. B. Hof Sonnenwiese" value="${saved ? '' : 'Hof Sonnenwiese'}">
          </label>
          <h2>Schwierigkeit</h2>
          <div class="choices three">
            ${DIFFICULTY_ORDER.map(d => {
              const def = DIFFICULTIES[d];
              return `<button class="choice ${difficulty === d ? 'on' : ''}" data-diff="${d}"><span class="big-ico">${def.emoji}</span><b>${def.name}</b><small>${def.desc}</small><small class="money">Startgeld ${def.startMoney} €</small></button>`;
            }).join('')}
          </div>
          <h2>Grundstück</h2>
          <div class="choices three">
            ${(Object.keys(PLOTS) as PlotId[]).map(p => {
              const def = PLOTS[p];
              return `<button class="choice ${plot === p ? 'on' : ''}" data-plot="${p}"><span class="big-ico">${def.emoji}</span><b>${def.name}</b><small>👍 ${def.pros}</small><small>👎 ${def.cons}</small><small class="money">Pacht ${def.rent} € / Monat</small></button>`;
            }).join('')}
          </div>
          <button class="btn primary big" data-start="new">🐣 Hof gründen</button>
          <p class="or">oder einen gespeicherten Hof mitbringen:</p>
          ${importCard()}
          <p class="version">${infoLinks()}</p>
        </div>
      </div>`;
  };
  render();
  const nameInput = () => root.querySelector<HTMLInputElement>('#farm');
  /** Neu zeichnen, ohne den schon eingetippten Hofnamen zu verlieren */
  const rerender = (name?: string) => {
    render();
    const input = nameInput();
    if (input && name != null) input.value = name;
  };
  root.onclick = e => {
    const el = (e.target as Element).closest<HTMLElement>('[data-diff],[data-plot],[data-start]');
    if (!el) return;
    const name = nameInput()?.value;
    if (el.dataset.diff) { difficulty = el.dataset.diff as Difficulty; rerender(name); }
    if (el.dataset.plot) { plot = el.dataset.plot as PlotId; rerender(name); }
    if (el.dataset.start === 'continue' && saved) begin(saved);
    if (el.dataset.start === 'import-ok' && pending) { save(pending); begin(pending); }
    if (el.dataset.start === 'import-cancel') { pending = null; rerender(name); }
    if (el.dataset.start === 'new') {
      const s = newGame({ farmName: (name || 'Mein Hof').trim(), difficulty, plot });
      refreshOffers(s);
      save(s);
      begin(s);
    }
  };
  root.onchange = e => {
    const input = e.target as HTMLInputElement;
    if (!input.matches('[data-start-import]') || !input.files?.[0]) return;
    const name = nameInput()?.value;
    input.files[0].text().then(txt => {
      const loaded = importSave(txt);
      importError = loaded ? '' : 'Diese Datei ist kein gültiger Spielstand.';
      if (loaded && !saved) { save(loaded); begin(loaded); return; }
      pending = loaded;
      rerender(name);
    }, () => { importError = 'Die Datei ließ sich nicht lesen.'; rerender(name); });
  };
}

function begin(s: GameState) {
  root.onclick = null;
  root.onchange = null;
  if (s.offersDay < 0) refreshOffers(s);
  startApp(root, s, startScreen);
}

startScreen();

// Offline-Unterstützung (nur im Produktions-Build)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* ohne Offline-Modus weiterspielen */ });
}
