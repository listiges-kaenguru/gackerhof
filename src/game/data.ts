// Spieldaten: Rassen, Grundstücke, Shop-Artikel, Verbrauchsmaterial, Krankheiten.
// Alle Preise beziehen sich auf den Schwierigkeitsgrad „Mittel“.
import type { BreedId, ConditionId, Difficulty, PlotId, Season } from './types';

/* ------------------------------------------------------------------ */
/* Zeit                                                               */
/* ------------------------------------------------------------------ */
export const DAYS_PER_SEASON = 30;
export const SEASONS: Season[] = ['fruehling', 'sommer', 'herbst', 'winter'];
export const SEASON_NAMES: Record<Season, string> = {
  fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter',
};
/** Echtzeit-Millisekunden pro Spielstunde bei Tempo 1× (1 Spieltag = 3 Minuten) */
export const MS_PER_HOUR = 7500;
export const MS_PER_MINUTE = MS_PER_HOUR / 60;
/** Ab 19 Uhr gehen die Hühner nach und nach von selbst in den Stall (bis ca. 20:45) */
export const ROOST_HOUR = 19;
export const ROOST_WINDOW = 80; // Minuten, über die sich die Hühner verteilen
/** So lange (Spielminuten) braucht ein Huhn vom Auslauf bis in den Stall */
export const WALK_MINUTES = 25;
/** Morgens kommen die Hühner nach und nach ab 6 Uhr heraus */
export const OUT_WINDOW = 60;
/** Mehr als 120 % der Stallplätze passen nicht hinein */
export const MAX_OVERCROWD = 1.2;

/** Lebensphasen in Spieltagen ab Schlupf */
export const AGE = {
  brut: 7,
  junghuhn: 10,
  erwachsen: 25,
  senior: 360,
};

/* ------------------------------------------------------------------ */
/* Schwierigkeit                                                      */
/* ------------------------------------------------------------------ */
export interface DifficultyDef {
  name: string;
  emoji: string;
  desc: string;
  startMoney: number;
  needDecay: number;
  predator: number;
  disease: number;
  priceVolatility: number;
  sellBonus: number;
  vetFactor: number;
  lastChance: boolean;
  opaLoan: boolean;
}
export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  leicht: {
    name: 'Leicht', emoji: '🌼', desc: 'Mehr Startgeld, weniger Füchse, Krankheiten verlaufen langsam.',
    startMoney: 650, needDecay: 0.7, predator: 0.5, disease: 0.6, priceVolatility: 0.4, sellBonus: 1.15, vetFactor: 0.75,
    lastChance: true, opaLoan: true,
  },
  mittel: {
    name: 'Mittel', emoji: '🐔', desc: 'Realistisch. So ist das Konzept gedacht.',
    startMoney: 400, needDecay: 1, predator: 1, disease: 1, priceVolatility: 1, sellBonus: 1, vetFactor: 1,
    lastChance: false, opaLoan: true,
  },
  schwer: {
    name: 'Schwer', emoji: '🦊', desc: 'Wenig Geld, hungrige Füchse, schwankende Preise. Nur Bankkredit.',
    startMoney: 250, needDecay: 1.2, predator: 1.5, disease: 1.4, priceVolatility: 1.8, sellBonus: 1, vetFactor: 1.25,
    lastChance: false, opaLoan: false,
  },
};
/** Von leicht nach schwer */
export const DIFFICULTY_ORDER = Object.keys(DIFFICULTIES) as Difficulty[];

