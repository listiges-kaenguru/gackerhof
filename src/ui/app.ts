// Benutzeroberfläche: Kopfzeile, Hinweise, Schnellaktionen, Navigation, Panels, Dialoge.
import * as A from '../game/actions';
import {
  BREEDS, CONDITIONS, DIFFICULTIES, DISPOSAL_COST, HATS, HEALTH_CHECK_COST, ITEM, ITEMS, MS_PER_MINUTE, PASTURE_WARN, PERSONALITIES,
  PLOTS, SEASON_NAMES, SHOP_CATS, SHOW_FEE, SHOW_GRADES, SHOW_MAX, SUPPLIES, SUPPLY, type ItemDef, type ShopCat,
} from '../game/data';
import {
  age, ageText, albumKey, albumTotal, animalValue, breedLabel, daysText, butcherValue, chicks, coopCap, crowding, dayOfSeason, dead, diff, drinkerCap, eggCount,
  eggValue, euro, eventActive, feederCap, flock, foxProtection, frozen, has, hawkProtection, isDaytime, isNight, lightActive, living, lockedOut, marderSafe, maxInside, outsideAnimals, starFactors,
  pastureNow, ratSafe, runCap, season, sexKnown, stage, stageName, stars, year,
} from '../game/helpers';
import { gradeFor, showBasePoints, showCountdown, showProblem } from '../game/show';
import { advanceMinute, refreshOffers } from '../game/sim';
import { CHAPTERS, clearSave, exportSave, importSave, save } from '../game/state';
import type { Animal, Difficulty, GameState } from '../game/types';
import { portrait } from './art';
import { Scene, esc } from './scene';
import { tutorialStep } from './tutorial';
import { infoLinks, SOURCE_URL, WIKI_URL } from './links';

type Panel = 'hof' | 'shop' | 'markt' | 'tiere' | 'tier' | 'album' | 'lager' | 'mehr';
type MarketTab = 'kaufen' | 'verkaufen' | 'auftraege' | 'schau';
interface Modal { kind: 'report' | 'intro' | 'gameover' | 'help' | 'celebrate'; lines?: string[] }

