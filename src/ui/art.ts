// SVG-Zeichnungen im Cartoon-Stil (Stil A). Alle Funktionen liefern SVG-Markup als String.
import { BREEDS } from '../game/data';
import type { BreedId } from '../game/types';

export const INK = '#3a2a1e';

/** Wiederverwendbare Tierfiguren, Farben kommen über CSS-Variablen (--b, --bd, --n, --t) */
export const DEFS = `
<g id="sym-hen">
  <path d="M12 -6 Q 26 -24 21 -1 Z" style="fill:var(--t, var(--bd))"/>
  <ellipse cx="2" cy="0" rx="16" ry="12" style="fill:var(--b)"/>
  <path d="M-2 -2 Q 8 -9 14 0 Q 6 8 -2 2 Z" style="fill:var(--bd)"/>
  <path d="M-3 11 V18 M5 11 V18 M-6 18 H-1 M2 18 H7" style="fill:none;stroke:#e39a2b"/>
  <circle cx="-14" cy="-12" r="7.5" style="fill:var(--n, var(--b))"/>
  <circle cx="-17" cy="-19" r="3" style="fill:var(--c,#d9342b)"/><circle cx="-13" cy="-20.5" r="3" style="fill:var(--c,#d9342b)"/><circle cx="-9" cy="-18.5" r="2.5" style="fill:var(--c,#d9342b)"/>
  <ellipse cx="-18" cy="-6" rx="2" ry="3" style="fill:var(--c,#d9342b)"/>
  <path d="M-21 -14 L-27 -11.5 L-21 -9 Z" style="fill:#f2b33d"/>
  <circle cx="-16" cy="-13.5" r="1.6" style="fill:${INK};stroke:none"/>
</g>
<g id="sym-rooster">
  <path d="M10 -4 Q 22 -34 34 -18 Q 26 -18 24 -6 Z" style="fill:var(--t)"/>
  <path d="M12 -2 Q 30 -26 36 -6 Q 28 -10 22 2 Z" style="fill:var(--t)"/>
  <ellipse cx="2" cy="0" rx="17" ry="13" style="fill:var(--b)"/>
  <path d="M-4 -2 Q 8 -10 15 0 Q 6 9 -4 3 Z" style="fill:var(--bd)"/>
  <path d="M-3 12 V21 M6 12 V21 M-7 21 H-1 M3 21 H9" style="fill:none;stroke:#e39a2b"/>
  <path d="M-18 -6 Q -14 -20 -6 -12 Q -6 -2 -12 2 Z" style="fill:var(--n)"/>
  <circle cx="-14" cy="-14" r="8" style="fill:var(--n)"/>
  <path d="M-22 -19 Q -21 -28 -17 -23 Q -15 -31 -12 -24 Q -8 -31 -7 -22 Q -4 -25 -6 -18 Z" style="fill:#d9342b"/>
  <ellipse cx="-19" cy="-6" rx="2.6" ry="4.5" style="fill:#d9342b"/>
  <path d="M-21 -16 L-28 -13 L-21 -10.5 Z" style="fill:#f2b33d"/>
  <circle cx="-16" cy="-15.5" r="1.7" style="fill:${INK};stroke:none"/>
</g>
<g id="sym-chick">
  <ellipse cx="0" cy="0" rx="7" ry="6" style="fill:var(--b,#ffe066)"/>
  <circle cx="-5" cy="-6" r="4.5" style="fill:var(--b,#ffe066)"/>
  <path d="M-9 -6.5 L-12.5 -5.5 L-9 -4.5 Z" style="fill:#f29a2b"/>
  <circle cx="-6" cy="-7" r="1" style="fill:${INK};stroke:none"/>
  <path d="M-2 6 V9 M2 6 V9" style="fill:none;stroke:#e39a2b"/>
</g>
<g id="sym-fluff">
  <circle cx="-4" cy="-8" r="6" style="fill:var(--b)"/><circle cx="6" cy="-8" r="6" style="fill:var(--b)"/>
  <circle cx="-14" cy="-22" r="5" style="fill:var(--b)"/>
</g>`;