/* ------------------------------------------------------------------ */
/* Grundstücke                                                        */
/* ------------------------------------------------------------------ */
export interface PlotDef {
  name: string;
  emoji: string;
  rent: number;
  pros: string;
  cons: string;
  fox: number; // Grundwahrscheinlichkeit, dass ein Fuchs an einem Tag auftaucht
  marder: number;
  hawk: number;
  wet: number; // Faktor für Würmer/Schnupfen
  shade: boolean;
  pump: boolean;
}
export const PLOTS: Record<PlotId, PlotDef> = {
  wald: {
    name: 'Wiese am Waldrand', emoji: '🌲', rent: 12,
    pros: 'Günstig, natürlicher Schatten', cons: 'Hohes Fuchsrisiko, Marder',
    fox: 0.15, marder: 0.05, hawk: 0.08, wet: 1, shade: true, pump: false,
  },
  obst: {
    name: 'Streuobstwiese', emoji: '🍎', rent: 20,
    pros: 'Bäume schützen vor Greifvögeln, Fallobst', cons: 'Mittleres Fuchsrisiko',
    fox: 0.08, marder: 0.03, hawk: 0.04, wet: 1, shade: true, pump: false,
  },
  bach: {
    name: 'Grundstück am Bach', emoji: '🏞️', rent: 30,
    pros: 'Bachpumpe möglich: Wasser gratis', cons: 'Teuer, feucht: mehr Würmer und Schnupfen',
    fox: 0.1, marder: 0.03, hawk: 0.08, wet: 1.6, shade: false, pump: true,
  },
};

