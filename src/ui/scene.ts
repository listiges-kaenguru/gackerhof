// Der Hof als lebendige SVG-Szene. Statische Teile werden nur bei Änderungen neu gezeichnet,
// die Tiere bewegen sich in jedem Frame.
import { BREEDS, CONDITIONS } from '../game/data';
import {
  drinkerCap, eggCount, feederCap, frozen, has, headingIn, isDaytime, season, stage,
} from '../game/helpers';
import { chickFreezing } from '../game/sim';
import { CHAPTERS } from '../game/state';
import type { Animal, GameState } from '../game/types';
import {
  COOP_GEO, DEFS, INK, breedStyle, coopSvg, drinkerSvg, feederSvg, fenceSvg, pineSvg, playerSvg, treeSvg,
} from './art';

const NS = 'http://www.w3.org/2000/svg';
const YARD = { x0: 252, x1: 458, y0: 184, y1: 250 };
const STATION = { x0: 18, x1: 80, y0: 240, y1: 256 };
/** Durchgang zwischen Stall und Auslauf */
const GATE = { x: 236, y: 208 };
/** Hier drängen sich ausgesperrte Hühner nachts vor der Klappe */
const HUDDLE = { x0: 246, x1: 286, y0: 198, y1: 222 };

interface Sprite {
  el: SVGGElement;
  body: SVGGElement;
  icon: SVGTextElement;
  x: number; y: number; tx: number; ty: number;
  flip: boolean;
  wait: number;
  inside: boolean;
  kind: string;
}

export class Scene {
  svg: SVGSVGElement;
  private world: SVGGElement;
  private animalsLayer: SVGGElement;
  private front: SVGGElement;
  private overlay: SVGRectElement;
  private sig = '';
  private sprites = new Map<number, Sprite>();

  constructor(host: HTMLElement) {
    host.innerHTML = `
      <svg class="scene" viewBox="0 0 480 270" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Dein Hühnerhof">
        <defs>
          <linearGradient id="skygrad" x1="0" y1="0" x2="0" y2="1">
            <stop id="sky1" offset="0" stop-color="#7fcdf3"/><stop id="sky2" offset="1" stop-color="#d8f1fb"/>
          </linearGradient>
          ${DEFS}
        </defs>
        <rect x="-400" y="-700" width="1280" height="970" fill="url(#skygrad)"/>
        <g class="world" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></g>
        <g class="animals" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></g>
        <g class="front" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></g>
        <rect class="nightshade" x="-400" y="-700" width="1280" height="1000" fill="#0b1530" opacity="0" pointer-events="none"/>
      </svg>`;
    this.svg = host.querySelector('svg')!;
    this.world = this.svg.querySelector('.world')!;
    this.animalsLayer = this.svg.querySelector('.animals')!;
    this.front = this.svg.querySelector('.front')!;
    this.overlay = this.svg.querySelector('.nightshade')!;
    this.setupPan();
    new ResizeObserver(() => this.fitView()).observe(this.svg);
  }