export function startApp(root: HTMLElement, initial: GameState, onNewGame: () => void) {
  let s = initial;
  const ui = {
    panel: null as Panel | null,
    shopCat: 'gehege' as ShopCat,
    marketTab: 'kaufen' as MarketTab,
    /** Von wo das Album geöffnet wurde (für „Zurück“) */
    albumFrom: 'tiere' as Panel,
    animalId: null as number | null,
    modal: null as Modal | null,
    confirm: '' as string,
    confirmTimer: 0,
    lastSpeed: 1 as 1 | 2 | 4,
  };

  root.innerHTML = `
    <div class="app">
      <header class="hud"></header>
      <main class="stage">
        <div class="scene-host"></div>
        <div class="alerts" aria-live="polite"></div>
        <div class="banners" aria-live="polite"></div>
        <div class="goals-widget"></div>
        <div class="toasts" aria-live="polite"></div>
      </main>
      <div class="quickbar"></div>
      <nav class="tabs"></nav>
      <aside class="panel" hidden>
        <div class="panel-head"><button class="back" data-act="back" hidden aria-label="Zurück">‹</button><h2></h2><button class="close" data-act="close" aria-label="Schließen">✕</button></div>
        <div class="panel-body"></div>
      </aside>
      <div class="modal-wrap" hidden><div class="modal"></div></div>
      <div class="tut" hidden aria-live="polite">
        <div class="tut-bubble"><span class="tut-text"></span><button data-act="tut-off" aria-label="Tutorial-Pfeile ausblenden" title="Pfeile ausblenden">✕</button></div>
        <div class="tut-arrow" aria-hidden="true"></div>
      </div>
    </div>`;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const bannersEl = $('.banners');
  const goalsEl = $('.goals-widget');
  const stageEl = $('.stage');
  // Kapitel-Karte: gespeicherte Wahl des Spielers, sonst je nach Platz auf- oder zugeklappt
  const GOALS_KEY = 'gackerhof-goals-open';
  const storedGoals = (() => { try { return localStorage.getItem(GOALS_KEY); } catch { return null; } })();
  let goalsOpen = storedGoals ? storedGoals === '1' : null as boolean | null;
  const goalsDefault = () => stageEl.clientWidth >= 640 && stageEl.clientHeight >= 300;
  let lastGoalsDone = new Set(s.goals.filter(g => g.done).map(g => g.id));
  const hud = $('.hud'), alertsEl = $('.alerts'), toastsEl = $('.toasts'), quick = $('.quickbar'), tabs = $('.tabs');
  const panel = $('.panel'), panelTitle = $('.panel-head h2'), panelBody = $('.panel-body'), backBtn = $<HTMLButtonElement>('.back');
  const modalWrap = $('.modal-wrap'), modalEl = $('.modal');
  const scene = new Scene($('.scene-host'));

  if (s.day === 1 && s.hour === 7 && !s.log.length) ui.modal = { kind: 'intro' };

  /* ================================================================ */
  /* Rendering                                                         */
  /* ================================================================ */
  const cache: Record<string, string> = {};
  const setHtml = (el: HTMLElement, key: string, html: string) => {
    if (cache[key] !== html) { cache[key] = html; el.innerHTML = html; }
  };

  function renderHud() {
    const st = stars(s);
    const phaseIcon = isNight(s.hour) ? '🌙' : s.temperature >= 28 ? '🥵' : s.temperature <= 0 ? '❄️' : s.hour < 8 ? '🌅' : s.hour >= 18 ? '🌇' : '☀️';
    const speeds: [0 | 1 | 2 | 4, string, string][] = [[0, '⏸', 'Pause'], [1, '▶', 'Normal'], [2, '⏩', 'Schnell'], [4, '⏭', 'Sehr schnell']];
    setHtml(hud, 'hud', `
      <div class="hud-farm"><span class="farm-name">${esc(s.farmName)}</span><button class="stars" data-act="open:hof" title="Hof-Ruf: antippen für Details" aria-label="Hof-Ruf ${st} von 5 Sternen">${'★'.repeat(st)}<span class="off">${'★'.repeat(5 - st)}</span></button></div>
      <div class="hud-chips">
        <span class="chip money ${s.money < 20 ? 'low' : ''}" title="Geld">💰 ${euro(s.money)}</span>
        <span class="chip" title="Datum">📅 Tag ${dayOfSeason(s)} · ${SEASON_NAMES[season(s)]}${year(s) > 1 ? ` · J${year(s)}` : ''}</span>
        <span class="chip" title="Uhrzeit und Wetter">${phaseIcon} ${String(s.hour).padStart(2, '0')}:${String(Math.floor((s.minute ?? 0) / 10) * 10).padStart(2, '0')} · ${s.temperature} °C</span>
      </div>
      <div class="speed" role="group" aria-label="Spieltempo">
        ${speeds.map(([v, icon, label]) => `<button data-act="speed:${v}" class="${s.speed === v ? 'on' : ''}" title="${label}" aria-label="${label}">${icon}</button>`).join('')}
        <button data-act="help" title="Hilfe" aria-label="Hilfe">?</button>
      </div>`);
  }

  function computeAlerts() {
    const out: { icon: string; text: string; act: string; kind: 'bad' | 'warn' | 'info' | 'good' }[] = [];
    const f = flock(s);
    const ch = chicks(s);
    if (!s.equip.fence) out.push({ icon: '🛒', text: 'Tipp: Zuerst einen Zaun kaufen', act: 'open:shop:gehege', kind: 'info' });
    else if (!s.equip.coop) out.push({ icon: '🛒', text: 'Tipp: Jetzt einen Stall kaufen', act: 'open:shop:stall', kind: 'info' });
    else if (!s.equip.drinker) out.push({ icon: '🛒', text: 'Tipp: Eine Tränke aufstellen', act: 'open:shop:wasser', kind: 'info' });
    else if (!s.equip.feeder) out.push({ icon: '🛒', text: 'Tipp: Eine Futterstelle kaufen', act: 'open:shop:futter', kind: 'info' });
    else if (!living(s).length && !dead(s).length) out.push({ icon: '🐣', text: 'Tipp: Hühner auf dem Markt kaufen', act: 'open:markt', kind: 'info' });
    for (const a of dead(s)) out.push({ icon: '🕊️', text: `${a.name} entsorgen (${DISPOSAL_COST} €)`, act: `animal:${a.id}`, kind: 'bad' });
    if (s.foxAlertDay === s.day && f.length) out.push({ icon: '🦊', text: `Fuchs in der Nähe! Schutz ${Math.round(foxProtection(s) * 100)} %`, act: 'open:hof', kind: 'bad' });
    if (s.hawkAlertDay === s.day && s.hour < 15 && outsideAnimals(s).length) out.push({ icon: '🦅', text: 'Habicht! Hühner reinlocken', act: 'lure', kind: 'bad' });
    const locked = lockedOut(s);
    const outNight = !isDaytime(s.hour) && s.doorOpen ? outsideAnimals(s).filter(x => !x.dead) : [];
    if (outNight.length && (s.hour >= 21 || s.hour < 6)) out.push({ icon: '🏠', text: `Stall voll: ${outNight.length} schlafen draußen`, act: 'open:hof', kind: 'bad' });
    const ords = s.orders ?? [];
    if (ords.length) out.push({ icon: '📋', text: `${ords.length} Kundenauftr${ords.length > 1 ? 'äge' : 'ag'}`, act: 'open:markt:auftraege', kind: 'good' });
    if (locked.length && !(s.hawkAlertDay === s.day && s.hour < 15)) out.push({ icon: '🚪', text: `${locked.length === 1 ? `${locked[0].name} ist` : `${locked.length} Hühner sind`} ausgesperrt: reinlocken`, act: 'lure', kind: isDaytime(s.hour) ? 'warn' : 'bad' });
    if (s.marderAlertDay === s.day && !marderSafe(s)) out.push({ icon: '🦡', text: 'Marder in der Nähe!', act: 'open:shop:fuchs', kind: 'bad' });
    if (f.length && isNight(s.hour) && s.doorOpen && !has(s, 'autoklappe')) out.push({ icon: '🚪', text: 'Klappe ist nachts offen!', act: 'door', kind: 'bad' });
    if (s.equip.drinker && (f.length || ch.length) && frozen(s)) out.push({ icon: '🧊', text: 'Tränke gefroren', act: 'water', kind: 'bad' });
    else if (s.equip.drinker && (f.length || ch.length) && s.water < drinkerCap(s) * 0.25) out.push({ icon: '💧', text: s.water <= 0.01 ? 'Tränke leer!' : 'Tränke fast leer', act: 'water', kind: s.water <= 0.01 ? 'bad' : 'warn' });
    if (s.equip.feeder && f.length && s.feed < feederCap(s) * 0.2) {
      const stock = (s.inventory.koerner ?? 0) + (s.inventory.legemehl ?? 0);
      out.push(stock > 0
        ? { icon: '🌾', text: s.feed <= 0.01 ? 'Futter leer!' : 'Futter fast leer', act: 'feed', kind: s.feed <= 0.01 ? 'bad' : 'warn' }
        : { icon: '🛒', text: 'Kein Futter mehr im Lager', act: 'open:shop:verbrauch', kind: 'bad' });
    }
    if (ch.length && (s.inventory.kuekenstarter ?? 0) < 0.3) out.push({ icon: '🐣', text: 'Kükenstarter fehlt', act: 'open:shop:verbrauch', kind: 'bad' });
    if (ch.some(c => c.motherId == null) && !has(s, 'kuekenstation')) out.push({ icon: '🥶', text: 'Küken frieren: Kükenstation', act: 'open:shop:ausbau', kind: 'bad' });
    const sick = living(s).filter(a => a.conditions.length);
    if (sick.length) out.push({ icon: CONDITIONS[sick[0].conditions[0].id].emoji, text: `${sick.length === 1 ? `${sick[0].name} ist krank` : `${sick.length} Tiere krank`}`, act: sick.length === 1 ? `animal:${sick[0].id}` : 'open:tiere', kind: 'warn' });
    const nest = eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs;
    if (nest) out.push({ icon: '🥚', text: `${nest} Ei${nest > 1 ? 'er' : ''} im Nest`, act: 'collect', kind: 'good' });
    if (f.length && !s.doorOpen && !locked.length && s.hour >= 7 && s.hour < 19 && !(eventActive(s, 'stallpflicht') && !has(s, 'netz')) && s.hawkAlertDay !== s.day) out.push({ icon: '🚪', text: 'Klappe öffnen', act: 'door', kind: 'info' });
    if (s.equip.coop && s.cleanliness < 35) out.push({ icon: '🧹', text: 'Stall ausmisten', act: 'clean', kind: 'warn' });
    if (crowding(s) > 1) out.push({ icon: '😤', text: 'Zu eng! Mehr Platz schaffen', act: 'open:hof', kind: 'warn' });
    for (const a of living(s).filter(x => x.broodyUntil >= s.day)) out.push({ icon: '🪺', text: `${a.name} ist brütig`, act: `animal:${a.id}`, kind: 'good' });
    if (eventActive(s, 'stallpflicht')) out.push({ icon: '📢', text: 'Stallpflicht!', act: 'door', kind: 'warn' });
    const showIn = showCountdown(s);
    if (showIn != null && showIn >= 0 && (s.show!.entries.length || living(s).some(a => !showProblem(s, a)))) {
      const n = s.show!.entries.length;
      out.push({ icon: '🏆', text: `${showIn === 0 ? 'Heute' : showIn === 1 ? 'Morgen' : `In ${showIn} Tagen`}: Geflügelschau${n ? ` (${n} angemeldet)` : ''}`, act: 'open:markt:schau', kind: 'good' });
    }
    if (f.length && s.equip.fence && pastureNow(s) < PASTURE_WARN) {
      out.push(has(s, 'wechselweide')
        ? { icon: '🌱', text: 'Weide abgegrast: wechseln', act: 'pasture', kind: 'warn' }
        : { icon: '🪱', text: 'Auslauf abgegrast: mehr Würmer', act: 'open:hof', kind: 'info' });
    }
    if ((season(s) === 'herbst' || season(s) === 'winter') && !has(s, 'stalllicht') && s.equip.coop && f.filter(a => a.sex === 'henne').length >= 3) {
      out.push({ icon: '💡', text: 'Kurze Tage: Stalllicht bringt mehr Eier', act: 'open:shop:ausbau', kind: 'info' });
    }
    if (eventActive(s, 'dorffest')) out.push({ icon: '🎪', text: 'Dorffest: Eier teuer!', act: 'open:markt:verkaufen', kind: 'good' });
    return out;
  }

  /** Fortschritt für Ziele mit Zählern, z. B. „4/10“ */
  function goalProgress(id: string): [number, number] | null {
    const p: Record<string, [number, number]> = {
      huehner3: [flock(s).length, 3],
      eier10: [s.stats.eggsSold, 10],
      eier150: [s.stats.eggsSold, 150],
      tiere10: [living(s).length, 10],
      fuchs50: [Math.round(foxProtection(s) * 100), 50],
      sterne3: [stars(s), 3],
    };
    const v = p[id];
    return v ? [Math.min(v[0], v[1]), v[1]] : null;
  }
  const GOAL_ACT: Record<string, string> = {
    zaun: 'open:shop:gehege', stall: 'open:shop:stall', traenke: 'open:shop:wasser', futter: 'open:shop:futter',
    huehner3: 'open:markt', eier10: 'open:markt:verkaufen', hahn: 'open:markt', schlupf: 'open:lager', aufzucht: 'open:tiere',
    fuchs50: 'open:shop:fuchs', hofladen: 'open:shop:ausbau', sterne3: 'open:hof', eier150: 'open:markt:verkaufen', tiere10: 'open:markt',
  };

  function renderGoals() {
    const ch = CHAPTERS[s.chapter];
    if (!ch || !s.goals.length) { setHtml(goalsEl, 'goals', ''); return; }
    const open = goalsOpen ?? goalsDefault();
    const done = s.goals.filter(g => g.done).length;
    const total = s.goals.length;
    const fresh = s.goals.filter(g => g.done && !lastGoalsDone.has(g.id)).map(g => g.id);
    const nextId = s.goals.find(g => !g.done)?.id;
    if (!open) {
      setHtml(goalsEl, 'goals', `<button class="goals-pill ${fresh.length ? 'flash' : ''}" data-act="goals-toggle" aria-expanded="false" title="Ziele des Kapitels anzeigen">
        📖 <b>${done}/${total}</b><span class="pill-label"> Ziele</span></button>`);
      return;
    }
    setHtml(goalsEl, 'goals', `<section class="goals-card" aria-label="Ziele von Kapitel ${s.chapter}">
      <header><span>📖 <b>Kapitel ${s.chapter}</b> · ${esc(ch.title)}</span>
        <button class="goals-min" data-act="goals-toggle" aria-expanded="true" aria-label="Ziele ausblenden" title="Ausblenden">–</button></header>
      <div class="goals-bar"><b style="width:${(done / total) * 100}%"></b></div>
      <ul>${s.goals.map(g => {
        const pr = !g.done ? goalProgress(g.id) : null;
        return `<li class="${g.done ? 'done' : ''} ${g.id === nextId ? 'next' : ''} ${fresh.includes(g.id) ? 'fresh' : ''}">
          <button data-act="${GOAL_ACT[g.id] ?? 'tab:mehr'}">${g.done ? '✅' : g.id === nextId ? '👉' : '⬜'} <span>${g.text}${pr ? ` <small>(${pr[0]}/${pr[1]})</small>` : ''}</span></button></li>`;
      }).join('')}</ul>
      <footer>🎁 Belohnung: ${ch.reward} € · Auch am Schaukasten auf dem Hof</footer>
    </section>`);
    lastGoalsDone = new Set(s.goals.filter(g => g.done).map(g => g.id));
  }

  function renderAlerts() {
    const list = computeAlerts().slice(0, 6);
    setHtml(alertsEl, 'alerts', list.map(a =>
      `<button class="alert ${a.kind}" data-act="${a.act}"><span>${a.icon}</span>${esc(a.text)}</button>`).join(''));
  }

  function renderQuick() {
    const nest = eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs;
    const wPct = s.equip.drinker ? Math.round((s.water / drinkerCap(s)) * 100) : 0;
    const fPct = s.equip.feeder ? Math.round((s.feed / feederCap(s)) * 100) : 0;
    const bar = (p: number) => `<i class="lvl"><b style="width:${Math.max(0, Math.min(100, p))}%" class="${p < 25 ? 'low' : ''}"></b></i>`;
    setHtml(quick, 'quick', `
      <button data-act="collect" ${nest ? 'class="hot"' : ''} title="Eier sammeln (E)"><span class="ico">🥚</span><span>Eier${nest ? ` <b class="count">${nest}</b>` : ''}</span></button>
      <button data-act="water" title="Wasser auffüllen (W)" ${s.equip.drinker ? '' : 'disabled'}><span class="ico">💧</span><span>Wasser</span>${s.equip.drinker ? bar(frozen(s) ? 0 : wPct) : ''}</button>
      <button data-act="feed" title="Futter auffüllen (F)" ${s.equip.feeder ? '' : 'disabled'}><span class="ico">🌾</span><span>Futter</span>${s.equip.feeder ? bar(fPct) : ''}</button>
      <button data-act="door" title="Hühnerklappe (K)" ${s.equip.coop ? '' : 'disabled'} class="${s.doorOpen ? '' : 'closed'}"><span class="ico">🚪</span><span>${s.doorOpen ? 'Klappe zu' : 'Klappe auf'}</span></button>
      <button data-act="clean" title="Ausmisten (M)" ${s.equip.coop ? '' : 'disabled'}><span class="ico">🧹</span><span>Ausmisten</span>${s.equip.coop ? bar(s.cleanliness) : ''}</button>`);
  }

  function renderTabs() {
    const sick = living(s).filter(a => a.conditions.length).length + dead(s).length;
    const t: [Panel, string, string, string][] = [
      ['hof', '🏡', 'Hof', ''], ['shop', '🛒', 'Shop', ''], ['markt', '🐣', 'Markt', ''],
      ['tiere', '🐔', 'Tiere', sick ? `<b class="dot">${sick}</b>` : ''], ['lager', '📦', 'Lager', ''], ['mehr', '☰', 'Mehr', s.goals.some(g => g.done) ? '' : ''],
    ];
    setHtml(tabs, 'tabs', t.map(([id, icon, label, badge]) => {
      const on = ui.panel === id || (id === 'tiere' && ui.panel === 'tier') || (id === ui.albumFrom && ui.panel === 'album');
      return `<button data-act="tab:${id}" class="${on ? 'on' : ''}"><span class="ico">${icon}${badge}</span><span>${label}</span></button>`;
    }).join(''));
  }

  function renderPanel(force = false) {
    if (!ui.panel) {
      panel.hidden = true;
      root.querySelector('.app')!.classList.remove('has-panel');
      return;
    }
    // Nicht neu zeichnen, während getippt wird
    if (!force && panel.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') return;
    panel.hidden = false;
    root.querySelector('.app')!.classList.add('has-panel');
    const titles: Record<Panel, string> = {
      hof: '🏡 Hofübersicht', shop: '🛒 Landhandel Meier', markt: '🐣 Geflügelmarkt', tiere: '🐔 Deine Tiere',
      tier: '🐔 Steckbrief', album: '📒 Hühner-Album', lager: '📦 Lager', mehr: '☰ Mehr',
    };
    panelTitle.textContent = titles[ui.panel];
    backBtn.hidden = ui.panel !== 'tier' && ui.panel !== 'album';
    const html = {
      hof: panelHof, shop: panelShop, markt: panelMarket, tiere: panelAnimals, tier: panelAnimal, album: panelAlbum, lager: panelStore, mehr: panelMore,
    }[ui.panel]();
    if (cache.panel !== html || force) {
      const top = panelBody.scrollTop;
      const chipScroll = panelBody.querySelector('.cats')?.scrollLeft ?? 0;
      panelBody.innerHTML = html;
      cache.panel = html;
      panelBody.scrollTop = top;
      const cats = panelBody.querySelector('.cats');
      if (cats) cats.scrollLeft = chipScroll;
    }
  }

  /* ---------------- Bausteine ---------------- */
  const meter = (label: string, v: number, icon: string) =>
    `<div class="meter"><span class="m-label">${icon} ${label}</span><span class="m-bar"><b style="width:${Math.round(v)}%" class="${v < 25 ? 'bad' : v < 50 ? 'warn' : ''}"></b></span><span class="m-val">${Math.round(v)} %</span></div>`;
  const confirmBtn = (key: string, label: string, confirmLabel: string, cls = '') =>
    `<button class="btn ${cls} ${ui.confirm === key ? 'confirm' : ''}" data-act="${key}" data-confirm="1">${ui.confirm === key ? confirmLabel : label}</button>`;
  const kindOf = (a: Animal) => (stage(s, a) === 'kueken' ? 'chick' : a.sex === 'hahn' && stage(s, a) === 'erwachsen' ? 'rooster' : 'hen') as 'hen' | 'rooster' | 'chick';
  const pic = (a: Animal, deadPic = false) => portrait(a.breed, kindOf(a), deadPic, a.variant);
  /** Rasse mit Farbe; Küken zeigen ihre Farbe erst als Junghuhn */
  const breedOf = (a: Animal) => (stage(s, a) === 'kueken' ? BREEDS[a.breed].name : breedLabel(a.breed, a.variant));

  /* ---------------- Hof ---------------- */
  function panelHof(): string {
    const fp = Math.round(foxProtection(s) * 100), hp = Math.round(hawkProtection(s) * 100);
    const coop = s.equip.coop ? ITEM[s.equip.coop] : null;
    const st = stars(s);
    const f = flock(s);
    const factors = starFactors(s);
    const sign = (p: number) => (p > 0 ? `<b class="good">+${String(p).replace('.', ',')}</b>` : p < 0 ? `<b class="bad">${String(p).replace('.', ',')}</b>` : '<b class="muted">±0</b>');
    return `
      <section class="card">
        <h3>⭐ Hof-Ruf: <span class="stars-big">${'★'.repeat(st)}<span class="off">${'★'.repeat(5 - st)}</span></span></h3>
        <p class="muted">Jeder Hof startet mit 3 Sternen. Gute Haltung bringt Pluspunkte, Probleme kosten Sterne.</p>
        ${factors.length ? `<table class="stars-table">${factors.map(x => `<tr class="${x.points < 0 ? 'neg' : x.points >= x.max && x.max > 0 ? 'pos' : ''}">
          <td>${x.points < 0 ? '⚠️' : x.points >= x.max && x.max > 0 ? '✅' : '➖'} ${x.label}</td><td>${x.value}</td><td>${sign(x.points)}</td></tr>
          ${x.points < x.max ? `<tr class="tip"><td colspan="3">💡 ${x.tip}</td></tr>` : ''}`).join('')}</table>`
        : '<p>Sobald Tiere auf dem Hof leben, wird der Ruf berechnet.</p>'}
        <p><b>Was bringen Sterne?</b></p>
        <ul class="perks">
          <li>🏪 Der Hofladen verkauft pro Tag 2 + 3 × Sterne Eier (jetzt ${2 + st * 3}).</li>
          <li>📋 Mehr Kundenaufträge, und sie zahlen besser (je Stern über 3 +10 %).</li>
          <li>🏆 Kapitel 3 verlangt mindestens 3 Sterne.</li>
        </ul>
      </section>
      <section class="card">
        <h3>🏠 Stall ${coop ? `<small>${coop.name}</small>` : ''}</h3>
        ${coop ? `
          <p>Plätze: <b>${f.length} / ${coopCap(s)}</b> ${f.length > coopCap(s) ? `<span class="bad">überbelegt! Höchstens ${maxInside(s)} passen hinein.</span>` : ''} · Auslauf: <b>${runCap(s) || '–'}</b> Plätze</p>
          ${meter('Sauberkeit', s.cleanliness, '🧹')}
          <p>🐔 Im Stall: <b>${f.filter(a => !a.outside).length}</b> · Im Auslauf: <b>${outsideAnimals(s).length}</b>${lockedOut(s).length ? ' <span class="bad">(ausgesperrt!)</span>' : ''}</p>
          <div class="row">
            <button class="btn" data-act="door">${s.doorOpen ? '🚪 Klappe schließen' : '🚪 Klappe öffnen'}</button>
            <button class="btn" data-act="lure" ${outsideAnimals(s).length ? '' : 'disabled'}>🌾 Hühner reinlocken</button>
            <button class="btn" data-act="clean">🧹 Ausmisten <small>(Einstreu: ${s.inventory.einstreu ?? 0})</small></button>
          </div>
          ${has(s, 'autoklappe') ? '<p class="muted">⚙️ Die automatische Klappe öffnet um 6 Uhr und schließt um 21 Uhr.</p>' : '<p class="muted">Zwischen 19 und etwa 20:45 Uhr gehen die Hühner nacheinander von selbst in den Stall. Erst danach die Klappe schließen, morgens wieder öffnen. Wer die Klappe zu früh schließt, sperrt Hühner aus!</p>'}
          ${has(s, 'stalllicht') ? `<div class="row between"><span>💡 Stalllicht: <b>${s.lightOn === false ? 'aus' : 'an'}</b> <small class="muted">${lightActive(s) ? '· leuchtet morgens und abends, mehr Eier' : s.lightOn === false ? '' : '· wirkt nur im Herbst und Winter'}</small></span>
            <button class="btn small" data-act="light">${s.lightOn === false ? 'Einschalten' : 'Ausschalten'}</button></div>` : ''}`
        : `<p>Noch kein Stall.</p><button class="btn primary" data-act="open:shop:stall">Zum Shop</button>`}
      </section>
      <section class="card">
        <h3>💧 Wasser & 🌾 Futter</h3>
        ${s.equip.drinker ? `${meter(`${ITEM[s.equip.drinker].name}: ${s.water.toFixed(1)} l`, (s.water / drinkerCap(s)) * 100, '💧')}${frozen(s) ? '<p class="bad">🧊 Die Tränke ist eingefroren!</p>' : ''}` : '<p>Keine Tränke.</p>'}
        ${s.equip.feeder ? meter(`${ITEM[s.equip.feeder].name}: ${s.feed.toFixed(1)} kg${s.feedType ? ` ${SUPPLY[s.feedType].name}` : ''}`, (s.feed / feederCap(s)) * 100, '🌾') : '<p>Keine Futterstelle.</p>'}
        <div class="row">
          <button class="btn" data-act="water" ${s.equip.drinker ? '' : 'disabled'}>💧 Auffüllen</button>
          <button class="btn" data-act="feed:koerner" ${s.equip.feeder && (s.inventory.koerner ?? 0) > 0 ? '' : 'disabled'}>🌾 Körner <small>(${(s.inventory.koerner ?? 0).toFixed(1)} kg)</small></button>
          <button class="btn" data-act="feed:legemehl" ${s.equip.feeder && (s.inventory.legemehl ?? 0) > 0 ? '' : 'disabled'}>🥣 Legemehl <small>(${(s.inventory.legemehl ?? 0).toFixed(1)} kg)</small></button>
        </div>
        ${ratSafe(s) || !s.equip.feeder ? '' : '<p class="muted">🐀 Ratten und Spatzen bedienen sich an der offenen Futterstelle.</p>'}
      </section>
      ${pastureCard()}
      <section class="card">
        <h3>🛡️ Schutz</h3>
        ${meter('Fuchs', fp, '🦊')}
        ${meter('Greifvögel', hp, '🦅')}
        <p>🦡 Marder: ${marderSafe(s) ? '<b class="good">Stall ist mardersicher</b>' : '<b class="bad">Stall nicht mardersicher</b>'}</p>
        <button class="btn" data-act="open:shop:fuchs">Schutz verbessern</button>
      </section>
      <section class="card">
        <h3>🌦️ Wetter</h3>
        <p>${s.temperature} °C · ${SEASON_NAMES[season(s)]}. ${s.temperature >= 28 ? 'Heiß: viel Wasser und Schatten nötig.' : s.temperature <= 0 ? 'Frost: Die Tränke friert ein, wenn sie nicht beheizt ist.' : ''}</p>
        <p class="muted">Grundstück: ${PLOTS[s.plot].emoji} ${PLOTS[s.plot].name} (Pacht ${PLOTS[s.plot].rent} € / Monat)</p>
      </section>`;
  }

  function pastureCard(): string {
    if (!s.equip.fence) return '';
    const p = s.pasture ?? [100, 100];
    const why = '<p class="muted">Scharrende Hühner zertreten das Gras, im Boden sammeln sich Wurmeier. Je abgegraster der Auslauf, desto öfter bekommen die Hühner Würmer.</p>';
    if (!has(s, 'wechselweide')) {
      return `<section class="card"><h3>🌱 Auslauf</h3>${meter('Weidezustand', p[0], '🌱')}${why}
        <p class="muted">💡 Mit einer <b>Wechselweide</b> nutzen die Hühner nur eine Hälfte, die andere erholt sich.</p>
        <button class="btn" data-act="open:shop:ausbau">Wechselweide im Shop</button></section>`;
    }
    const side = s.pastureSide ?? 0;
    const since = s.day - (s.pastureSwitchDay ?? s.day);
    return `<section class="card"><h3>🌱 Wechselweide</h3>
      ${meter(`Links ${side === 0 ? '(genutzt)' : '(ruht)'}`, p[0], '🌱')}${meter(`Rechts ${side === 1 ? '(genutzt)' : '(ruht)'}`, p[1], '🌱')}
      <div class="row between"><span class="muted">Gewechselt vor ${since} Tag${since === 1 ? '' : 'en'}</span><button class="btn" data-act="pasture">🔁 Weide wechseln</button></div>
      <p class="muted">Faustregel: wechseln, wenn die genutzte Hälfte unter ${PASTURE_WARN} % fällt. Die ruhende Hälfte erholt sich jeden Tag (im Winter langsamer).</p></section>`;
  }

  /* ---------------- Shop ---------------- */
  function itemMeta(it: ItemDef): string {
    const m: string[] = [];
    if (it.cap && it.slot === 'coop') m.push(`🏠 ${it.cap} Plätze`);
    if (it.cap && it.slot === 'drinker') m.push(`💧 ${it.cap} l`);
    if (it.cap && it.slot === 'feeder') m.push(`🌾 ${it.cap} kg`);
    if (it.run) m.push(`🌳 Auslauf ${it.run}`);
    if (it.fox) m.push(`🦊 +${Math.round(it.fox * 100)} %`);
    if (it.id === 'geraet') m.push('🦊 Netz → 85 %');
    if (it.hawk) m.push(`🦅 +${Math.round(it.hawk * 100)} %`);
    if (it.coopSafety) m.push(`🔒 ${Math.round(it.coopSafety * 100)} %`);
    if (it.marderSafe) m.push('🦡 mardersicher');
    if (it.ratSafe) m.push('🐀 rattensicher');
    if (it.frostSafe) m.push('❄️ frostsicher');
    if (it.power) m.push(`⚡ ${it.power.toFixed(2).replace('.', ',')} €/Tag`);
    return m.map(x => `<span class="tag">${x}</span>`).join('');
  }

  function panelShop(): string {
    const cats = `<div class="cats">${SHOP_CATS.map(c => `<button class="chipbtn ${ui.shopCat === c.id ? 'on' : ''}" data-act="shopcat:${c.id}">${c.emoji} ${c.name}</button>`).join('')}</div>`;
    let body = '';
    if (ui.shopCat === 'verbrauch') {
      const expensive = eventActive(s, 'futterteuer');
      body = `${expensive ? '<p class="warnbox">📦 Lieferengpass: Futter kostet gerade 50 % mehr.</p>' : ''}` + SUPPLIES.map(sp => {
        const price = A.supplyPrice(s, sp.id);
        return `<div class="item">
          <div class="item-ico">${sp.emoji}</div>
          <div class="item-main"><b>${sp.name}</b><p>${sp.desc}</p><span class="tag">Im Lager: ${fmtAmount(s.inventory[sp.id] ?? 0)} ${sp.unit}</span></div>
          <div class="item-buy">
            <button class="btn primary" data-act="supply:${sp.id}:1" ${s.money < price ? 'disabled' : ''}>${sp.amount} ${sp.unit === 'kg' ? 'kg' : '×'}<br><b>${euro(price)}</b></button>
            <button class="btn small" data-act="supply:${sp.id}:5" ${s.money < price * 5 ? 'disabled' : ''}>5× ${euro(price * 5)}</button>
          </div></div>`;
      }).join('');
    } else {
      const items = ITEMS.filter(i => i.cat === ui.shopCat && (!i.plot || i.plot === s.plot));
      body = items.map(it => {
        const ownedSlot = it.slot && s.equip[it.slot] === it.id;
        const owned = ownedSlot || (it.cosmetic ? s.cosmetics.includes(it.id) : !it.stack && s.extras.includes(it.id));
        const why = A.canBuy(s, it.id);
        const price = A.itemPrice(s, it.id);
        let action = '';
        if (owned) {
          if (it.cosmetic === 'hat') action = s.hat === it.id ? '<span class="owned">✔ Aufgesetzt</span>' : `<button class="btn" data-act="hat:${it.id}">Aufsetzen</button>`;
          else if (it.cosmetic) action = '<span class="owned">✔ Steht auf dem Hof</span>';
          else action = `<span class="owned">✔ Vorhanden</span>${confirmBtn(`sell:${it.id}`, `Verkaufen ${euro(it.price * 0.4)}`, 'Wirklich verkaufen?', 'small')}`;
        } else {
          const replace = it.slot && s.equip[it.slot] ? `<small>ersetzt ${ITEM[s.equip[it.slot]!].name} (−${euro(ITEM[s.equip[it.slot]!].price * 0.4)})</small>` : '';
          action = `<button class="btn primary" data-act="buy:${it.id}" ${why ? 'disabled' : ''}>${euro(price)}</button>${why && why !== 'Nicht genug Geld' ? `<small class="why">${why}</small>` : ''}${replace}`;
        }
        const stackInfo = it.stack ? `<span class="tag">Ausgebaut: ${s.runExtensions} / ${it.stack}</span>` : '';
        return `<div class="item ${owned ? 'is-owned' : ''}">
          <div class="item-main"><b>${it.name}</b><p>${it.desc}</p><div class="tags">${itemMeta(it)}${stackInfo}</div></div>
          <div class="item-buy">${action}</div></div>`;
      }).join('');
      if (ui.shopCat === 'gimmick') body += `<p class="muted">Gimmicks bringen keinen Vorteil. Sie sind nur zum Spaß da.</p>`;
    }
    return cats + `<div class="items">${body}</div>`;
  }

  /* ---------------- Markt ---------------- */
  function panelMarket(): string {
    const nOrders = (s.orders ?? []).length;
    const showIn = showCountdown(s);
    const tabsHtml = `<div class="seg"><button class="${ui.marketTab === 'kaufen' ? 'on' : ''}" data-act="mtab:kaufen">Kaufen</button><button class="${ui.marketTab === 'verkaufen' ? 'on' : ''}" data-act="mtab:verkaufen">Verkaufen</button><button class="${ui.marketTab === 'auftraege' ? 'on' : ''}" data-act="mtab:auftraege">Aufträge${nOrders ? ` <b class="count">${nOrders}</b>` : ''}</button><button class="${ui.marketTab === 'schau' ? 'on' : ''}" data-act="mtab:schau">Schau${showIn != null && showIn >= 0 ? ' <b class="count">!</b>' : ''}</button></div>`;
    const trend = s.eggPrice >= 0.55 ? '↑' : s.eggPrice <= 0.45 ? '↓' : '→';
    const info = `<p class="infobar">🥚 Eierpreis heute: <b>${euro(s.eggPrice)}</b> ${trend} · 🏠 Platz im Stall: <b>${Math.max(0, coopCap(s) - flock(s).length)}</b> frei</p>`;
    if (ui.marketTab === 'auftraege') return tabsHtml + panelOrders();
    if (ui.marketTab === 'schau') return tabsHtml + panelShow();
    if (ui.marketTab === 'kaufen') {
      const kindName = { brutei: 'Bruteier', kueken: 'Küken (unsortiert)', junghenne: 'Junghenne', legehenne: 'Legehenne „ca. 1–2 Jahre“', hahn: 'Hahn' };
      const kindIcon = (o: { kind: string; breed: keyof typeof BREEDS; variant?: string }) => o.kind === 'brutei' ? '🥚'
        : portrait(o.breed, o.kind === 'hahn' ? 'rooster' : o.kind === 'kueken' ? 'chick' : 'hen', false, o.variant);
      const sellers = [...new Set(s.offers.map(o => o.seller))];
      const next = 7 - (s.day - s.offersDay);
      return tabsHtml + info + (s.offers.length ? sellers.map(sel => `
        <section class="card"><h3>${sel}</h3>
        ${s.offers.filter(o => o.seller === sel).map(o => {
          const check = o.kind === 'legehenne'
            ? (o.checked
              ? `<span class="tag ${o.hiddenMites || (o.hiddenAge ?? 0) > 300 ? 'bad' : 'good'}">🔍 ${daysText(o.hiddenAge ?? 0)} alt, ${o.hiddenMites ? 'hat Milben!' : 'gesund'}</span>`
              : `<button class="btn small" data-act="check:${o.id}">🔍 Check ${HEALTH_CHECK_COST} €</button>`)
            : '';
          return `<div class="offer">
            <span class="offer-ico">${kindIcon(o)}</span>
            <div class="offer-main"><b>${kindName[o.kind]}</b> · ${breedLabel(o.breed, o.variant)}${s.album?.[albumKey(o.breed, o.variant)] ? '' : ' <span class="tag new">📒 neu</span>'}<br><small>${o.qty} verfügbar · ${euro(o.price)} pro Stück</small> ${check}</div>
            <div class="offer-buy">
              <button class="btn primary" data-act="offer:${o.id}:1" ${s.money < o.price ? 'disabled' : ''}>+1</button>
              ${o.qty > 1 ? `<button class="btn small" data-act="offer:${o.id}:${o.qty}" ${s.money < o.price * o.qty ? 'disabled' : ''}>Alle ${euro(o.price * o.qty)}</button>` : ''}
            </div></div>`;
        }).join('')}</section>`).join('') : '<p class="muted">Alles ausverkauft.</p>') +
        `<p class="muted">Neue Angebote in ${next} Tag${next === 1 ? '' : 'en'}. Jede Woche gibt es mindestens einen Hahn und Bruteier. Aus Bruteiern schlüpfen etwa zur Hälfte Hähne.</p>`;
    }
    const eggs = eggCount(s.eggs);
    const he = s.hatchEggs.length;
    const mist = s.inventory.mist ?? 0;
    return tabsHtml + info + `
      <section class="card"><h3>🥚 Eier</h3>
        <div class="row between"><span>${eggs} Speiseeier im Lager</span><button class="btn primary" data-act="sellEggs" ${eggs ? '' : 'disabled'}>Verkaufen ${euro(eggValue(s, s.eggs))}</button></div>
        ${he ? `<div class="row between"><span>${he} Bruteier</span><span class="row"><button class="btn" data-act="sellHatch:brut">Als Bruteier ${euro(A.hatchEggValue(s))}</button><button class="btn small" data-act="sellHatch:food">Als Speiseeier ${euro(A.hatchEggFoodValue(s))}</button></span></div>` : ''}
        ${mist ? `<div class="row between"><span>💩 ${mist} Sack Mist</span><button class="btn" data-act="sellManure">Als Dünger ${euro(mist * 2)}</button></div>` : ''}
        ${!eggs && !he && !mist ? '<p class="muted">Nichts zu verkaufen. Eier zuerst im Nest einsammeln.</p>' : ''}
      </section>
      <section class="card"><h3>🐔 Tiere verkaufen</h3>
        ${living(s).length ? living(s).map(a => `<div class="offer">
          <span class="offer-ico">${pic(a)}</span>
          <div class="offer-main"><b>${esc(a.name)}</b> · ${stageName(s, a)}<br><small>${breedOf(a)} · ${ageText(s, a)}</small></div>
          <div class="offer-buy">${confirmBtn(`sellAnimal:${a.id}`, `Markt ${euro(animalValue(s, a))}`, 'Wirklich?', 'small')}
            ${stage(s, a) !== 'kueken' ? confirmBtn(`butcher:${a.id}`, `Schlachter ${euro(butcherValue(s, a))}`, 'Wirklich?', 'small') : ''}</div>
        </div>`).join('') : '<p class="muted">Keine Tiere.</p>'}
      </section>`;
  }

  function panelOrders(): string {
    const list = s.orders ?? [];
    if (!list.length) return `<p class="muted">Gerade keine Aufträge. Kundschaft meldet sich von selbst, je besser dein Hof-Ruf, desto öfter.</p>
      <p class="muted">Es gibt Aufträge für Eier, Junghennen und Suppenhühner (ältere Hennen ab 2 Jahren). Sie zahlen deutlich mehr als der Markt.</p>`;
    const eggsHave = eggCount(s.eggs) + s.hatchEggs.length;
    return list.map(o => {
      const what = o.kind === 'eier' ? `🥚 ${o.qty} Eier` : o.kind === 'junghenne' ? `🐔 ${o.qty} Junghenne${o.qty > 1 ? 'n' : ''}` : `🍲 ${o.qty} Suppenh${o.qty > 1 ? 'ühner' : 'uhn'} (Henne ab 2 Jahren)`;
      const left = o.dueDay - s.day;
      let have: string, can: boolean;
      if (o.kind === 'eier') {
        can = eggsHave >= o.qty;
        have = `Im Lager: ${eggsHave} Eier`;
      } else {
        const animals = A.orderAnimals(s, o.kind);
        can = animals.length >= o.qty;
        have = can ? `Liefert: ${animals.slice(0, o.qty).map(a => esc(a.name)).join(', ')}` : `Passende Tiere: ${animals.length}`;
      }
      const market = o.kind === 'eier' ? o.qty * s.eggPrice : 0;
      return `<section class="card order">
        <h3>${esc(o.customer)}</h3>
        <p><b>${what}</b> für <b class="good">${euro(o.reward)}</b>${market ? ` <small class="muted">(Markt: ca. ${euro(market)})</small>` : ''}</p>
        <p class="${left <= 1 ? 'bad' : 'muted'}">⏳ ${left <= 0 ? 'Nur noch heute!' : `Noch ${left} Tag${left === 1 ? '' : 'e'}`} · ${have}</p>
        ${o.kind === 'eier' ? confirmBtn(`order:${o.id}`, 'Liefern', 'Wirklich liefern?', can ? 'primary' : '') : confirmBtn(`order:${o.id}`, 'Liefern', 'Tiere wirklich abgeben?', can ? 'primary' : '')}
      </section>`;
    }).join('');
  }

  /* ---------------- Tiere ---------------- */
  function panelAnimals(): string {
    const l = living(s);
    const hens = l.filter(a => a.sex === 'henne' && sexKnown(s, a)).length;
    const roosters = l.filter(a => a.sex === 'hahn' && sexKnown(s, a)).length;
    const ch = chicks(s).length;
    const sorted = [...dead(s), ...l.sort((a, b) => (b.conditions.length - a.conditions.length) || (a.health - b.health))];
    return `
      <p class="infobar">🐔 ${hens} Hennen · 🐓 ${roosters} Hähne · 🐥 ${ch} Küken · 🏠 ${flock(s).length}/${coopCap(s)} im Stall</p>
      <button class="btn album-btn" data-act="album">📒 Hühner-Album <b>${Object.keys(s.album ?? {}).length}/${albumTotal()}</b></button>
      ${roosters > Math.max(1, Math.ceil(hens / 8)) ? '<p class="warnbox">🐓 Zu viele Hähne! Empfohlen ist 1 Hahn pro 8–12 Hennen, sonst gibt es Rangkämpfe.</p>' : ''}
      ${sorted.length ? `<div class="animal-list">${sorted.map(a => animalRow(a)).join('')}</div>` : '<p class="muted">Noch keine Tiere. Auf dem Geflügelmarkt gibt es Junghennen, Hähne, Küken und Bruteier.</p><button class="btn primary" data-act="open:markt">Zum Markt</button>'}
      ${s.incubator.length ? `<p class="muted">🥚 ${s.incubator.length} Eier im Brutapparat (Lager).</p>` : ''}`;
  }

  function animalRow(a: Animal): string {
    const icons = a.dead ? '🕊️' : a.conditions.map(c => CONDITIONS[c.id].emoji).join('') + (a.water < 30 ? '💧' : '') + (a.food < 30 ? '🌾' : '') + (a.broodyUntil >= s.day ? '🪺' : '') + (a.broodingUntil > s.day ? '🥚' : '');
    const h = a.dead ? 0 : a.health;
    return `<button class="animal-row ${a.dead ? 'is-dead' : ''}" data-act="animal:${a.id}">
      ${pic(a, a.dead)}
      <span class="ar-main"><b>${esc(a.name)}</b> <small>${a.dead ? `† ${a.deathCause}` : `${stageName(s, a)} · ${breedOf(a)} · ${ageText(s, a)}`}</small>
        ${a.dead ? '' : `<span class="mini"><i style="width:${h}%" class="${h < 40 ? 'bad' : h < 70 ? 'warn' : ''}"></i></span>`}</span>
      <span class="ar-icons">${icons}</span></button>`;
  }

  function panelAnimal(): string {
    const a = s.animals.find(x => x.id === ui.animalId);
    if (!a) return '<p>Das Tier ist nicht mehr da.</p>';
    if (a.dead) {
      return `<div class="pet-head">${pic(a, true)}<div><h3>${esc(a.name)}</h3><p>${breedOf(a)} · ${a.deathCause} (Tag ${a.deathDay})</p></div></div>
        <p class="muted">Ein totes Tier kann nicht mehr geschlachtet werden. Die Tierkörperbeseitigung muss bezahlt werden. Bis dahin steigt das Krankheitsrisiko für die anderen Tiere.</p>
        <button class="btn primary" data-act="dispose:${a.id}">🕊️ Entsorgen lassen (${DISPOSAL_COST} €)</button>`;
    }
    const st = stage(s, a);
    const conds = a.conditions.map(c => {
      const def = CONDITIONS[c.id];
      return `<div class="cond"><b>${def.emoji} ${def.name}</b> <small>(${Math.round(c.severity)} %) ${def.sign}</small>
        <div class="row">${def.cures.map(cu => {
          const inStock = cu.id !== 'tierarzt' && (s.inventory[cu.id] ?? 0) >= 1;
          const price = cu.vetPrice != null ? cu.vetPrice * diff(s).vetFactor : A.supplyPrice(s, cu.id);
          return `<button class="btn" data-act="treat:${a.id}:${c.id}:${cu.id}">${cu.label} <small>${inStock ? '(im Lager)' : euro(price)}</small></button>`;
        }).join('')}</div></div>`;
    }).join('');
    const broody = a.broodyUntil >= s.day
      ? `<div class="goodbox">🪺 ${esc(a.name)} ist brütig! ${s.hatchEggs.length ? `<button class="btn primary" data-act="brood:${a.id}">${Math.min(8, s.hatchEggs.length)} Bruteier unterlegen</button>` : 'Du hast keine Bruteier im Lager. Kauf welche auf dem Markt oder halte einen Hahn.'}</div>`
      : '';
    const brooding = a.broodingUntil > s.day ? `<div class="goodbox">🥚 Brütet ${a.broodEggs.length} Eier aus. Schlupf in ${a.broodingUntil - s.day} Tag(en).</div>` : '';
    const withdrawal = a.withdrawalUntil >= s.day ? `<p class="warnbox">💊 Medikamenten-Wartezeit bis Tag ${a.withdrawalUntil}: Eier werden entsorgt, Schlachten ist nicht erlaubt.</p>` : '';
    return `
      <div class="pet-head">${pic(a)}
        <div><h3>${esc(a.name)} <button class="link" data-act="rename:${a.id}" aria-label="Umbenennen">✏️</button></h3>
        <p>${breedOf(a)} · ${sexKnown(s, a) ? (a.sex === 'henne' ? '♀ Henne' : '♂ Hahn') : 'Geschlecht und Farbe noch unklar'} · ${ageText(s, a)}</p>
        <p class="muted">${stageName(s, a)} · Persönlichkeit: ${PERSONALITIES[a.personality]}</p></div></div>
      ${broody}${brooding}${withdrawal}
      ${meter('Hunger', a.food, '🌾')}${meter('Durst', a.water, '💧')}${meter('Gesundheit', a.health, '❤️')}${meter('Wohlbefinden', a.wellbeing, '😊')}
      ${conds ? `<section class="card warn"><h3>Krankheiten</h3>${conds}</section>` : ''}
      <p>⚖️ ${a.weight.toFixed(2).replace('.', ',')} kg ${a.sex === 'henne' && st === 'erwachsen' ? `· 🥚 ${a.eggsLaid} Eier gelegt` : ''}</p>
      ${a.history.length ? `<p class="muted">📜 ${a.history.map(esc).join(' · ')} · seit Tag ${a.arrivedDay} auf dem Hof</p>` : ''}
      <p class="muted">${BREEDS[a.breed].desc}</p>
      <div class="row">
        ${confirmBtn(`sellAnimal:${a.id}`, `Verkaufen ${euro(animalValue(s, a))}`, 'Wirklich verkaufen?')}
        ${st !== 'kueken' ? confirmBtn(`butcher:${a.id}`, `Zum Schlachter ${euro(butcherValue(s, a))}`, 'Wirklich zum Schlachter?') : ''}
      </div>
      <p class="muted small">Beim Schlachter gibt es Gewicht × Kilopreis abzüglich Gebühr. Kranke Tiere und Tiere in der Wartezeit werden nicht angenommen.</p>`;
  }

  /* ---------------- Geflügelschau ---------------- */
  function panelShow(): string {
    const sh = s.show;
    const trophies = s.trophies ?? [];
    const prizes = SHOW_GRADES.filter(g => g.prize).map(g => `${g.grade} (${g.min}) ${g.prize * (sh?.level ?? 1)} €`).join(' · ');
    let head = '<p class="muted">Die nächste Schau wird bald angekündigt.</p>';
    if (sh) {
      const left = sh.day - s.day;
      head = `<section class="card show-head"><h3>🏆 ${esc(sh.title)}</h3>
        <p>Tag ${sh.day} (${SEASON_NAMES[season({ ...s, day: sh.day })]}) · ${left < 0 ? 'Termin folgt' : left === 0 ? (s.hour < 12 ? '<b>heute um 12 Uhr</b>' : 'heute') : `in <b>${left} Tag${left === 1 ? '' : 'en'}</b>`}${sh.level === 2 ? ' · <b class="good">Landesschau: doppelte Preise</b>' : ''}</p>
        ${sh.announced ? `<p>Angemeldet: <b>${sh.entries.length}/${SHOW_MAX}</b> · Standgeld ${SHOW_FEE} € pro Tier</p>` : `<p class="muted">Die Anmeldung öffnet eine Woche vorher (Tag ${sh.day - 7}).${stars(s) >= 4 ? '' : ' Mit 4 Sternen Hof-Ruf geht es auf die Landesschau.'}</p>`}
        <p class="muted small">Preise: ${prizes} · 🏆 Pokal für das beste Tier mit 97 Punkten (+${50 * (sh.level ?? 1)} €)</p></section>`;
    }
    const candidates = living(s).filter(a => BREEDS[a.breed].showBreed && stage(s, a) === 'erwachsen');
    const rows = candidates.map(a => {
      const why = showProblem(s, a);
      const entered = !!sh?.entries.includes(a.id);
      const base = showBasePoints(s, a);
      const tips: string[] = [];
      if (a.health < 90) tips.push('Gesundheit unter 90 %');
      if (a.wellbeing < 80) tips.push('Wohlbefinden unter 80 % (Mehlwürmer helfen)');
      const full = a.sex === 'hahn' ? BREEDS[a.breed].weightRooster : BREEDS[a.breed].weightHen;
      if (a.weight / full < 0.95) tips.push('zu leicht');
      if (s.cleanliness < 60) tips.push('Stall ausmisten (Gefieder)');
      const btn = !sh?.announced ? '' : entered
        ? `<button class="btn small" data-act="show:${a.id}">Abmelden</button>`
        : `<button class="btn small primary" data-act="show:${a.id}" ${why || sh.entries.length >= SHOW_MAX || s.money < SHOW_FEE ? 'disabled' : ''}>Anmelden</button>`;
      return `<div class="offer ${entered ? 'entered' : ''}">
        <span class="offer-ico">${pic(a)}</span>
        <div class="offer-main"><b>${esc(a.name)}</b>${entered ? ' <span class="tag good">angemeldet</span>' : ''}<br><small>${breedOf(a)} · ${ageText(s, a)}</small><br>
          ${why ? `<small class="bad">${why}</small>` : `<small>Prognose: <b>${base - 1}–${Math.min(97, base + 1)} Punkte</b> (${[...new Set([gradeFor(base - 1).name, gradeFor(Math.min(97, base + 1)).name])].join(' bis ')})</small>${tips.length ? `<br><small class="muted">💡 ${tips.join(' · ')}</small>` : ''}`}</div>
        <div class="offer-buy">${btn}</div></div>`;
    }).join('');
    const hybridsOnly = !candidates.length;
    const last = s.lastShow ? `<section class="card"><h3>📋 Letzte Schau: ${esc(s.lastShow.title)} <small>Tag ${s.lastShow.day}</small></h3>
      <ul class="stock">${s.lastShow.results.map(r => `<li><span>${r.trophy ? '🏆' : r.prize ? '🎀' : '📋'} ${esc(r.name)} <small class="muted">${breedLabel(r.breed, r.variant)}</small></span><b>${r.points} ${r.grade}${r.prize ? ` · ${r.prize} €` : ''}</b></li>`).join('')}</ul></section>` : '';
    const shelf = trophies.length ? `<section class="card"><h3>🏆 Pokalschrank (${trophies.length})</h3>
      <ul class="stock">${trophies.map(t => `<li><span>🏆 ${esc(t.title)}</span><b>${esc(t.animal)} <small class="muted">${breedLabel(t.breed, t.variant)}, Tag ${t.day}</small></b></li>`).join('')}</ul></section>` : '';
    return head + `<section class="card"><h3>🐔 Deine Rassetiere</h3>
      ${hybridsOnly ? '<p class="muted">Noch keine ausgewachsenen Rassetiere. Legehybriden sind auf Rasseschauen nicht zugelassen. Sussex, Marans, Brahma und Seidenhühner gibt es auf dem Markt oder aus Bruteiern.</p>' : rows}
      <p class="muted small">Die Preisrichter bewerten Gesundheit, Wohlbefinden, Gewicht, Alter (beste Jahre bis 2 Jahre) und sauberes Gefieder. Dazu kommt etwas Glück.</p></section>` + last + shelf;
  }

  /* ---------------- Hühner-Album ---------------- */
  function panelAlbum(): string {
    const album = s.album ?? {};
    const have = Object.keys(album).length;
    const total = albumTotal();
    return `<p class="infobar">📒 <b>${have}/${total}</b> Rassen und Farben entdeckt. Ein Eintrag zählt, sobald ein Tier dieser Farbe auf deinem Hof lebt. Küken zeigen ihre Farbe erst als Junghuhn.</p>
      <div class="goals-bar album-bar"><b style="width:${(have / total) * 100}%"></b></div>
      <p class="muted small">🎁 Alle Farben einer Rasse: 20 € · Ganzes Album: 100 €. Küken erben die Farbe von Mutter oder Vater, selten gibt es eine Überraschung.</p>
      ${(Object.keys(BREEDS) as (keyof typeof BREEDS)[]).map(b => {
        const def = BREEDS[b];
        const n = def.variants.filter(v => album[`${b}:${v.id}`]).length;
        return `<section class="card"><h3>${def.name} <small>${n}/${def.variants.length}${n === def.variants.length ? ' ✅' : ''}</small></h3>
          <div class="album-grid">${def.variants.map(v => {
            const e = album[`${b}:${v.id}`];
            return `<div class="album-card ${e ? '' : 'locked'}">${portrait(b, 'hen', false, v.id)}
              <b>${e ? v.name : '???'}</b><small>${e ? `seit Tag ${e.day} · ${esc(e.name)}` : 'noch nicht entdeckt'}</small></div>`;
          }).join('')}</div></section>`;
      }).join('')}`;
  }

  /* ---------------- Lager ---------------- */
  function panelStore(): string {
    const eggs = eggCount(s.eggs);
    const eggList = Object.entries(s.eggs).filter(([, n]) => n > 0).map(([b, n]) => `${n}× ${BREEDS[b as keyof typeof BREEDS].name}`).join(', ');
    const inc = has(s, 'brutapparat')
      ? `<section class="card"><h3>🥚 Brutapparat (${s.incubator.length}/12)</h3>
          ${s.incubator.length ? `<p>${groupIncubator()}</p>` : '<p class="muted">Leer.</p>'}
          <button class="btn primary" data-act="incubate" ${s.hatchEggs.length && s.incubator.length < 12 ? '' : 'disabled'}>Bruteier einlegen (${s.hatchEggs.length} im Lager)</button>
          <p class="muted">Nach 3 Tagen wird geschiert: Unbefruchtete Eier werden aussortiert. Schlupf nach 7 Tagen.</p></section>`
      : `<section class="card"><h3>🥚 Brüten</h3><p class="muted">Bruteier kannst du mit einem Brutapparat oder einer brütigen Henne (Glucke) ausbrüten.</p><button class="btn" data-act="open:shop:ausbau">Brutapparat im Shop</button></section>`;
    return `
      <section class="card"><h3>🥚 Eier</h3>
        <p>${eggs} Speiseeier${eggList ? ` (${eggList})` : ''} · Wert ${euro(eggValue(s, s.eggs))}</p>
        <p>${s.hatchEggs.length} Bruteier (mit Hahn gelegt, zum Ausbrüten oder Verkaufen)</p>
        <p><b>Zusammen: ${eggs + s.hatchEggs.length} Eier im Lager</b></p>
        <div class="row"><button class="btn" data-act="collect">Im Nest einsammeln</button><button class="btn primary" data-act="open:markt:verkaufen">Verkaufen</button></div>
        ${has(s, 'hofladen') ? `<p class="muted">🏪 Der Hofladen verkauft jeden Tag bis zu ${2 + stars(s) * 3} Eier zum 1,5-fachen Preis.</p>` : ''}
      </section>
      ${inc}
      <section class="card"><h3>📦 Vorräte</h3>
        <ul class="stock">${SUPPLIES.map(sp => `<li><span>${sp.emoji} ${sp.name}</span><b>${fmtAmount(s.inventory[sp.id] ?? 0)} ${sp.unit}</b></li>`).join('')}
        <li><span>💩 Mist</span><b>${s.inventory.mist ?? 0} Sack</b></li></ul>
        <div class="row">
          <button class="btn" data-act="treat" ${(s.inventory.mehlwuermer ?? 0) >= 1 && living(s).length ? '' : 'disabled'}>🪱 Mehlwürmer verstreuen</button>
          <button class="btn primary" data-act="open:shop:verbrauch">Nachkaufen</button>
        </div>
      </section>`;
  }
  function groupIncubator(): string {
    const by: Record<string, number> = {};
    for (const e of s.incubator) {
      const k = `${BREEDS[e.breed].name}, Schlupf in ${Math.max(0, e.hatchDay - s.day)} Tg.`;
      by[k] = (by[k] ?? 0) + 1;
    }
    return Object.entries(by).map(([k, n]) => `${n}× ${k}`).join('<br>');
  }

  /* ---------------- Mehr ---------------- */
  function panelMore(): string {
    const ch = CHAPTERS[s.chapter];
    const goals = ch
      ? `<h3>📖 Kapitel ${s.chapter}: ${ch.title}</h3><ul class="goals">${s.goals.map(g => `<li class="${g.done ? 'done' : ''}">${g.done ? '✅' : '⬜'} ${g.text}</li>`).join('')}</ul><p class="muted">Belohnung: ${ch.reward} € von Opa Heinz</p>`
      : '<h3>📖 Alle Kapitel geschafft!</h3><p>Du bist jetzt ein echter Hühnerprofi. Weitere Kapitel folgen in einer späteren Version.</p>';
    const hats = ['stroh', ...s.cosmetics.filter(c => c.startsWith('hut_'))];
    const lower = (['leicht', 'mittel'] as Difficulty[]).filter(d => ['leicht', 'mittel', 'schwer'].indexOf(d) < ['leicht', 'mittel', 'schwer'].indexOf(s.difficulty));
    return `
      <section class="card">${goals}</section>
      <section class="card"><h3>📒 Sammlung</h3>
        <div class="row"><button class="btn" data-act="album">📒 Hühner-Album ${Object.keys(s.album ?? {}).length}/${albumTotal()}</button>
        <button class="btn" data-act="open:markt:schau">🏆 Geflügelschau${(s.trophies ?? []).length ? ` · ${(s.trophies ?? []).length} Pokal${(s.trophies ?? []).length > 1 ? 'e' : ''}` : ''}</button></div>
      </section>
      <section class="card"><h3>💶 Finanzen</h3>
        <p>Einnahmen gesamt: <b class="good">${euro(s.stats.income)}</b> · Ausgaben gesamt: <b class="bad">${euro(s.stats.expenses)}</b></p>
        <p>Nächste Monatsabrechnung in ${30 - ((s.day - 1) % 30)} Tagen: Pacht ${PLOTS[s.plot].rent} € + Strom/Wasser ca. ${euro(s.pendingCosts)}</p>
        ${s.debt > 0 ? `<p>Schulden: <b class="bad">${euro(s.debt)}</b></p><button class="btn" data-act="repay">Zurückzahlen</button>` : ''}
        <p class="muted">${s.stats.eggsSold} Eier verkauft · ${s.stats.hatched} Küken geschlüpft · ${s.stats.deaths} Tiere gestorben, davon ${s.stats.predatorLosses} durch Raubtiere</p>
      </section>
      <section class="card"><h3>🎩 Dein Hut</h3>
        <div class="row">${hats.map(h => `<button class="chipbtn ${s.hat === h ? 'on' : ''}" data-act="hat:${h}">${HATS[h]}</button>`).join('')}<button class="chipbtn ${!s.hat ? 'on' : ''}" data-act="hat:none">Ohne</button></div>
        <p class="muted">Weitere Hüte gibt es im Shop unter „Gimmicks“.</p>
      </section>
      <section class="card"><h3>📜 Tagebuch</h3>
        <ul class="log">${s.log.slice(0, 80).map(l => `<li class="${l.kind}"><small>Tag ${l.day}, ${String(l.hour).padStart(2, '0')}:00</small> ${esc(l.text)}</li>`).join('')}</ul>
      </section>
      <section class="card"><h3>⚙️ Spiel</h3>
        <p>Schwierigkeit: <b>${DIFFICULTIES[s.difficulty].emoji} ${DIFFICULTIES[s.difficulty].name}</b></p>
        ${lower.length ? `<div class="row">${lower.map(d => confirmBtn(`lower:${d}`, `Auf ${DIFFICULTIES[d].name} senken`, 'Sicher? (kann nicht erhöht werden)', 'small')).join('')}</div>` : ''}
        <div class="row">
          <button class="btn" data-act="export">💾 Spielstand exportieren</button>
          <label class="btn">📂 Importieren<input type="file" accept="application/json,.json" data-import hidden></label>
          ${confirmBtn('newgame', '🆕 Neues Spiel', 'Wirklich? Der Hof geht verloren!', 'danger')}
        </div>
        <div class="row"><button class="btn small" data-act="${s.tutorialOff ? 'tut-on' : 'tut-off'}">${s.tutorialOff ? '👉 Tutorial-Pfeile einschalten' : '👉 Tutorial-Pfeile ausschalten'}</button></div>
        <p class="muted">Tastenkürzel: E Eier · W Wasser · F Futter · K Klappe · L Reinlocken · M Ausmisten · Leertaste Pause · 1/2/3 Tempo</p>
      </section>
      <p class="version">Gackerhof Version ${__APP_VERSION__}</p>
      <p class="version">Freie Software unter der <a href="${SOURCE_URL}/blob/HEAD/LICENSE" target="_blank" rel="noopener">AGPL-3.0-or-later</a> · <a href="${SOURCE_URL}" target="_blank" rel="noopener">Quelltext auf GitHub</a></p>
      <p class="version">${infoLinks()}</p>`;
  }

  /* ---------------- Dialoge ---------------- */
  function renderModal() {
    if (!ui.modal) { modalWrap.hidden = true; return; }
    modalWrap.hidden = false;
    let html = '';
    if (ui.modal.kind === 'intro') {
      html = `<div class="opa">👴</div><h2>Willkommen auf ${esc(s.farmName)}!</h2>
        <p>„Moin! Ich bin Opa Heinz. Ich halte seit 50 Jahren Hühner und helfe dir beim Start.“</p>
        <ol class="steps">
          <li>🛒 Kauf im <b>Shop</b> einen <b>Zaun</b>, einen <b>Stall</b>, eine <b>Tränke</b> und eine <b>Futterstelle</b>.</li>
          <li>🌾 Futter nicht vergessen: unter „Futter & Medizin“.</li>
          <li>🐣 Auf dem <b>Geflügelmarkt</b> gibt es Junghennen, Hähne, Küken und günstige Bruteier.</li>
          <li>🚪 Morgens die Klappe öffnen, <b>abends schließen</b>. Nachts kommt der Fuchs!</li>
          <li>🥚 Eier einsammeln und verkaufen. Achte auf die Hinweise oben links.</li>
          <li>👉 Gelbe Pfeile zeigen dir in den ersten Tagen, was als Nächstes dran ist.</li>
        </ol>
        <p class="muted">Du hast ${euro(s.money)}. Das ist nicht viel, also überleg gut, was du zuerst kaufst.</p>
        <button class="btn primary big" data-act="modal-ok">Los geht's!</button>`;
    } else if (ui.modal.kind === 'celebrate') {
      const c = s.celebrations[0];
      html = c ? `<div class="celebrate"><div class="burst">${c.emoji}</div><h2>${esc(c.title)}</h2>${c.lines.map(l => `<p>${esc(l)}</p>`).join('')}
        <button class="btn primary big" data-act="modal-ok">${s.celebrations.length > 1 ? 'Weiter' : 'Super!'}</button></div>` : '';
    } else if (ui.modal.kind === 'report') {
      html = `<div class="opa">🌅</div><h2>Morgenbericht</h2>${(ui.modal.lines ?? []).map(l => `<p>${esc(l)}</p>`).join('')}<button class="btn primary big" data-act="modal-ok">Weiter</button>`;
    } else if (ui.modal.kind === 'gameover') {
      html = `<div class="opa">😢</div><h2>Der Hof muss aufgeben</h2>
        <p>Kein Geld und keine Tiere mehr. Nach ${s.day} Tagen ist Schluss.</p>
        <p>${s.stats.eggsSold} Eier verkauft · ${s.stats.hatched} Küken geschlüpft.</p>
        <p>Opa Heinz meint: „Kopf hoch! Jeder fängt mal klein an. Nächstes Mal klappt's.“</p>
        <button class="btn primary big" data-act="newgame-now">Nochmal versuchen</button>`;
    } else if (ui.modal.kind === 'help') {
      html = `<h2>So funktioniert's</h2>
        <ul class="steps">
          <li>⏱️ 1 Spieltag dauert 3 Minuten. Mit ⏩ und ⏭ läuft die Zeit schneller, mit ⏸ hältst du sie an.</li>
          <li>🚪 Zwischen 19 und etwa 20:45 Uhr gehen die Hühner nacheinander in den Stall. Schließ die Klappe erst, wenn alle drin sind (Zähler am Stall), sonst sperrst du einzelne aus. Mit „Reinlocken“ holst du sie jederzeit mit etwas Futter herein.</li>
          <li>🏠 In den Stall passen höchstens 120 % seiner Plätze. Überzählige Hühner schlafen draußen, und Überbelegung macht krank.</li>
          <li>⭐ Der Hof-Ruf (Sterne oben) steigt mit gesunden, zufriedenen Tieren, Platz und Sauberkeit. Antippen zeigt die Details.</li>
          <li>🐔 Tippe auf ein Tier für seinen Steckbrief. Symbole über den Tieren zeigen Probleme: 💧 Durst, 🌾 Hunger, 🐜 Milben, 🤧 Schnupfen, 🪱 Würmer.</li>
          <li>🥚 Tippe auf die Eier am Stall, die Tränke oder den Futtertrog für schnelle Aktionen.</li>
          <li>🦊 Fuchs, 🦅 Habicht und 🦡 Marder kündigen sich immer an. Reagiere schnell!</li>
          <li>💊 Krankheiten früh behandeln. Manche Medikamente haben eine Wartezeit.</li>
          <li>🕊️ Gestorbene Tiere müssen kostenpflichtig entsorgt werden.</li>
          <li>💾 Das Spiel speichert automatisch. Geschlossen ruht der Hof.</li>
        </ul>
        <p class="muted">📖 Alles ganz genau, mit allen Preisen und Werten: die <a href="${WIKI_URL}anleitung/" target="_blank" rel="noopener">Anleitung im Gackerhof-Wiki</a>.</p>
        <button class="btn primary big" data-act="modal-ok">Verstanden</button>`;
    }
    if (cache.modal !== html) { modalEl.innerHTML = html; cache.modal = html; }
  }

  /* ---------------- Tutorial-Pfeile ---------------- */
  const tutEl = $('.tut'), tutText = $('.tut-text');
  let tutId = '';
  let tutLast = 0;
  let tutTarget: Element | null = null;
  /** Ist das Element zu sehen und nicht von Panel, Dialog oder Hinweisen verdeckt? */
  const visibleEl = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    // In der Szene zählt jeder Treffer auf die Szene (Gruppen haben Lücken zwischen ihren Formen)
    return hit === el || el.contains(hit) || (!!el.closest('.scene') && !!hit.closest('.scene'));
  };
  function positionTutorial(force = false) {
    const now = performance.now();
    if (!force && now - tutLast < 120) return;
    tutLast = now;
    const step = ui.modal ? null : tutorialStep(s);
    let target: Element | null = null;
    if (step) {
      if (step.id !== tutId) {
        tutId = step.id;
        // Im Hochformat die Szene so verschieben, dass das Ziel im Bild ist
        const inScene = step.targets.map(sel => root.querySelector(sel)).find(el => el?.closest('.scene'));
        if (inScene) scene.reveal(inScene);
      }
      for (const sel of step.targets) {
        target = [...root.querySelectorAll(sel)].find(visibleEl) ?? null;
        if (target) break;
      }
    } else tutId = '';
    if (tutTarget !== target) {
      tutTarget?.classList.remove('tut-target');
      target?.classList.add('tut-target');
      tutTarget = target;
    }
    if (!step || !target) { tutEl.hidden = true; return; }
    tutText.textContent = step.text;
    tutEl.hidden = false;
    // Bei offenem Panel und Ziel außerhalb davon nur den Pfeil zeigen, damit nichts verdeckt wird
    tutEl.classList.toggle('compact', !panel.hidden && !panel.contains(target) && getComputedStyle(panel).position === 'fixed');
    const r = target.getBoundingClientRect();
    const below = r.top < 150;
    tutEl.classList.toggle('below', below);
    const w = tutEl.offsetWidth, h = tutEl.offsetHeight;
    const cx = r.left + r.width / 2;
    const left = Math.max(8, Math.min(innerWidth - w - 8, cx - w / 2));
    tutEl.style.left = `${left}px`;
    tutEl.style.top = `${below ? r.bottom + 2 : r.top - h - 2}px`;
    tutEl.style.setProperty('--ax', `${Math.max(16, Math.min(w - 16, cx - left))}px`);
  }

  /** Auffälliges Banner für erreichte Ziele */
  function showBanner(goals: string[]) {
    const el = document.createElement('button');
    el.className = 'banner';
    el.innerHTML = `<span class="medal">🏅</span><span><b>${goals.length > 1 ? `${goals.length} Ziele erreicht!` : 'Ziel erreicht!'}</b><br>${goals.map(esc).join('<br>')}</span>`;
    el.addEventListener('click', () => el.remove());
    bannersEl.append(el);
    while (bannersEl.children.length > 2) bannersEl.firstElementChild!.remove();
    setTimeout(() => el.classList.add('out'), 6500);
    setTimeout(() => el.remove(), 7200);
  }

  function toast(text: string, kind: 'info' | 'good' | 'warn' | 'bad' = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    toastsEl.prepend(el);
    while (toastsEl.children.length > 3) toastsEl.lastElementChild!.remove();
    setTimeout(() => el.classList.add('out'), kind === 'bad' ? 6500 : 3200);
    setTimeout(() => el.remove(), kind === 'bad' ? 7100 : 3800);
  }

  /* ================================================================ */
  /* Aktionen                                                          */
  /* ================================================================ */
  function result(r: A.Result) {
    toast(r.msg, r.ok ? 'good' : 'warn');
    refreshAll();
  }

  function openPanel(p: Panel, sub?: string) {
    ui.panel = p;
    ui.confirm = '';
    if (p === 'shop' && sub) ui.shopCat = sub as ShopCat;
    if (p === 'markt' && sub) ui.marketTab = sub as MarketTab;
    renderPanel(true);
    panelBody.scrollTop = 0;
    renderTabs();
  }

  function handle(actStr: string, el: HTMLElement) {
    const [cmd, a1, a2, a3] = actStr.split(':');
    if (el.dataset.confirm && ui.confirm !== actStr) {
      ui.confirm = actStr;
      clearTimeout(ui.confirmTimer);
      ui.confirmTimer = window.setTimeout(() => { ui.confirm = ''; renderPanel(true); }, 3500);
      renderPanel(true);
      return;
    }
    ui.confirm = '';
    switch (cmd) {
      case 'tab':
        if (a1 === 'hof' && ui.panel === 'hof') { ui.panel = null; refreshAll(); }
        else if (ui.panel === a1 || (a1 === 'tiere' && ui.panel === 'tier')) { ui.panel = null; refreshAll(); }
        else openPanel(a1 as Panel);
        return;
      case 'open':
        if (a1 === 'stall') return openPanel('hof');
        return openPanel(a1 as Panel, a2);
      case 'close': ui.panel = null; return refreshAll();
      case 'back': return openPanel(ui.panel === 'album' ? ui.albumFrom : 'tiere');
      case 'album':
        if (ui.panel && ui.panel !== 'album') ui.albumFrom = ui.panel === 'tier' ? 'tiere' : ui.panel;
        return openPanel('album');
      case 'pasture': return result(A.switchPasture(s));
      case 'light': return result(A.toggleLight(s));
      case 'show': return result(A.toggleShowEntry(s, Number(a1)));
      case 'tut-off': return result(A.setTutorial(s, false));
      case 'tut-on': return result(A.setTutorial(s, true));
      case 'speed': {
        const v = Number(a1) as 0 | 1 | 2 | 4;
        if (v) ui.lastSpeed = v as 1 | 2 | 4;
        s.speed = v;
        return renderHud();
      }
      case 'help': ui.modal = { kind: 'help' }; return renderModal();
      case 'goals-toggle':
        goalsOpen = !(goalsOpen ?? goalsDefault());
        try { localStorage.setItem(GOALS_KEY, goalsOpen ? '1' : '0'); } catch { /* egal */ }
        return renderGoals();
      case 'modal-ok':
        if (ui.modal?.kind === 'report') s.report = null;
        if (ui.modal?.kind === 'celebrate') s.celebrations.shift();
        ui.modal = s.celebrations.length ? { kind: 'celebrate' } : null;
        return renderModal();
      case 'collect': return result(A.collectEggs(s));
      case 'water': return result(A.refillWater(s));
      case 'feed': return result(A.refillFeed(s, a1 as 'koerner' | 'legemehl' | undefined));
      case 'door': return result(A.toggleDoor(s));
      case 'lure': return result(A.lureIn(s));
      case 'clean': return result(A.cleanCoop(s));
      case 'treat':
        if (a1) return result(A.treat(s, Number(a1), a2 as never, a3));
        return result(A.giveTreat(s));
      case 'shopcat': ui.shopCat = a1 as ShopCat; renderPanel(true); panelBody.scrollTop = 0; return;
      case 'mtab': ui.marketTab = a1 as MarketTab; renderPanel(true); panelBody.scrollTop = 0; return;
      case 'buy': return result(A.buyItem(s, a1));
      case 'sell': return result(A.sellItem(s, a1));
      case 'supply': return result(A.buySupply(s, a1, Number(a2)));
      case 'hat': return result(A.wearHat(s, a1 === 'none' ? null : a1));
      case 'offer': return result(A.buyOffer(s, Number(a1), Number(a2)));
      case 'check': return result(A.healthCheck(s, Number(a1)));
      case 'sellEggs': return result(A.sellEggs(s));
      case 'sellHatch': return result(A.sellHatchEggs(s, a1 === 'food'));
      case 'sellManure': return result(A.sellManure(s));
      case 'order': return result(A.fulfillOrder(s, Number(a1)));
      case 'animal': ui.animalId = Number(a1); return openPanel('tier');
      case 'dispose': { const r = A.disposeBody(s, Number(a1)); if (r.ok) ui.panel = 'tiere'; return result(r); }
      case 'sellAnimal': { const r = A.sellAnimal(s, Number(a1)); if (r.ok && ui.panel === 'tier') ui.panel = 'tiere'; return result(r); }
      case 'butcher': { const r = A.butcher(s, Number(a1)); if (r.ok && ui.panel === 'tier') ui.panel = 'tiere'; return result(r); }
      case 'rename': {
        const an = s.animals.find(x => x.id === Number(a1));
        const name = prompt('Neuer Name:', an?.name ?? '');
        if (name) result(A.rename(s, Number(a1), name));
        return;
      }
      case 'brood': return result(A.setUnderHen(s, Number(a1)));
      case 'incubate': return result(A.incubate(s, 12));
      case 'repay': return result(A.repayDebt(s));
      case 'lower': return result(A.lowerDifficulty(s, a1 as Difficulty));
      case 'export': {
        const blob = new Blob([exportSave(s)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gackerhof-${s.farmName.replace(/\W+/g, '_')}-tag${s.day}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return toast('Spielstand gespeichert.', 'good');
      }
      case 'newgame':
      case 'newgame-now':
        clearSave();
        stop();
        onNewGame();
        return;
    }
  }

  // Alle Listener außerhalb der App-Elemente (root, window, document) hängen an diesem Signal,
  // damit sie nach „Neues Spiel“ nicht mehr auf das alte Spiel wirken
  const listeners = new AbortController();
  const signal = listeners.signal;
  root.addEventListener('click', e => {
    const el = (e.target as Element).closest<HTMLElement | SVGElement>('[data-act],[data-animal]');
    if (!el) return;
    if (el instanceof HTMLButtonElement && el.disabled) return;
    const act = el.dataset.act ?? `animal:${el.dataset.animal}`;
    handle(act, el as HTMLElement);
  }, { signal });
  root.addEventListener('change', e => {
    const input = e.target as HTMLInputElement;
    if (!input.matches('[data-import]') || !input.files?.[0]) return;
    input.files[0].text().then(txt => {
      const loaded = importSave(txt);
      if (!loaded) return toast('Diese Datei ist kein gültiger Spielstand.', 'bad');
      s = loaded;
      if (s.offersDay < 0) refreshOffers(s);
      save(s);
      ui.panel = null;
      toast('Spielstand geladen.', 'good');
      refreshAll();
    });
  }, { signal });
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map: Record<string, string> = { e: 'collect', w: 'water', f: 'feed', k: 'door', m: 'clean', l: 'lure' };
    if (map[k]) { handle(map[k], document.body); e.preventDefault(); }
    else if (k === ' ') { s.speed = s.speed ? 0 : ui.lastSpeed; renderHud(); e.preventDefault(); }
    else if (k === '1' || k === '2' || k === '3') { const v = ([1, 2, 4] as const)[Number(k) - 1]; ui.lastSpeed = v; s.speed = v; renderHud(); }
    else if (k === 'escape') { if (ui.modal) handle('modal-ok', document.body); else { ui.panel = null; refreshAll(); } }
  };
  window.addEventListener('keydown', onKey, { signal });

  // Panel am Handy (unten eingeblendet) an der Kopfzeile nach unten wischen zum Schließen
  const panelHead = $('.panel-head');
  let dragY: number | null = null;
  panelHead.addEventListener('pointerdown', e => {
    if (getComputedStyle(panel).position !== 'fixed' || (e.target as Element).closest('button')) return;
    dragY = e.clientY;
    panelHead.setPointerCapture(e.pointerId);
  });
  panelHead.addEventListener('pointermove', e => {
    if (dragY == null) return;
    const dy = Math.max(0, e.clientY - dragY);
    panel.style.transform = dy ? `translateY(${dy}px)` : '';
  });
  const endDrag = (e: PointerEvent) => {
    if (dragY == null) return;
    const dy = e.clientY - dragY;
    dragY = null;
    panel.style.transform = '';
    if (e.type === 'pointerup' && dy > 70) { ui.panel = null; refreshAll(); }
  };
  panelHead.addEventListener('pointerup', endDrag);
  panelHead.addEventListener('pointercancel', endDrag);

  /* ================================================================ */
  /* Spielschleife                                                     */
  /* ================================================================ */
  // Während ein Finger/Mausknopf gedrückt ist, nichts ersetzen – sonst gehen Klicks verloren
  let pointerDown = false;
  let dirty = false;
  root.addEventListener('pointerdown', () => { pointerDown = true; }, { signal });
  const release = () => {
    if (!pointerDown) return;
    pointerDown = false;
    if (dirty) setTimeout(refreshAll, 0);
  };
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });

  function refreshAll() {
    if (pointerDown) { dirty = true; return; }
    dirty = false;
    scene.refresh(s);
    renderHud();
    renderAlerts();
    renderGoals();
    renderQuick();
    renderTabs();
    renderPanel();
    renderModal();
    positionTutorial(true);
  }

  const flockSig = () => s.animals.map(a => (a.outside ? 1 : 0)).join('') + s.doorOpen;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let running = true;
  let lastSavedDay = s.day;

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(250, now - last);
    last = now;
    const speed = ui.modal || document.hidden ? 0 : s.speed;
    let ticked = false;
    if (speed > 0 && !s.gameOver) {
      acc += dt * speed;
      let n = 0;
      const hourBefore = s.hour;
      const flockBefore = flockSig();
      while (acc >= MS_PER_MINUTE && n < 360) {
        acc -= MS_PER_MINUTE;
        advanceMinute(s);
        n++;
      }
      if (n && !pointerDown) renderHud();
      // Volle Aktualisierung bei Stundenwechsel oder wenn Hühner rein-/rausgehen
      ticked = s.hour !== hourBefore || flockSig() !== flockBefore;
    }
    if (ticked) {
      for (const t of s.toasts.splice(0)) toast(t.text, t.kind);
      if (s.banners.length) showBanner(s.banners.splice(0));
      if (s.report && s.hour >= 6 && !ui.modal) ui.modal = { kind: 'report', lines: s.report };
      if (s.celebrations.length && !ui.modal) ui.modal = { kind: 'celebrate' };
      if (s.gameOver) ui.modal = { kind: 'gameover' };
      if (s.day !== lastSavedDay) { save(s); lastSavedDay = s.day; }
      refreshAll();
    }
    scene.tick(s, dt, speed);
    if (!pointerDown) positionTutorial();
    raf = requestAnimationFrame(frame);
  }
  const onHide = () => { if (document.hidden) save(s); };
  document.addEventListener('visibilitychange', onHide, { signal });
  window.addEventListener('pagehide', () => save(s), { signal });
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    listeners.abort();
    goalsObserver.disconnect();
  }

  // Ohne gespeicherte Wahl passt sich die Kapitel-Karte der Bildschirmgröße an
  const goalsObserver = new ResizeObserver(() => { if (goalsOpen === null) renderGoals(); });
  goalsObserver.observe(stageEl);

  refreshAll();
  raf = requestAnimationFrame(frame);
  // Für Tests und Fehlersuche im Browser
  (window as unknown as { gackerhof: unknown }).gackerhof = { get state() { return s; }, refresh: refreshAll, age: (a: Animal) => age(s, a) };
}

function fmtAmount(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