/* ------------------------------------------------------------------ */
/* Rassen                                                             */
/* ------------------------------------------------------------------ */
export interface BreedDef {
  name: string;
  desc: string;
  layRate: number; // Wahrscheinlichkeit pro Tag
  eggValue: number; // Faktor auf den Eierpreis
  weightHen: number;
  weightRooster: number;
  life: [number, number];
  broody: number; // Neigung zum Brüten
  coldHardy: boolean;
  /** Farbvarianten; die erste ist die häufigste und gilt für alte Spielstände */
  variants: VariantDef[];
  fluffy?: boolean;
  /** Rassetier für Geflügelschauen (Hybriden sind nicht zugelassen) */
  showBreed: boolean;
  prices: { brutei: number; kueken: number; junghenne: number; legehenne: number; hahn: number };
}
export interface VariantDef {
  id: string;
  name: string;
  colors: { body: string; wing: string; neck?: string; tail?: string };
  rooster: { body: string; wing: string; neck: string; tail: string };
  /** Farbe der Küken (Standard je Rasse) */
  chick?: string;
}
export const BREEDS: Record<BreedId, BreedDef> = {
  hybrid: {
    name: 'Legehybride', desc: 'Günstig, legt sehr fleißig, lebt kürzer.',
    layRate: 0.88, eggValue: 1, weightHen: 1.9, weightRooster: 2.4, life: [480, 650], broody: 0, coldHardy: false,
    variants: [
      { id: 'braun', name: 'braun', colors: { body: '#b5652b', wing: '#7d3f17' },
        rooster: { body: '#c4552a', wing: '#8f3416', neck: '#e8a23a', tail: '#2d5a3a' }, chick: '#e8b25a' },
      { id: 'weiss', name: 'weiß', colors: { body: '#f7f4ee', wing: '#e2dccf' },
        rooster: { body: '#f7f4ee', wing: '#e2dccf', neck: '#fbf8f2', tail: '#e8e2d6' }, chick: '#fff1a8' },
      { id: 'schwarz', name: 'schwarz', colors: { body: '#2f2a2b', wing: '#1d1a1b', neck: '#8a6a3a' },
        rooster: { body: '#2a2526', wing: '#1a1718', neck: '#a07a3a', tail: '#1d3a2a' }, chick: '#4a4040' },
    ],
    showBreed: false,
    prices: { brutei: 1.5, kueken: 4, junghenne: 18, legehenne: 12, hahn: 10 },
  },
  sussex: {
    name: 'Sussex', desc: 'Robustes Zweinutzungshuhn. Ein Allrounder.',
    layRate: 0.72, eggValue: 1, weightHen: 2.8, weightRooster: 3.6, life: [600, 850], broody: 0.08, coldHardy: true,
    variants: [
      { id: 'hell', name: 'hell', colors: { body: '#f6f1e7', wing: '#d9cfbd', neck: '#3b3b3b', tail: '#2b2b2b' },
        rooster: { body: '#f6f1e7', wing: '#d9cfbd', neck: '#3b3b3b', tail: '#222222' } },
      { id: 'rot', name: 'rot', colors: { body: '#b4532a', wing: '#8a3a1a', neck: '#2f2a28', tail: '#222222' },
        rooster: { body: '#a8461f', wing: '#7d3214', neck: '#2f2a28', tail: '#1e1e1e' }, chick: '#e0a060' },
      { id: 'porzellan', name: 'porzellanfarbig', colors: { body: '#c9874a', wing: '#f3ece0', neck: '#9a5a2a', tail: '#3a3a3a' },
        rooster: { body: '#c27a3a', wing: '#f3ece0', neck: '#a8642e', tail: '#2a2a2a' }, chick: '#f0c27a' },
    ],
    showBreed: true,
    prices: { brutei: 2.5, kueken: 6, junghenne: 24, legehenne: 18, hahn: 18 },
  },
  marans: {
    name: 'Marans', desc: 'Schokobraune Eier, die mehr Geld bringen.',
    layRate: 0.58, eggValue: 2, weightHen: 2.7, weightRooster: 3.5, life: [600, 850], broody: 0.08, coldHardy: true,
    variants: [
      { id: 'kupfer', name: 'schwarz-kupfer', colors: { body: '#3e3431', wing: '#262020', neck: '#b8732e' },
        rooster: { body: '#2f2826', wing: '#1e1a19', neck: '#c4762a', tail: '#1a2e22' }, chick: '#5a4a3a' },
      { id: 'weizen', name: 'weizenfarbig', colors: { body: '#d9a35a', wing: '#b9773a', neck: '#e8c07a' },
        rooster: { body: '#b85a2a', wing: '#8a3e1a', neck: '#e8a23a', tail: '#1e2a22' }, chick: '#f0d08a' },
      { id: 'kuckuck', name: 'kuckucksperber', colors: { body: '#8e8a86', wing: '#6a6662', neck: '#a8a49e' },
        rooster: { body: '#9a9692', wing: '#75716d', neck: '#b4b0aa', tail: '#5a5652' }, chick: '#6a6462' },
    ],
    showBreed: true,
    prices: { brutei: 3.5, kueken: 8, junghenne: 28, legehenne: 22, hahn: 22 },
  },
  brahma: {
    name: 'Brahma', desc: 'Groß, ruhig, kältefest. Frisst viel, wenige Eier.',
    layRate: 0.42, eggValue: 1, weightHen: 4, weightRooster: 5, life: [650, 900], broody: 0.2, coldHardy: true,
    variants: [
      { id: 'hell', name: 'hell', colors: { body: '#ece3d0', wing: '#9a9184', neck: '#5c5650', tail: '#3a3632' },
        rooster: { body: '#ece3d0', wing: '#9a9184', neck: '#5c5650', tail: '#2a2724' } },
      { id: 'dunkel', name: 'dunkel', colors: { body: '#6f6a66', wing: '#3e3a37', neck: '#e6e2da', tail: '#2a2724' },
        rooster: { body: '#3a3634', wing: '#d8d4cc', neck: '#eeeae2', tail: '#1e1c1a' }, chick: '#8a8480' },
      { id: 'gelb', name: 'gelb-columbia', colors: { body: '#e8c27a', wing: '#d4a85a', neck: '#5c4a30', tail: '#3a2e20' },
        rooster: { body: '#e8b860', wing: '#d09a48', neck: '#5c4a30', tail: '#2a2218' } },
    ],
    showBreed: true,
    prices: { brutei: 3, kueken: 7, junghenne: 30, legehenne: 25, hahn: 25 },
  },
  seide: {
    name: 'Seidenhuhn', desc: 'Flauschig und die beste Glucke von allen.',
    layRate: 0.35, eggValue: 1.2, weightHen: 1.1, weightRooster: 1.4, life: [650, 900], broody: 0.45, coldHardy: false,
    variants: [
      { id: 'weiss', name: 'weiß', colors: { body: '#ffffff', wing: '#ebe6dd' },
        rooster: { body: '#ffffff', wing: '#ebe6dd', neck: '#ffffff', tail: '#ebe6dd' } },
      { id: 'schwarz', name: 'schwarz', colors: { body: '#2b2729', wing: '#1e1b1c' },
        rooster: { body: '#2b2729', wing: '#1e1b1c', neck: '#2b2729', tail: '#1e1b1c' }, chick: '#3a3436' },
      { id: 'blau', name: 'blau', colors: { body: '#8a97a8', wing: '#6f7b8c' },
        rooster: { body: '#8a97a8', wing: '#6f7b8c', neck: '#8a97a8', tail: '#6f7b8c' }, chick: '#b8c2ce' },
    ],
    showBreed: true,
    fluffy: true,
    prices: { brutei: 3, kueken: 8, junghenne: 32, legehenne: 25, hahn: 20 },
  },
};