  /* ---------------- Ausschnitt & Wischen (Hochformat) ---------------- */
  private viewW = 480;
  private panX = 0;
  private fitView() {
    const r = this.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const aspect = r.width / r.height;
    // Im Hochformat näher heranzoomen; der Rest des Hofs ist per Wischen erreichbar
    const w = aspect < 1.3 ? 350 : 480;
    if (w !== this.viewW) {
      this.viewW = w;
      this.panX = w < 480 ? 480 - w - 8 : 0;
    }
    this.applyView();
  }
  private applyView() {
    this.panX = Math.max(0, Math.min(480 - this.viewW, this.panX));
    this.svg.setAttribute('viewBox', `${this.panX.toFixed(1)} 0 ${this.viewW} 270`);
    this.svg.classList.toggle('pannable', this.viewW < 480);
    this.svg.dataset.edge = this.panX <= 0.5 ? 'left' : this.panX >= 480 - this.viewW - 0.5 ? 'right' : 'mid';
  }
  private setupPan() {
    let startX = 0, startPan = 0, dragging = false, down = false;
    this.svg.addEventListener('pointerdown', e => {
      if (this.viewW >= 480) return;
      down = true; dragging = false; startX = e.clientX; startPan = this.panX;
    });
    this.svg.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 8) dragging = true;
      if (dragging) {
        const r = this.svg.getBoundingClientRect();
        this.panX = startPan - dx * (this.viewW / r.width);
        this.applyView();
      }
    });
    const end = () => { down = false; };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    // Ein Wischen soll kein Antippen auslösen
    this.svg.addEventListener('click', e => {
      if (dragging) { e.stopPropagation(); e.preventDefault(); dragging = false; }
    }, true);
  }

  /** Statische Szene neu zeichnen, wenn sich etwas Sichtbares geändert hat */
  refresh(s: GameState) {
    const phase = s.hour >= 21 || s.hour < 5 ? 'n' : s.hour < 8 ? 'm' : s.hour < 18 ? 'd' : 'e';
    const sig = JSON.stringify([
      s.plot, season(s), s.temperature <= 0, s.equip, s.extras, s.runExtensions, s.cosmetics, s.hat, s.doorOpen,
      frozen(s), s.cleanliness < 35, Math.round(s.water / Math.max(1, drinkerCap(s)) * 8), Math.round(s.feed / Math.max(1, feederCap(s)) * 8),
      s.feedType, eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs, phase, s.incubator.length, s.farmName,
      this.insideCount(s), s.chapter, s.goals.map(g => g.done).join(),
    ]);
    if (sig !== this.sig) {
      this.sig = sig;
      this.drawWorld(s, phase);
    }
    const shade = { n: 0.5, m: 0.12, d: 0, e: 0.2 }[phase];
    this.overlay.setAttribute('opacity', String(shade));
    this.updateAnimalIcons(s);
  }

  private insideCount(s: GameState) {
    return s.animals.filter(a => !a.dead && stage(s, a) !== 'kueken' && !a.outside).length;
  }

  private drawWorld(s: GameState, phase: string) {
    const se = season(s);
    const snow = se === 'winter' && s.temperature <= 0;
    const ground = snow ? ['#eef3f6', '#d9e3ea'] : { fruehling: ['#8fd16a', '#6cb84f'], sommer: ['#7cc35a', '#5ea845'], herbst: ['#b5b85a', '#9aa04a'], winter: ['#a6b98a', '#8fa676'] }[se];
    const leaf = { fruehling: '#5fae45', sommer: '#4f9e3a', herbst: '#d9822b', winter: '#9aa58a' }[se];
    const sky = { n: ['#16224a', '#34477a'], m: ['#a9d8f0', '#ffe2b8'], d: ['#7fcdf3', '#d8f1fb'], e: ['#f59a6b', '#f8d6a0'] }[phase]!;
    this.svg.querySelector('#sky1')!.setAttribute('stop-color', sky[0]);
    this.svg.querySelector('#sky2')!.setAttribute('stop-color', sky[1]);

    const h = s.hour + 0.5;
    const sunT = Math.min(1, Math.max(0, (h - 5) / 16));
    const sunX = 40 + sunT * 400;
    const sunY = 70 - Math.sin(sunT * Math.PI) * 48;
    const celestial = phase === 'n'
      ? `<circle cx="400" cy="34" r="14" fill="#f4f1d0"/><circle cx="406" cy="30" r="12" fill="#16224a" stroke="none"/>
         <g fill="#fff" stroke="none">${[[60, 30], [120, 18], [180, 40], [260, 22], [330, 44], [450, 14], [30, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`
      : `<circle cx="${sunX}" cy="${sunY}" r="${s.temperature >= 28 ? 24 : 19}" fill="#ffd23f"/>`;
    const clouds = phase === 'n' ? '' : `<g fill="#fff" class="clouds"><ellipse cx="90" cy="38" rx="26" ry="11"/><ellipse cx="112" cy="31" rx="16" ry="11"/><ellipse cx="300" cy="52" rx="22" ry="9"/></g>`;

    // Grundstück
    let decor = '';
    if (s.plot === 'wald') {
      decor = pineSvg(30, 100, 1.1, '#2f6b3a') + pineSvg(70, 92, 0.9, '#3a7d45') + pineSvg(470, 96, 1, '#2f6b3a') + pineSvg(440, 104, 0.8, '#3a7d45') + pineSvg(230, 98, 0.7, '#3a7d45');
    } else if (s.plot === 'obst') {
      decor = treeSvg(42, 108, 0.9, leaf, se === 'sommer' || se === 'herbst') + treeSvg(430, 118, 0.75, leaf, se === 'sommer' || se === 'herbst');
    } else {
      decor = treeSvg(40, 110, 0.8, leaf, false);
    }
    const stream = s.plot === 'bach'
      ? `<path d="M-10 142 Q 80 132 160 142 T 330 140 T 500 138 V152 Q 400 156 330 150 T 160 154 T -10 154 Z" fill="${snow ? '#cfe6f2' : '#5bb3e6'}"/>
         <path d="M20 146 q 10 -3 20 0 M200 146 q 10 -3 20 0 M380 144 q 10 -3 20 0" fill="none" stroke="#fff" stroke-width="1.5"/>`
      : '';
    const pump = has(s, 'pumpe') ? `<g transform="translate(330 146)"><rect x="-8" y="-12" width="16" height="16" rx="3" fill="#5a6b78"/><path d="M8 -6 h6" stroke-width="3"/></g>` : '';

    const fence = fenceSvg(s.equip.fence, { geraet: has(s, 'geraet'), untergrab: has(s, 'untergrab'), flatterband: has(s, 'flatterband') });
    const coop = coopSvg(s.equip.coop, s.doorOpen, {
      wetterhahn: s.cosmetics.includes('wetterhahn'), licht: has(s, 'licht'), autoklappe: has(s, 'autoklappe'),
      gitter: has(s, 'mardergitter'), dirty: s.cleanliness < 35,
    });
    const geo = COOP_GEO[s.equip.coop ?? 'none'];
    const inside = this.insideCount(s);
    const badge = s.equip.coop && inside > 0
      ? `<g class="badge" data-act="open:stall"><rect x="${geo.badge[0] - 20}" y="${geo.badge[1] - 11}" width="40" height="18" rx="9" fill="#fff"/><text x="${geo.badge[0]}" y="${geo.badge[1] + 2}" text-anchor="middle" class="svgtxt">🐔 ${inside}</text></g>`
      : '';

    // Eier im Nest
    const nest = eggCount(s.nestEggs) + s.nestHatchEggs.length + s.blockedEggs;
    let eggs = '';
    if (nest > 0 && s.equip.coop) {
      const [nx, ny] = geo.nest;
      const shown = Math.min(nest, 6);
      eggs = `<g data-act="collect" class="clickable eggs">
        <ellipse cx="${nx + 8}" cy="${ny + 4}" rx="18" ry="6" fill="#d8b56a"/>
        ${Array.from({ length: shown }, (_, i) => `<ellipse cx="${nx - 4 + (i % 3) * 8}" cy="${ny - (i >= 3 ? 5 : 0)}" rx="3.6" ry="4.8" fill="${i % 2 ? '#fff6e6' : '#f1d9b5'}" stroke-width="1.4"/>`).join('')}
        <g class="pulse"><rect x="${nx + 14}" y="${ny - 22}" width="${nest > 9 ? 30 : 24}" height="16" rx="8" fill="#ffcf3f"/><text x="${nx + (nest > 9 ? 29 : 26)}" y="${ny - 10.5}" text-anchor="middle" class="svgtxt">${nest}</text></g>
      </g>`;
    }

    // Extras
    const extra: string[] = [];
    if (has(s, 'unterstand')) extra.push(`<g transform="translate(424 176)"><path d="M-20 0 L0 -14 L20 0 Z" fill="#8a6440"/><path d="M-16 0 V14 M16 0 V14" stroke="#8a6440" stroke-width="3"/><circle cx="-26" cy="14" r="9" fill="${leaf}"/><circle cx="26" cy="14" r="8" fill="${leaf}"/></g>`);
    if (has(s, 'sandbad')) extra.push(`<g transform="translate(404 244)"><ellipse rx="22" ry="7" fill="#e9d29a"/><ellipse rx="22" ry="7" fill="none" stroke="#a08050"/></g>`);
    if (has(s, 'netz')) extra.push(`<path d="M236 128 Q 354 104 472 128 M236 128 L236 162 M472 128 L472 162 ${Array.from({ length: 9 }, (_, i) => `M${236 + i * 29.5} ${128 - Math.sin((i / 8) * Math.PI) * 24} L${236 + i * 29.5} 162`).join(' ')}" fill="none" stroke="#6b7a86" stroke-width="1" opacity=".6"/>`);
    if (s.cosmetics.includes('zwerg')) extra.push(`<g transform="translate(128 260) scale(.85)"><path d="M-6 -16 L0 -32 L6 -16 Z" fill="#d33"/><circle cx="0" cy="-12" r="5" fill="#f2c29b"/><path d="M-5 -10 Q 0 -2 5 -10 Z" fill="#fff"/><rect x="-6" y="-6" width="12" height="10" rx="3" fill="#3d6fb5"/></g>`);
    if (s.cosmetics.includes('schaukel')) extra.push(`<g transform="translate(452 186)"><path d="M-14 -24 H14 M-12 -24 L-10 4 M12 -24 L10 4 M-10 4 H10" fill="none" stroke="#8a5a33" stroke-width="2"/></g>`);

    if (has(s, 'hofladen')) extra.push(`<g data-act="open:lager" class="clickable" transform="translate(52 196)"><rect x="-30" y="-24" width="60" height="30" rx="2" fill="#f0d2a0"/><path d="M-34 -24 L-28 -38 H28 L34 -24 Z" fill="#d9533f"/><path d="M-34 -24 h11 l-5 -14 M-12 -24 l-3 -14 M10 -24 l3 -14 M23 -24 l5 -14" fill="none" stroke="#fff" stroke-width="2"/><text x="0" y="-5" text-anchor="middle" class="svgtxt small">Eier 🥚</text></g>`);
    if (has(s, 'kuekenstation')) extra.push(`<g data-act="open:tiere" class="clickable"><rect x="8" y="232" width="80" height="30" rx="4" fill="#f4e6c8"/><path d="M14 232 V222 H82 V232" fill="none" stroke="#777" stroke-width="2"/><path d="M48 222 V226 M42 226 H54 L51 232 H45 Z" fill="#c0392b"/><ellipse cx="48" cy="242" rx="30" ry="8" fill="#ffb36b" opacity=".35" stroke="none"/></g>`);
    if (has(s, 'brutapparat')) extra.push(`<g data-act="open:lager" class="clickable" transform="translate(66 216)"><rect x="-14" y="-12" width="28" height="18" rx="4" fill="#eef2f4"/><rect x="-9" y="-8" width="18" height="9" rx="2" fill="#ffd28a"/>${s.incubator.length ? `<text x="17" y="2" class="svgtxt small">${s.incubator.length}🥚</text>` : ''}</g>`);
    extra.push(noticeBoard(s));
    if (snow) extra.push(`<g class="snow" fill="#fff" stroke="none">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 41) % 480}" cy="${(i * 67) % 160}" r="${1.5 + (i % 3)}" style="animation-delay:-${(i % 7) * 0.9}s"/>`).join('')}</g>`);

    this.world.innerHTML = `
      ${celestial}${clouds}
      <path d="M-400 118 Q 120 88 240 112 T 880 100 V300 H-400Z" fill="${ground[1]}"/>
      ${decor}${stream}${pump}
      <path d="M-400 156 Q 240 138 880 156 V300 H-400Z" fill="${ground[0]}"/>
      <path d="M60 230 l4 -9 l3 9 M180 250 l3 -8 l3 8 M240 168 l3 -7 l3 7 M300 236 l3 -8 l3 8 M400 214 l3 -7 l3 7" fill="none" stroke="${ground[1]}" stroke-width="2"/>
      ${fence.back}${extra.join('')}${coop}
      ${drinkerSvg(s.equip.drinker, s.water / Math.max(1, drinkerCap(s)), frozen(s), has(s, 'pumpe') || has(s, 'leitung'))}
      ${feederSvg(s.equip.feeder, s.feed / Math.max(1, feederCap(s)), s.feedType === 'legemehl')}
      ${eggs}${badge}`;
    const sign = s.cosmetics.includes('schild')
      ? `<g transform="translate(354 246)"><rect x="-44" y="-11" width="88" height="20" rx="4" fill="#f0d2a0"/><text x="0" y="3" text-anchor="middle" class="svgtxt small">${esc(s.farmName.slice(0, 22))}</text></g>`
      : '';
    this.front.innerHTML = `${fence.front}${sign}${playerSvg(s.hat, 106, 168)}`;
  }

  /* ---------------- Tiere ---------------- */
  private kindOf(s: GameState, a: Animal) {
    const st = stage(s, a);
    if (st === 'kueken') return 'chick';
    if (a.sex === 'hahn') return st === 'junghuhn' ? 'youngrooster' : 'rooster';
    return st === 'junghuhn' ? 'younghen' : 'hen';
  }

  private makeSprite(s: GameState, a: Animal, kind: string): Sprite {
    const el = document.createElementNS(NS, 'g');
    el.setAttribute('class', 'animal');
    el.dataset.animal = String(a.id);
    const body = document.createElementNS(NS, 'g');
    const rooster = kind === 'rooster' || kind === 'youngrooster';
    const sym = kind === 'chick' ? 'chick' : rooster ? 'rooster' : 'hen';
    const style = breedStyle(a.breed, rooster) + (kind === 'chick' ? ';--b:var(--cb)' : '');
    const fluffy = BREEDS[a.breed].fluffy && sym === 'hen';
    body.innerHTML = `<g class="bob" style="${style}">${fluffy ? '<use href="#sym-fluff"/>' : ''}<use href="#sym-${sym}"/></g>`;
    const hit = document.createElementNS(NS, 'circle');
    hit.setAttribute('r', kind === 'chick' ? '14' : '22');
    hit.setAttribute('cy', '-4');
    hit.setAttribute('fill', 'transparent');
    hit.setAttribute('stroke', 'none');
    const icon = document.createElementNS(NS, 'text');
    icon.setAttribute('class', 'animal-icon');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('y', kind === 'chick' ? '-16' : '-30');
    el.append(hit, body, icon);
    const start = this.spawnPoint(s, a);
    return { el, body, icon, x: start[0], y: start[1], tx: start[0], ty: start[1], flip: false, wait: Math.random() * 2000, inside: false, kind };
  }

  private spawnPoint(s: GameState, a: Animal): [number, number] {
    const st = stage(s, a);
    if (st === 'kueken' && has(s, 'kuekenstation')) return rndIn(STATION);
    if (a.outside) return rndIn(YARD);
    const geo = COOP_GEO[s.equip.coop ?? 'none'];
    return [geo.door[0] + (Math.random() - 0.5) * 40, geo.door[1] + 20 + Math.random() * 20];
  }

  private updateAnimalIcons(s: GameState) {
    for (const a of s.animals) {
      const sp = this.sprites.get(a.id);
      if (!sp) continue;
      sp.icon.textContent = iconFor(s, a);
    }
  }

  /** Jeder Frame: Tiere bewegen */
  /** dtMs: echte Zeit seit dem letzten Frame, speed: Spieltempo (0 = Pause) */
  tick(s: GameState, dtMs: number, speed = 1) {
    this.speed = speed;
    const seen = new Set<number>();
    for (const a of s.animals) {
      seen.add(a.id);
      const kind = this.kindOf(s, a);
      let sp = this.sprites.get(a.id);
      if (!sp || sp.kind !== kind) {
        sp?.el.remove();
        sp = this.makeSprite(s, a, kind);
        this.sprites.set(a.id, sp);
        this.animalsLayer.append(sp.el);
        sp.icon.textContent = iconFor(s, a);
      }
      this.moveSprite(s, a, sp, dtMs);
    }
    for (const [id, sp] of this.sprites) {
      if (!seen.has(id)) {
        sp.el.remove();
        this.sprites.delete(id);
      }
    }
    // Tiefensortierung: weiter unten = weiter vorne
    const ordered = [...this.sprites.values()].filter(sp => !sp.inside).sort((p, q) => p.y - q.y);
    let prev: Element | null = null;
    for (const sp of ordered) {
      if (prev ? sp.el.previousElementSibling !== prev : sp.el !== this.animalsLayer.firstElementChild) {
        if (prev) prev.after(sp.el); else this.animalsLayer.prepend(sp.el);
      }
      prev = sp.el;
    }
  }

  private speed = 1;

  private moveSprite(s: GameState, a: Animal, sp: Sprite, dtMs: number) {
    const st = stage(s, a);
    const scale = 0.82 * (sp.kind === 'chick' ? 1 : sp.kind.startsWith('young') ? 0.78 : 1) * (a.breed === 'brahma' && st === 'erwachsen' ? 1.12 : a.breed === 'seide' ? 0.85 : 1);
    if (a.dead) {
      sp.el.classList.add('dead');
      sp.el.style.display = '';
      sp.inside = false;
      sp.el.setAttribute('transform', `translate(${sp.x.toFixed(1)} ${sp.y.toFixed(1)})`);
      sp.body.setAttribute('transform', `rotate(${sp.flip ? -100 : 100}) scale(${scale})`);
      return;
    }
    const geo = COOP_GEO[s.equip.coop ?? 'none'];
    let region: typeof YARD | null = null;
    let wantInside = false;

    if (st === 'kueken') {
      const mother = a.motherId != null ? s.animals.find(m => m.id === a.motherId && !m.dead) : undefined;
      const msp = mother ? this.sprites.get(mother.id) : undefined;
      if (has(s, 'kuekenstation') && !mother) region = STATION;
      else if (msp && !msp.inside) {
        region = { x0: msp.x - 26, x1: msp.x + 26, y0: msp.y + 2, y1: msp.y + 14 };
      } else if (mother && s.equip.coop) wantInside = true;
      else region = { x0: 120, x1: 225, y0: 226, y1: 254 };
    } else if (!a.outside || headingIn(s, a)) {
      // drinnen oder auf dem Heimweg
      wantInside = !!s.equip.coop;
      if (!s.equip.coop) region = { x0: 125, x1: 225, y0: 220, y1: 254 };
    } else {
      // ausgesperrt in der Dämmerung/Nacht: dicht gedrängt vor dem Tor
      region = !isDaytime(s.hour) && !s.doorOpen ? HUDDLE : YARD;
    }
    // Wege zwischen Stall und Auslauf laufen im Spieltempo, damit sie rechtzeitig ankommen
    const transit = wantInside || (region === YARD && sp.x < GATE.x + 8);
    // Heimweg muss in die Laufzeit der Simulation passen (ca. 25 Spielminuten)
    const pace = this.speed <= 0 ? 0 : transit ? Math.max(1, this.speed) * 3.5 : Math.min(this.speed, 2);
    const speed = (sp.kind === 'chick' ? 0.035 : 0.025) * dtMs * pace;

    if (wantInside) {
      if (!sp.inside && sp.x > GATE.x - 4 && s.equip.fence) {
        // erst durchs Tor zurück zum Stall
        sp.tx = GATE.x - 10; sp.ty = GATE.y;
      } else if (!sp.inside) {
        sp.tx = geo.door[0]; sp.ty = geo.door[1] + 4;
        // erst verschwinden, wenn das Huhn laut Simulation wirklich drin ist (sonst wartet es an der Klappe)
        if (dist(sp) < 4 && !a.outside) {
          sp.inside = true;
        }
      }
    } else if (sp.inside && a.outside) {
      sp.inside = false;
      sp.x = geo.door[0]; sp.y = geo.door[1] + 6;
      const p = rndIn(region!);
      sp.tx = p[0]; sp.ty = p[1];
    } else if (region === YARD && sp.x < GATE.x + 8) {
      // vom Stall kommend: erst durchs Tor in den Auslauf
      if (sp.x < GATE.x - 12) { sp.tx = GATE.x - 8; sp.ty = GATE.y + (Math.random() - 0.5) * 6; }
      else { sp.tx = GATE.x + 18 + Math.random() * 30; sp.ty = GATE.y + (Math.random() - 0.5) * 20; }
    } else if (region) {
      const outOfRegion = sp.tx < region.x0 - 2 || sp.tx > region.x1 + 2 || sp.ty < region.y0 - 2 || sp.ty > region.y1 + 2;
      if (dist(sp) < 1.5 || outOfRegion) {
        sp.wait -= dtMs;
        if (sp.wait <= 0 || outOfRegion) {
          const p = rndIn(region);
          sp.tx = p[0]; sp.ty = p[1];
          sp.wait = 800 + Math.random() * 3500;
          if (Math.random() < 0.5) sp.body.classList.toggle('peck', true);
          else sp.body.classList.toggle('peck', false);
        }
      }
    }

    sp.el.style.display = sp.inside ? 'none' : '';
    if (sp.inside) return;
    const dx = sp.tx - sp.x, dy = sp.ty - sp.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const k = Math.min(1, speed / d);
      sp.x += dx * k;
      sp.y += dy * k;
      if (Math.abs(dx) > 0.5) sp.flip = dx > 0;
      sp.body.classList.toggle('walking', true);
    } else {
      sp.body.classList.toggle('walking', false);
    }
    sp.el.setAttribute('transform', `translate(${sp.x.toFixed(1)} ${sp.y.toFixed(1)})`);
    sp.body.setAttribute('transform', `scale(${sp.flip ? -scale : scale} ${scale})`);
  }
}

/** Schaukasten mit den Kapitel-Zielen – ein Tipp blendet die Ziel-Karte ein oder aus */
function noticeBoard(s: GameState): string {
  const ch = CHAPTERS[s.chapter];
  const goals = s.goals;
  const done = goals.filter(g => g.done).length;
  const rows = goals.map((g, i) => {
    const y = 109 + i * Math.min(6, 30 / Math.max(1, goals.length));
    return `<rect x="326" y="${y - 3}" width="4" height="4" rx=".8" fill="#fff" stroke-width=".8"/>
      ${g.done ? `<path d="M326.5 ${y - 1} l1.5 1.5 l3 -4" fill="none" stroke="#2f7d4f" stroke-width="1.4"/>` : ''}
      <path d="M333 ${y - 1} H${g.done ? 360 : 372 - (i % 3) * 6}" fill="none" stroke="${g.done ? '#9fc79a' : '#b8ab96'}" stroke-width="1.6"/>`;
  }).join('');
  return `<g class="clickable notice" data-act="goals-toggle" aria-label="Schaukasten mit den Kapitel-Zielen">
    <path d="M328 140 V164 M382 140 V164" stroke="#8a5a33" stroke-width="4"/>
    <rect x="316" y="86" width="78" height="56" rx="3" fill="#a0683d"/>
    <path d="M311 88 L355 72 L399 88 Z" fill="#7a3b2e"/>
    <rect x="321" y="91" width="68" height="46" rx="2" fill="#fbf3dc"/>
    ${ch ? `<text x="355" y="101" text-anchor="middle" class="svgtxt small">Kapitel ${s.chapter}</text>${rows}`
      : `<text x="355" y="118" text-anchor="middle" class="svgtxt small">🏆 Alles geschafft!</text>`}
    <rect x="321" y="91" width="68" height="46" rx="2" fill="#cfe9f7" opacity=".25" stroke-width="1.5"/>
    ${ch ? `<g class="${done ? 'pulse' : ''}"><circle cx="392" cy="88" r="10" fill="#ffcf3f"/>
      <text x="392" y="91.5" text-anchor="middle" class="svgtxt small">${done}/${goals.length}</text></g>` : ''}
  </g>`;
}

function iconFor(s: GameState, a: Animal): string {
  if (a.dead) return '🕊️';
  if (chickFreezing(s, a)) return '🥶';
  if (a.outside && !s.doorOpen && !isDaytime(s.hour)) return '🚪';
  const worst = [...a.conditions].sort((x, y) => y.severity - x.severity)[0];
  if (a.water < 30) return '💧';
  if (a.food < 30) return '🌾';
  if (worst && worst.severity > 15) return CONDITIONS[worst.id].emoji;
  if (a.health < 40) return '🤕';
  if (a.broodyUntil >= s.day) return '🪺';
  if (a.wellbeing < 30) return '😤';
  return '';
}

function rndIn(r: { x0: number; x1: number; y0: number; y1: number }): [number, number] {
  return [r.x0 + Math.random() * (r.x1 - r.x0), r.y0 + Math.random() * (r.y1 - r.y0)];
}
const dist = (sp: Sprite) => Math.hypot(sp.tx - sp.x, sp.ty - sp.y);
export function esc(t: string) {
  return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