export function breedStyle(breed: BreedId, rooster: boolean): string {
  const b = BREEDS[breed];
  if (rooster) return `--b:${b.rooster.body};--bd:${b.rooster.wing};--n:${b.rooster.neck};--t:${b.rooster.tail}`;
  const c = b.colors;
  const chickColor = breed === 'marans' ? '#5a4a3a' : breed === 'hybrid' ? '#e8b25a' : '#ffe066';
  return `--b:${c.body};--bd:${c.wing};${c.neck ? `--n:${c.neck};` : ''}${c.tail ? `--t:${c.tail};` : ''}--cb:${chickColor}${breed === 'seide' ? ';--c:#6b2f3a' : ''}`;
}

/** Einzelnes Tier für Porträts (Steckbrief, Listen) */
export function portrait(breed: BreedId, kind: 'hen' | 'rooster' | 'chick', dead = false): string {
  const style = breedStyle(breed, kind === 'rooster');
  const chickStyle = kind === 'chick' ? `--b:var(--cb)` : '';
  const fluffy = BREEDS[breed].fluffy && kind === 'hen';
  const vb = kind === 'chick' ? '-16 -16 32 30' : '-32 -36 70 60';
  return `<svg class="portrait${dead ? ' dead' : ''}" viewBox="${vb}" aria-hidden="true">
    <g style="${style};${chickStyle}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      ${fluffy ? `<use href="#sym-fluff"/>` : ''}<use href="#sym-${kind}"/>
    </g></svg>`;
}

/* ------------------------------------------------------------------ */
/* Ausrüstung                                                          */
/* ------------------------------------------------------------------ */
export interface CoopGeo { door: [number, number]; badge: [number, number]; nest: [number, number] }
export const COOP_GEO: Record<string, CoopGeo> = {
  none: { door: [170, 215], badge: [170, 150], nest: [180, 222] },
  kiste: { door: [168, 207], badge: [170, 152], nest: [196, 222] },
  kleintier: { door: [150, 210], badge: [170, 108], nest: [196, 224] },
  gartenhaus: { door: [150, 212], badge: [172, 88], nest: [205, 226] },
  mobil: { door: [160, 205], badge: [172, 100], nest: [212, 224] },
};