export const HEN_NAMES = [
  'Berta', 'Hilde', 'Frieda', 'Gertrud', 'Erna', 'Lotte', 'Elfriede', 'Henni', 'Rosi', 'Paula', 'Greta', 'Martha',
  'Ilse', 'Waltraud', 'Liesel', 'Anni', 'Käthe', 'Mathilda', 'Uschi', 'Helga', 'Trude', 'Emmi', 'Fanny', 'Lina',
  'Klara', 'Dörte', 'Hanne', 'Wilma', 'Agathe', 'Ottilie', 'Resi', 'Mimi', 'Gundula', 'Brunhilde', 'Susi', 'Lieschen',
];
export const ROOSTER_NAMES = [
  'Gustav', 'Kalle', 'Heinz-Otto', 'Bruno', 'Egon', 'Fritz', 'Hugo', 'Karl', 'Willi', 'Rudi', 'Ludwig', 'Theo',
  'Anton', 'Kuno', 'Herbert', 'Ewald', 'Konrad', 'Fiete', 'Bodo', 'Siegfried',
];
export const PERSONALITIES = {
  mutig: 'mutig', scheu: 'scheu', gefraessig: 'gefräßig', neugierig: 'neugierig', zaenkisch: 'zänkisch', bruetig: 'brütig',
} as const;

/* ------------------------------------------------------------------ */
/* Shop: Ausrüstung                                                   */
/* ------------------------------------------------------------------ */
export type ShopCat = 'gehege' | 'stall' | 'wasser' | 'futter' | 'fuchs' | 'greif' | 'ausbau' | 'verbrauch' | 'gimmick';
export const SHOP_CATS: { id: ShopCat; name: string; emoji: string }[] = [
  { id: 'gehege', name: 'Zaun', emoji: '🚧' },
  { id: 'stall', name: 'Stall', emoji: '🏠' },
  { id: 'wasser', name: 'Wasser', emoji: '💧' },
  { id: 'futter', name: 'Futterstelle', emoji: '🌾' },
  { id: 'fuchs', name: 'Fuchsschutz', emoji: '🦊' },
  { id: 'greif', name: 'Greifvogelschutz', emoji: '🦅' },
  { id: 'verbrauch', name: 'Futter & Medizin', emoji: '💊' },
  { id: 'ausbau', name: 'Erweiterungen', emoji: '⚙️' },
  { id: 'gimmick', name: 'Gimmicks', emoji: '🎩' },
];

export type Slot = 'fence' | 'coop' | 'drinker' | 'feeder';

export interface ItemDef {
  id: string;
  cat: ShopCat;
  name: string;
  price: number;
  desc: string;
  slot?: Slot;
  /** Kennwerte, je nach Kategorie */
  fox?: number; // Fuchsschutz 0..1
  hawk?: number; // Greifvogelschutz 0..1
  cap?: number; // Plätze, Liter oder kg
  run?: number; // Auslauf-Plätze
  coopSafety?: number; // Schutz bei geschlossener Klappe
  marderSafe?: boolean;
  ratSafe?: boolean;
  frostSafe?: boolean;
  power?: number; // laufende Kosten pro Tag
  requires?: string;
  plot?: PlotId;
  stack?: number; // mehrfach kaufbar (Anzahl)
  cosmetic?: 'hat' | 'deko';
}

export const ITEMS: ItemDef[] = [
  // Zaun
  { id: 'knoten', cat: 'gehege', slot: 'fence', name: 'Knotengitter 1,2 m', price: 60, fox: 0.2, run: 6,
    desc: 'Hält die Hühner drin. Ein Fuchs kommt leicht drüber.' },
  { id: 'maschen', cat: 'gehege', slot: 'fence', name: 'Maschendrahtzaun 2 m', price: 140, fox: 0.5, run: 10,
    desc: 'Hoch und stabil. Deutlich besserer Schutz.' },
  { id: 'enetz', cat: 'gehege', slot: 'fence', name: 'Elektro-Geflügelnetz', price: 190, fox: 0.55, run: 14,
    desc: 'Mit Weidezaungerät der beste Fuchsschutz. Ohne Strom nur ein Netz.' },
  // Stall
  { id: 'kiste', cat: 'stall', slot: 'coop', name: 'Gebrauchte Holzkiste', price: 70, cap: 3, coopSafety: 0.7,
    desc: 'Zugig und klein. Wird schnell schmutzig. Nicht mardersicher.' },
  { id: 'kleintier', cat: 'stall', slot: 'coop', name: 'Kleintierstall mit Legenest', price: 220, cap: 6, coopSafety: 0.92,
    desc: 'Solide Basis mit Legenest.' },
  { id: 'gartenhaus', cat: 'stall', slot: 'coop', name: 'Gartenhaus-Hühnerstall', price: 850, cap: 15, coopSafety: 0.99, marderSafe: true,
    desc: 'Gedämmt, mardersicher, Sitzstangen und Kotbrett.' },
  { id: 'mobil', cat: 'stall', slot: 'coop', name: 'Hühnermobil', price: 5500, cap: 40, coopSafety: 0.99, marderSafe: true,
    desc: 'Umsetzbar auf frische Weide: deutlich weniger Parasiten.' },
  // Wasser
  { id: 'eimer', cat: 'wasser', slot: 'drinker', name: 'Eimertränke 3 l', price: 8, cap: 3,
    desc: 'Muss oft aufgefüllt werden.' },
  { id: 'nippel', cat: 'wasser', slot: 'drinker', name: 'Nippeltränke 12 l', price: 35, cap: 12,
    desc: 'Bleibt sauber und hält mehrere Tage.' },
  { id: 'beheizt', cat: 'wasser', slot: 'drinker', name: 'Beheizte Tränke 8 l', price: 75, cap: 8, frostSafe: true, power: 0.2,
    desc: 'Friert im Winter nicht ein. Kostet etwas Strom.' },
  // Futterstelle
  { id: 'trog', cat: 'futter', slot: 'feeder', name: 'Futtertrog', price: 10, cap: 1.5,
    desc: 'Klein. Lockt Ratten und Spatzen an.' },
  { id: 'silo', cat: 'futter', slot: 'feeder', name: 'Futtersilo 5 kg', price: 30, cap: 5,
    desc: 'Reicht mehrere Tage, aber nicht rattensicher.' },
  { id: 'tritt', cat: 'futter', slot: 'feeder', name: 'Trittfutterautomat 8 kg', price: 95, cap: 8, ratSafe: true,
    desc: 'Rattensicher, kein Futterverlust.' },
  // Fuchs
  { id: 'untergrab', cat: 'fuchs', name: 'Untergrabschutz', price: 45, fox: 0.15, desc: 'Gitter im Boden: Kein Durchgraben mehr.' },
  { id: 'geraet', cat: 'fuchs', name: 'Weidezaungerät', price: 120, power: 0.1, requires: 'enetz',
    desc: 'Macht das Elektronetz scharf. Braucht das Elektro-Geflügelnetz.' },
  { id: 'autoklappe', cat: 'fuchs', name: 'Automatische Hühnerklappe', price: 130,
    desc: 'Öffnet morgens und schließt abends von selbst.' },
  { id: 'licht', cat: 'fuchs', name: 'Bewegungsmelder-Licht', price: 40, fox: 0.05, desc: 'Schreckt nachts ein wenig ab.' },
  { id: 'mardergitter', cat: 'fuchs', name: 'Mardersicheres Stallgitter', price: 60, desc: 'Verschließt Lücken im Stall gegen Marder.' },
  // Greifvögel
  { id: 'flatterband', cat: 'greif', name: 'Flatterband und alte CDs', price: 5, hawk: 0.25,
    desc: 'Billig. Wirkt nur, bis sich die Greifvögel daran gewöhnt haben.' },
  { id: 'unterstand', cat: 'greif', name: 'Unterstand und Büsche', price: 25, hawk: 0.3, desc: 'Versteck und Schatten.' },
  { id: 'netz', cat: 'greif', name: 'Volierennetz', price: 160, hawk: 0.9,
    desc: 'Fast vollständiger Schutz. Erlaubt Auslauf auch bei Stallpflicht.' },
  // Erweiterungen
  { id: 'auslauf', cat: 'ausbau', name: 'Auslauf vergrößern', price: 90, stack: 3, desc: '+6 Plätze im Auslauf. Mehr Platz = weniger Stress.' },
  { id: 'kuekenstation', cat: 'ausbau', name: 'Kükenstation mit Wärmelampe', price: 45, power: 0.15,
    desc: 'Küken brauchen Wärme. Ohne Station werden sie krank.' },
  { id: 'brutapparat', cat: 'ausbau', name: 'Brutapparat (12 Eier)', price: 90, cap: 12,
    desc: 'Brütet Eier ohne Glucke aus.' },
  { id: 'wechselweide', cat: 'ausbau', name: 'Wechselweide', price: 55,
    desc: 'Teilt den Auslauf in zwei Hälften. Eine wird genutzt, die andere erholt sich: viel weniger Würmer.' },
  { id: 'stalllicht', cat: 'ausbau', name: 'Stalllicht mit Zeitschaltuhr', price: 35, power: 0.12,
    desc: 'Verlängert im Herbst und Winter den Tag im Stall: deutlich mehr Eier. Strom nur, wenn es läuft.' },
  { id: 'sandbad', cat: 'ausbau', name: 'Sandbad', price: 15, desc: 'Hühner pflegen ihr Gefieder: weniger Milben.' },
  { id: 'autofutter', cat: 'ausbau', name: 'Automatische Fütterung', price: 700,
    desc: 'Füllt die Futterstelle jeden Morgen aus dem Lager auf.' },
  { id: 'pumpe', cat: 'ausbau', name: 'Bachpumpe', price: 450, plot: 'bach', desc: 'Wasser aus dem Bach: Tränke ist immer voll.' },
  { id: 'leitung', cat: 'ausbau', name: 'Wasserleitung', price: 900, power: 0.3, desc: 'Tränke ist immer voll. Kostet etwas Wasser.' },
  { id: 'hofladen', cat: 'ausbau', name: 'Hofladen mit Vertrauenskasse', price: 300,
    desc: 'Verkauft Eier aus dem Lager von selbst, zu besseren Preisen.' },
  // Gimmicks
  { id: 'hut_cowboy', cat: 'gimmick', cosmetic: 'hat', name: 'Cowboyhut', price: 25, desc: 'Yeehaw. Bringt nichts, sieht aber gut aus.' },
  { id: 'hut_bommel', cat: 'gimmick', cosmetic: 'hat', name: 'Bommelmütze', price: 12, desc: 'Für kalte Wintermorgen. Rein optisch.' },
  { id: 'hut_kapitaen', cat: 'gimmick', cosmetic: 'hat', name: 'Kapitänsmütze', price: 30, desc: 'Käpt\'n auf dem eigenen Hof.' },
  { id: 'hut_krone', cat: 'gimmick', cosmetic: 'hat', name: 'Krone aus Pappe', price: 5, desc: 'Hühnerkönig oder Hühnerkönigin.' },
  { id: 'zwerg', cat: 'gimmick', cosmetic: 'deko', name: 'Gartenzwerg', price: 15, desc: 'Bewacht den Hof. Ohne jede Wirkung.' },
  { id: 'wetterhahn', cat: 'gimmick', cosmetic: 'deko', name: 'Wetterhahn', price: 40, desc: 'Dreht sich im Wind auf dem Stalldach.' },
  { id: 'schild', cat: 'gimmick', cosmetic: 'deko', name: 'Hofschild mit Namen', price: 20, desc: 'Damit jeder weiß, wessen Hof das ist.' },
  { id: 'schaukel', cat: 'gimmick', cosmetic: 'deko', name: 'Hühnerschaukel', price: 18, desc: 'Gibt es wirklich. Wird selten benutzt.' },
];
export const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i])) as Record<string, ItemDef>;
export const HATS: Record<string, string> = {
  stroh: 'Strohhut', hut_cowboy: 'Cowboyhut', hut_bommel: 'Bommelmütze', hut_kapitaen: 'Kapitänsmütze', hut_krone: 'Krone',
};