export function coopSvg(id: string | null, doorOpen: boolean, opts: { wetterhahn: boolean; licht: boolean; autoklappe: boolean; gitter: boolean; dirty: boolean }): string {
  const door = (x: number, y: number, w: number, h: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${doorOpen ? '#2a1712' : '#a0683d'}"/>` +
    (doorOpen ? '' : `<path d="M${x + 3} ${y + h / 3} H${x + w - 3} M${x + 3} ${(y + h * 2 / 3)} H${x + w - 3}" fill="none" stroke-width="1.2"/>`);
  const extras = (apexX: number, apexY: number, lampX: number, lampY: number, solarX: number, solarY: number) =>
    (opts.wetterhahn ? `<g transform="translate(${apexX} ${apexY})"><path d="M0 0 V-14" fill="none"/><path d="M-9 -14 Q -6 -24 2 -20 L 8 -26 L 6 -16 Q 0 -10 -9 -14 Z" fill="#d9a520"/></g>` : '') +
    (opts.licht ? `<g transform="translate(${lampX} ${lampY})"><rect x="-5" y="-4" width="10" height="7" rx="2" fill="#e8e8e8"/><path d="M-3 3 L-6 9 H6 L3 3" fill="#fff6b0" stroke-width="1"/></g>` : '') +
    (opts.autoklappe ? `<g transform="translate(${solarX} ${solarY})"><rect x="-7" y="-5" width="14" height="10" rx="1.5" fill="#2f4f7a"/><path d="M-7 0 H7 M0 -5 V5" fill="none" stroke="#9fc3ee" stroke-width="1"/></g>` : '');
  const dirt = opts.dirty ? `<g fill="#7a5c2e" stroke="none" opacity=".7"><circle cx="140" cy="214" r="2.5"/><circle cx="196" cy="216" r="2"/><circle cx="165" cy="219" r="2.2"/></g>` : '';
  switch (id) {
    case 'kiste':
      return `<g data-act="open:stall" class="clickable">
        <rect x="140" y="168" width="62" height="42" rx="3" fill="#b98a57"/>
        <path d="M140 182 H202 M140 196 H202" fill="none" stroke-width="1.2"/>
        <path d="M136 170 L171 150 L206 170 Z" fill="#8a6440"/>
        ${door(160, 186, 18, 24)}
        <path d="M188 176 l6 8 M194 176 l-6 8" fill="none" stroke-width="1.2"/>
        ${opts.gitter ? `<rect x="185" y="174" width="12" height="12" fill="none" stroke="#777" stroke-dasharray="2 2"/>` : ''}
        ${extras(171, 150, 140, 178, 196, 164)}${dirt}</g>`;
    case 'gartenhaus':
      return `<g data-act="open:stall" class="clickable">
        <rect x="116" y="112" width="112" height="100" rx="3" fill="#7f9c6a"/>
        <path d="M116 132 H228 M116 152 H228 M116 172 H228 M116 192 H228" fill="none" stroke-width="1" opacity=".6"/>
        <path d="M106 116 L172 70 L238 116 Z" fill="#5b4636"/>
        <rect x="186" y="128" width="28" height="22" rx="2" fill="#ffe9a8"/><path d="M200 128 V150 M186 139 H214" fill="none" stroke-width="1.4"/>
        ${door(138, 172, 26, 40)}
        <rect x="226" y="176" width="22" height="20" rx="2" fill="#b98a57"/><path d="M226 186 H248" fill="none" stroke-width="1"/>
        ${extras(172, 70, 120, 124, 222, 108)}${dirt}</g>`;
    case 'mobil':
      return `<g data-act="open:stall" class="clickable">
        <rect x="112" y="120" width="120" height="76" rx="8" fill="#e6e1d3"/>
        <path d="M112 140 H232" fill="none" stroke-width="1" opacity=".6"/>
        <path d="M106 124 Q 172 92 238 124 Z" fill="#3e6e4c"/>
        <rect x="190" y="140" width="30" height="20" rx="3" fill="#ffe9a8"/>
        ${door(148, 168, 24, 28)}
        <circle cx="132" cy="204" r="11" fill="#444"/><circle cx="132" cy="204" r="4" fill="#bbb"/>
        <circle cx="212" cy="204" r="11" fill="#444"/><circle cx="212" cy="204" r="4" fill="#bbb"/>
        <rect x="150" y="128" width="40" height="8" rx="2" fill="#2f4f7a"/>
        ${extras(172, 100, 116, 132, 226, 112)}${dirt}</g>`;
    case 'kleintier':
      return `<g data-act="open:stall" class="clickable">
        <rect x="127" y="188" width="7" height="22" fill="#c08a55"/><rect x="198" y="188" width="7" height="22" fill="#c08a55"/>
        <rect x="120" y="134" width="92" height="56" rx="3" fill="#d9533f"/>
        <path d="M121 153 H211 M121 171 H211" fill="none" stroke-width="1.2"/>
        <path d="M110 138 L166 98 L222 138 Z" fill="#7a3b2e"/>
        <circle cx="190" cy="156" r="9" fill="#ffe9a8"/><path d="M190 147 V165 M181 156 H199" fill="none" stroke-width="1.4"/>
        ${opts.gitter ? `<circle cx="190" cy="156" r="9" fill="none" stroke="#777" stroke-dasharray="2 2"/>` : ''}
        ${door(137, 160, 26, 30)}
        <path d="M138 190 L162 190 L158 214 L134 214 Z" fill="#c08a55"/>
        <path d="M137 198 H160 M136 206 H159" fill="none" stroke-width="1.2"/>
        <rect x="212" y="164" width="18" height="18" rx="2" fill="#c08a55"/>
        ${extras(166, 98, 124, 146, 206, 128)}${dirt}</g>`;
    default:
      return `<g data-act="open:shop:stall" class="clickable">
        <path d="M130 212 L132 180 M210 212 L208 180 M130 180 H210" fill="none" stroke="#a07b55" stroke-width="2" stroke-dasharray="4 3"/>
        <rect x="146" y="160" width="48" height="26" rx="4" fill="#fff6e0"/>
        <text x="170" y="172" text-anchor="middle" class="svgtxt">Bauplatz</text>
        <text x="170" y="181" text-anchor="middle" class="svgtxt small">Stall</text>
        <path d="M170 186 V212" fill="none" stroke-width="2"/></g>`;
  }
}

export function fenceSvg(id: string | null, opts: { geraet: boolean; untergrab: boolean; flatterband: boolean }): { back: string; front: string } {
  const x0 = 236, x1 = 472, yb = 162;
  if (!id) {
    let pegs = '';
    for (let x = x0; x <= x1; x += 59) pegs += `<path d="M${x} ${yb + 6} V${yb - 8}" stroke="#a07b55" stroke-width="3"/>`;
    return { back: `<g data-act="open:shop:gehege" class="clickable">${pegs}
      <path d="M${x0} ${yb - 6} H${x1}" fill="none" stroke="#e05a3a" stroke-width="1.5" stroke-dasharray="5 4"/>
      <rect x="318" y="${yb - 36}" width="72" height="22" rx="4" fill="#fff6e0"/>
      <text x="354" y="${yb - 21}" text-anchor="middle" class="svgtxt">Gehege hier</text></g>`, front: '' };
  }
  let posts = '', front = '';
  const tall = id === 'maschen' ? 14 : 0;
  const color = id === 'enetz' ? '#f08a3c' : '#f0d2a0';
  for (let x = x0; x <= x1; x += 26) {
    posts += `<rect x="${x - 3}" y="${yb - 34 - tall}" width="6" height="${40 + tall}" rx="2" fill="${id === 'enetz' ? '#ddd' : color}"/>`;
    front += `<rect x="${x - 2.5}" y="${246 - tall / 2}" width="5" height="${22 + tall / 2}" rx="2" fill="${id === 'enetz' ? '#ddd' : color}"/>`;
  }
  let mesh = '';
  if (id === 'knoten') {
    mesh = `<path d="M${x0} ${yb - 26} H${x1} M${x0} ${yb - 14} H${x1} M${x0} ${yb - 2} H${x1}" fill="none" stroke="#9a9a9a" stroke-width="1.2"/>`;
  } else if (id === 'maschen') {
    let d = '';
    for (let x = x0; x < x1; x += 8) d += `M${x} ${yb - 44} L${x + 16} ${yb + 4} M${x + 16} ${yb - 44} L${x} ${yb + 4} `;
    mesh = `<path d="${d}" fill="none" stroke="#9aa3a8" stroke-width=".8" opacity=".7"/><path d="M${x0} ${yb - 44} H${x1}" fill="none" stroke="#7d868c" stroke-width="2"/>`;
  } else {
    let d = '';
    for (let y = yb - 30; y <= yb; y += 6) d += `M${x0} ${y} H${x1} `;
    for (let x = x0; x <= x1; x += 9) d += `M${x} ${yb - 30} V${yb + 2} `;
    mesh = `<path d="${d}" fill="none" stroke="${opts.geraet ? '#f08a3c' : '#c9a07a'}" stroke-width="1" opacity=".85"/>`;
  }
  const ribbons = opts.flatterband ? Array.from({ length: 5 }, (_, i) => {
    const x = x0 + 26 + i * 52;
    return `<path class="flutter" d="M${x} ${yb - 32 - tall} q 6 6 0 12 q -6 6 0 12" fill="none" stroke="${i % 2 ? '#e33' : '#fff'}" stroke-width="2.5"/>
      <circle cx="${x + 5}" cy="${yb - 18 - tall}" r="4" fill="#cfd8e0" stroke-width="1"/>`;
  }).join('') : '';
  const device = opts.geraet ? `<g transform="translate(${x1 - 10} ${yb + 8})"><rect x="-10" y="-10" width="20" height="16" rx="3" fill="#2c6e49"/><text x="0" y="2" text-anchor="middle" class="svgtxt" fill="#ffe066" stroke="none">⚡</text></g>` : '';
  const under = opts.untergrab ? `<path d="M${x0} ${yb + 5} H${x1}" fill="none" stroke="#7a5c2e" stroke-width="2" stroke-dasharray="3 3"/>` : '';
  const frontMesh = id === 'enetz'
    ? `<path d="M${x0} 252 H${x1} M${x0} 258 H${x1} M${x0} 264 H${x1}" fill="none" stroke="${opts.geraet ? '#f08a3c' : '#c9a07a'}" stroke-width="1" opacity=".8"/>`
    : `<path d="M${x0} 252 H${x1} M${x0} 262 H${x1}" fill="none" stroke="#9a9a9a" stroke-width="1" opacity=".8"/>`;
  return {
    back: `<g data-act="open:shop:gehege" class="clickable">${mesh}${posts}${under}${ribbons}${device}
      <path d="M${x0} ${yb} L${x0} 194 M${x0} 222 L${x0} 262 M${x1} ${yb} L${x1} 262" fill="none" stroke="${color}" stroke-width="3"/>
      <path d="M${x0 - 3} 194 V222 M${x0 + 3} 194 V222" stroke="${id === 'enetz' ? '#ddd' : '#c08a55'}" stroke-width="4"/></g>`,
    front: `<g class="fence-front" pointer-events="none">${frontMesh}${front}</g>`,
  };
}

export function drinkerSvg(id: string | null, fill: number, frozen: boolean, auto: boolean): string {
  const water = frozen ? '#cfeaf7' : '#4fa9e0';
  if (!id) return `<g data-act="open:shop:wasser" class="clickable ghost"><ellipse cx="290" cy="212" rx="18" ry="5" fill="none" stroke-dasharray="3 3"/><text x="290" y="208" text-anchor="middle" class="svgtxt">💧?</text></g>`;
  const level = Math.max(0, Math.min(1, fill));
  let g = '';
  if (id === 'eimer') {
    g = `<path d="M276 194 H304 L300 216 H280 Z" fill="#9fb4c4"/>
      <rect x="279" y="${214 - 18 * level}" width="22" height="${18 * level}" fill="${water}" stroke="none" opacity=".85"/>
      <path d="M276 194 H304 L300 216 H280 Z" fill="none"/>
      <path d="M278 194 Q 290 182 302 194" fill="none" stroke-width="1.5"/>`;
  } else if (id === 'nippel') {
    g = `<rect x="276" y="176" width="28" height="34" rx="4" fill="#f4f4f4"/>
      <rect x="278" y="${208 - 30 * level}" width="24" height="${30 * level}" fill="${water}" stroke="none" opacity=".75"/>
      <rect x="276" y="176" width="28" height="34" rx="4" fill="none"/>
      <path d="M282 210 v5 M290 210 v5 M298 210 v5" stroke="#d33" stroke-width="2.5"/>
      <rect x="284" y="170" width="12" height="6" rx="2" fill="#d33"/>`;
  } else {
    g = `<rect x="274" y="206" width="32" height="10" rx="3" fill="#c0392b"/>
      <path d="M278 184 H302 L304 206 H276 Z" fill="#dde7ee"/>
      <rect x="279" y="${204 - 18 * level}" width="22" height="${18 * level}" fill="${water}" stroke="none" opacity=".85"/>
      <path d="M278 184 H302 L304 206 H276 Z" fill="none"/>
      <circle cx="300" cy="211" r="2" fill="#ffe066" stroke="none"/>`;
  }
  const pipe = auto ? `<path d="M304 190 H330 V150" fill="none" stroke="#5a6b78" stroke-width="3"/>` : '';
  return `<g data-act="water" class="clickable">${pipe}${g}${frozen ? `<text x="290" y="172" text-anchor="middle" class="svgtxt">🧊</text>` : ''}</g>`;
}

export function feederSvg(id: string | null, fill: number, legemehl: boolean): string {
  if (!id) return `<g data-act="open:shop:futter" class="clickable ghost"><rect x="336" y="206" width="36" height="10" rx="3" fill="none" stroke-dasharray="3 3"/><text x="354" y="202" text-anchor="middle" class="svgtxt">🌾?</text></g>`;
  const level = Math.max(0, Math.min(1, fill));
  const grain = legemehl ? '#d9b98a' : '#f2c14e';
  let g = '';
  if (id === 'trog') {
    g = `<path d="M334 206 H374 L370 218 H338 Z" fill="#c08a55"/>
      ${level > 0 ? `<path d="M337 ${207 - 4 * level} Q 354 ${202 - 4 * level} 371 ${207 - 4 * level} L371 207 H337 Z" fill="${grain}" stroke="none"/>` : ''}
      <path d="M334 206 H374" fill="none"/>`;
  } else if (id === 'silo') {
    g = `<rect x="344" y="168" width="20" height="40" rx="4" fill="#e9eef1"/>
      <rect x="346" y="${206 - 36 * level}" width="16" height="${36 * level}" fill="${grain}" stroke="none"/>
      <rect x="344" y="168" width="20" height="40" rx="4" fill="none"/>
      <ellipse cx="354" cy="214" rx="18" ry="5" fill="#c9a96e"/>`;
  } else {
    g = `<rect x="338" y="182" width="32" height="32" rx="3" fill="#7a8c99"/>
      <rect x="341" y="${210 - 24 * level}" width="9" height="${24 * level}" fill="${grain}" stroke="none"/>
      <path d="M352 186 V210" fill="none" stroke-width="1"/>
      <path d="M338 214 L330 222 H346 Z" fill="#5d6d78"/>
      <rect x="338" y="182" width="32" height="32" rx="3" fill="none"/>`;
  }
  return `<g data-act="feed" class="clickable">${g}</g>`;
}

export function playerSvg(hat: string | null, x: number, y: number): string {
  const hats: Record<string, string> = {
    stroh: `<ellipse cx="0" cy="-12" rx="23" ry="5.5" fill="#f0cf6b"/><path d="M-12 -12 Q -11 -29 0 -29 Q 11 -29 12 -12 Z" fill="#f0cf6b"/><path d="M-11.5 -17 H11.5" fill="none" stroke="#c8553d" stroke-width="3"/>`,
    hut_cowboy: `<path d="M-24 -14 Q -16 -6 0 -9 Q 16 -6 24 -14 Q 14 -10 0 -12 Q -14 -10 -24 -14 Z" fill="#8a5a33"/><path d="M-11 -11 Q -12 -30 -4 -27 Q 0 -24 4 -27 Q 12 -30 11 -11 Z" fill="#8a5a33"/><path d="M-11 -15 H11" stroke="#3a2a1e" stroke-width="2.5" fill="none"/>`,
    hut_bommel: `<path d="M-13 -8 Q -14 -28 0 -28 Q 14 -28 13 -8 Z" fill="#3d6fb5"/><rect x="-14" y="-12" width="28" height="7" rx="3" fill="#e8e8e8"/><circle cx="0" cy="-31" r="5" fill="#e8e8e8"/>`,
    hut_kapitaen: `<ellipse cx="0" cy="-20" rx="15" ry="7" fill="#fafafa"/><rect x="-13" y="-17" width="26" height="7" rx="2" fill="#1f2a44"/><path d="M-13 -10 Q 0 -4 15 -10" fill="#1f2a44"/><circle cx="0" cy="-14" r="2.5" fill="#f0c040"/>`,
    hut_krone: `<path d="M-12 -10 L-13 -27 L-6 -19 L0 -30 L6 -19 L13 -27 L12 -10 Z" fill="#f2c94c"/><circle cx="0" cy="-17" r="2" fill="#d33" stroke="none"/>`,
  };
  return `<g class="player" transform="translate(${x} ${y})">
    <rect x="-11.5" y="76" width="10" height="11" rx="3" fill="#2f7d4f"/><rect x="1.5" y="76" width="10" height="11" rx="3" fill="#2f7d4f"/>
    <rect x="-10.5" y="48" width="8" height="30" fill="#3d6fb5"/><rect x="2.5" y="48" width="8" height="30" fill="#3d6fb5"/>
    <rect x="-21.5" y="20" width="9" height="30" rx="4.5" fill="#d0453a"/><rect x="12.5" y="20" width="9" height="30" rx="4.5" fill="#d0453a"/>
    <circle cx="-17" cy="52" r="4.5" fill="#f2c29b"/><circle cx="17" cy="52" r="4.5" fill="#f2c29b"/>
    <rect x="-15.5" y="14" width="31" height="40" rx="9" fill="#d0453a"/>
    <rect x="-10.5" y="26" width="21" height="27" rx="3" fill="#3d6fb5"/>
    <circle cx="0" cy="0" r="13" fill="#f2c29b"/>
    <circle cx="-4.5" cy="0" r="1.6" fill="${INK}" stroke="none"/><circle cx="4.5" cy="0" r="1.6" fill="${INK}" stroke="none"/>
    <path d="M-4.5 6 Q 0 9 4.5 6" fill="none" stroke-width="1.5"/>
    ${hat ? hats[hat] ?? '' : ''}
  </g>`;
}

export function treeSvg(x: number, y: number, s: number, leaf: string, fruit: boolean): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-7" y="-10" width="14" height="74" rx="3" fill="#8a5a33"/>
    <circle cx="-20" cy="0" r="20" fill="${leaf}"/><circle cx="24" cy="-2" r="21" fill="${leaf}"/><circle cx="0" cy="-20" r="28" fill="${leaf}"/>
    ${fruit ? `<g fill="#e0403a" stroke-width="1"><circle cx="-14" cy="-6" r="3"/><circle cx="10" cy="-26" r="3"/><circle cx="22" cy="2" r="3"/><circle cx="-2" cy="-4" r="3"/></g>` : ''}
  </g>`;
}

export function pineSvg(x: number, y: number, s: number, color: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-4" y="20" width="8" height="18" fill="#6d4425"/>
    <path d="M0 -40 L18 -8 H8 L22 20 H-22 L-8 -8 H-18 Z" fill="${color}"/>
  </g>`;
}