/* ------------------------------------------------------------------ */
/* Verbrauchsmaterial                                                 */
/* ------------------------------------------------------------------ */
export interface SupplyDef {
  id: string;
  name: string;
  unit: string;
  amount: number; // Menge pro Kauf
  price: number;
  desc: string;
  emoji: string;
}
export const SUPPLIES: SupplyDef[] = [
  { id: 'koerner', name: 'Körnerfutter', unit: 'kg', amount: 10, price: 6, emoji: '🌾', desc: 'Günstiges Grundfutter.' },
  { id: 'legemehl', name: 'Legemehl', unit: 'kg', amount: 10, price: 9, emoji: '🥣', desc: 'Ausgewogen: +15 % Legeleistung.' },
  { id: 'kuekenstarter', name: 'Kükenstarter', unit: 'kg', amount: 5, price: 7, emoji: '🐣', desc: 'Pflichtfutter für Küken.' },
  { id: 'mehlwuermer', name: 'Mehlwürmer', unit: 'Portionen', amount: 5, price: 6, emoji: '🪱', desc: 'Leckerli: +Wohlbefinden für alle.' },
  { id: 'einstreu', name: 'Einstreu (Stroh)', unit: 'Ballen', amount: 1, price: 5, emoji: '🌿', desc: 'Zum Ausmisten. Ein Ballen pro Reinigung.' },
  { id: 'kieselgur', name: 'Kieselgur', unit: 'Dosen', amount: 1, price: 6, emoji: '🧂', desc: 'Gegen Milben, wirkt auch 10 Tage vorbeugend im Stall.' },
  { id: 'milbenspray', name: 'Milbenspray', unit: 'Flaschen', amount: 1, price: 12, emoji: '🧴', desc: 'Beseitigt Milbenbefall bei einem Tier zuverlässig.' },
  { id: 'wurmkur', name: 'Wurmkur', unit: 'Packungen', amount: 1, price: 10, emoji: '💊', desc: 'Gegen Würmer. 5 Tage Wartezeit für Eier.' },
  { id: 'kokzidiostatikum', name: 'Kokzidiose-Mittel', unit: 'Packungen', amount: 1, price: 12, emoji: '💉', desc: 'Gegen Kokzidiose bei Küken.' },
];
export const SUPPLY = Object.fromEntries(SUPPLIES.map(s => [s.id, s])) as Record<string, SupplyDef>;

/* ------------------------------------------------------------------ */
/* Krankheiten                                                        */
/* ------------------------------------------------------------------ */
export interface ConditionDef {
  name: string;
  emoji: string;
  sign: string;
  contagious: number;
  growth: number; // Zunahme der Schwere pro Tag
  /** Lösungen: Lagerartikel oder 'tierarzt' */
  cures: { id: string; label: string; vetPrice?: number; withdrawal?: number; effect: number }[];
}
export const CONDITIONS: Record<ConditionId, ConditionDef> = {
  milben: {
    name: 'Milbenbefall', emoji: '🐜', sign: 'kratzt sich, blasser Kamm', contagious: 0.12, growth: 9,
    cures: [
      { id: 'kieselgur', label: 'Kieselgur streuen', effect: 45 },
      { id: 'milbenspray', label: 'Milbenspray', effect: 100 },
    ],
  },
  wuermer: {
    name: 'Würmer', emoji: '🪱', sign: 'magert trotz Futter ab', contagious: 0.06, growth: 6,
    cures: [{ id: 'wurmkur', label: 'Wurmkur', effect: 100, withdrawal: 5 }],
  },
  schnupfen: {
    name: 'Atemwegsinfekt', emoji: '🤧', sign: 'niest, Augen tränen', contagious: 0.15, growth: 14,
    cures: [{ id: 'tierarzt', label: 'Tierarzt + Antibiotikum', vetPrice: 25, effect: 100, withdrawal: 7 }],
  },
  kokzidiose: {
    name: 'Kokzidiose', emoji: '🦠', sign: 'lustlos, aufgeplustert', contagious: 0.2, growth: 18,
    cures: [{ id: 'kokzidiostatikum', label: 'Kokzidiose-Mittel', effect: 100 }],
  },
};

/* ------------------------------------------------------------------ */
/* Weide, Licht, Album, Geflügelschau                                 */
/* ------------------------------------------------------------------ */
/** Ab diesem Weidezustand (%) steigt das Wurmrisiko deutlich */
export const PASTURE_WARN = 45;
/** Legeleistung je Jahreszeit; mit Stalllicht im Herbst/Winter höher */
export const SEASON_LAY = { fruehling: 1.1, sommer: 1, herbst: 0.6, winter: 0.45 } as const;
export const SEASON_LAY_LIGHT: Partial<Record<Season, number>> = { herbst: 0.88, winter: 0.8 };
/** Prämien im Hühner-Album */
export const ALBUM_BREED_BONUS = 20;
export const ALBUM_FULL_BONUS = 100;
/** Geflügelschau: Tag in der Jahreszeit, Ankündigung vorher, Standgeld, Höchstzahl Tiere */
export const SHOW_DAY = 25;
export const SHOW_NOTICE = 7;
export const SHOW_FEE = 4;
export const SHOW_MAX = 3;
/** Bewertung wie auf echten Rassegeflügelschauen */
export const SHOW_GRADES: { min: number; grade: string; name: string; prize: number }[] = [
  { min: 97, grade: 'v', name: 'vorzüglich', prize: 25 },
  { min: 95, grade: 'hv', name: 'hervorragend', prize: 12 },
  { min: 93, grade: 'sg', name: 'sehr gut', prize: 5 },
  { min: 92, grade: 'g', name: 'gut', prize: 0 },
  { min: 0, grade: 'b', name: 'befriedigend', prize: 0 },
];
export const SHOW_TROPHY_PRIZE = 50;

/* ------------------------------------------------------------------ */
/* Sonstiges                                                          */
/* ------------------------------------------------------------------ */
export const DISPOSAL_COST = 15;
export const BUTCHER_PER_KG = 4.5;
export const BUTCHER_FEE = 4;
export const HEALTH_CHECK_COST = 3;
export const MANURE_PRICE = 2;
export const CUSTOMERS = {
  eier: ['Bäckerei Krause', 'Café Sonnenschein', 'Kita Pusteblume', 'Hotel Seeblick', 'Frau Meier von nebenan'],
  junghenne: ['Familie Schulz', 'Herr Albrecht', 'Schulgarten der Grundschule', 'Familie Nowak'],
  suppenhuhn: ['Gasthaus Zur Linde', 'Oma Gerda', 'Restaurant Hirschen'],
};
/** Ab diesem Alter (Spieltage) gilt eine Henne als Suppenhuhn */
export const SOUP_AGE = 240;
export const SELLERS = ['Händler Brandt', 'Frau Lindner', 'Geflügelhof Petersen', 'Herr Yılmaz', 'Familie Kowalski'];
