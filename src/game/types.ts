// Zentrale Datentypen des Spiels. Der gesamte Spielstand ist reines JSON,
// damit er sich einfach speichern und laden lässt.

export type Difficulty = 'leicht' | 'mittel' | 'schwer';
export type PlotId = 'wald' | 'obst' | 'bach';
export type BreedId = 'hybrid' | 'sussex' | 'marans' | 'brahma' | 'seide';
export type Sex = 'henne' | 'hahn';
export type Stage = 'kueken' | 'junghuhn' | 'erwachsen';
export type Personality = 'mutig' | 'scheu' | 'gefraessig' | 'neugierig' | 'zaenkisch' | 'bruetig';
export type ConditionId = 'milben' | 'wuermer' | 'schnupfen' | 'kokzidiose';
export type FeedId = 'koerner' | 'legemehl';
export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';

export interface Condition {
  id: ConditionId;
  severity: number; // 0..100
}

export interface Animal {
  id: number;
  name: string;
  breed: BreedId;
  /** Farbvariante (ab 0.3.0); fehlt sie, gilt die erste Variante der Rasse */
  variant?: string;
  sex: Sex;
  /** Spieltag des Schlupfs. Alter = state.day - hatchedDay */
  hatchedDay: number;
  /** Tag, an dem das Tier an Altersschwäche stirbt (verborgen) */
  maxAge: number;
  personality: Personality;
  food: number; // 0..100, 100 = satt
  water: number; // 0..100
  health: number; // 0..100
  wellbeing: number; // 0..100
  weight: number; // kg
  conditions: Condition[];
  /** Medikamenten-Wartezeit: bis zu diesem Tag keine Eier/kein Schlachten */
  withdrawalUntil: number;
  /** Nach überstandener Krankheit immun bis zu diesem Tag */
  immuneUntil?: Partial<Record<ConditionId, number>>;
  eggsLaid: number;
  /** brütet bis zu diesem Tag (Glucke) */
  broodingUntil: number;
  broodEggs: HatchEgg[];
  /** ist bis zu diesem Tag brütig und nimmt Eier an */
  broodyUntil: number;
  /** Mutter (Glucke) bei Naturbrut, hält die Küken warm */
  motherId?: number;
  /** Leicht: „letzte Chance“ wurde schon genutzt */
  lastChanceUsed?: boolean;
  /** steht im Auslauf (true) oder sitzt im Stall (false) */
  outside?: boolean;
  dead: boolean;
  deathCause?: string;
  deathDay?: number;
  /** Tag, an dem das Tier auf den Hof kam */
  arrivedDay: number;
  /** Herkunft/Notizen fürs Tagebuch */
  history: string[];
}

export interface HatchEgg {
  breed: BreedId;
  /** Farbvariante des Kükens (ab 0.3.0) */
  variant?: string;
  fertile: boolean;
}

export interface IncubatorEgg extends HatchEgg {
  hatchDay: number;
  candled: boolean;
}

export interface MarketOffer {
  id: number;
  kind: 'brutei' | 'kueken' | 'junghenne' | 'legehenne' | 'hahn';
  breed: BreedId;
  variant?: string;
  price: number;
  qty: number;
  seller: string;
  /** verdeckte Eigenschaften gebrauchter Tiere */
  hiddenAge?: number;
  hiddenMites?: boolean;
  checked?: boolean;
}

export interface LogEntry {
  day: number;
  hour: number;
  text: string;
  kind: 'info' | 'good' | 'warn' | 'bad';
}

export interface GameEvent {
  id: 'dorffest' | 'futterteuer' | 'stallpflicht';
  until: number;
}

export interface Order {
  id: number;
  customer: string;
  kind: 'eier' | 'junghenne' | 'suppenhuhn';
  qty: number;
  reward: number;
  dueDay: number;
}

/** Kategorien der Finanzübersicht (Mehr → Finanzen) */
export type FinanceCat =
  | 'eier' | 'tierverkauf' | 'auftraege' | 'mist' | 'besuche' | 'schau' | 'geschenke' | 'kredit'
  | 'futter' | 'einstreu' | 'medizin' | 'tierarzt' | 'tierkauf' | 'ausruestung' | 'pacht' | 'entsorgung' | 'sonstiges';

/** Geldbewegungen eines Monats je Kategorie (Einnahmen positiv, Ausgaben negativ) */
export type FinanceMonth = Partial<Record<FinanceCat, number>>;

/** Anfrage für einen Hofbesuch (Kita, Schulklasse …) */
export interface Visit {
  group: string;
  day: number; // Besuchstag, Ankunft um VISIT_HOUR
  fee: number;
  accepted: boolean;
}

export interface Celebration {
  emoji: string;
  title: string;
  lines: string[];
}

/** Eintrag im Hühner-Album */
export interface AlbumEntry {
  day: number;
  name: string;
}

/** Bewertung eines Tiers auf der Geflügelschau */
export interface ShowResult {
  animalId: number;
  name: string;
  breed: BreedId;
  variant?: string;
  points: number;
  grade: string;
  prize: number;
  trophy: boolean;
}

export interface PoultryShow {
  day: number;
  title: string;
  /** 2 = Landesschau (ab 4 Sternen, doppelte Preise) */
  level: 1 | 2;
  entries: number[];
  announced: boolean;
}

export interface Trophy {
  day: number;
  title: string;
  animal: string;
  breed: BreedId;
  variant?: string;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
}

export interface GameState {
  version: number;
  farmName: string;
  difficulty: Difficulty;
  plot: PlotId;
  seed: number;
  day: number; // ab 1
  hour: number; // 0..23
  /** Minute innerhalb der Stunde (ab 0.2.0) */
  minute?: number;
  money: number;
  debt: number;
  loanUsed: boolean;
  speed: 0 | 1 | 2 | 4;

  /** besessene Ausrüstung: pro Slot genau ein Artikel, sonst Liste der Extras */
  equip: {
    fence: string | null;
    coop: string | null;
    drinker: string | null;
    feeder: string | null;
  };
  extras: string[];
  runExtensions: number;
  cosmetics: string[];
  hat: string | null;

  doorOpen: boolean;
  water: number; // Liter in der Tränke
  feed: number; // kg in der Futterstelle
  feedType: FeedId | null;
  cleanliness: number; // Stall 0..100
  flatterbandSince: number;
  kieselgurUntil: number;
  /** Kräuter im Trinkwasser wirken bis zu diesem Tag */
  kraeuterUntil?: number;
  /** Bei Frost: Eis aufgehackt, bis zu dieser Spielstunde (Tag × 24 + Stunde) können die Hühner trinken */
  iceFreeUntil?: number;

  inventory: Record<string, number>;
  eggs: Record<string, number>; // gesammelte Speiseeier im Lager, je Rasse
  hatchEggs: HatchEgg[]; // Bruteier im Lager
  nestEggs: Record<string, number>; // ungesammelte Eier im Nest, je Rasse
  nestHatchEggs: HatchEgg[]; // davon befruchtet (nur mit Hahn)
  blockedEggs: number; // Eier mit Wartezeit (werden beim Sammeln entsorgt)
  incubator: IncubatorEgg[];

  animals: Animal[];
  nextId: number;

  temperature: number;
  eggPrice: number;
  offers: MarketOffer[];
  offersDay: number;
  /** 2 = Markt mit festem Hahn- und Brutei-Angebot (ab 1.2.0) */
  marketVersion?: number;

  foxAlertDay: number; // Tag, an dem Spuren gesehen wurden (Gefahr in der Nacht darauf)
  marderAlertDay: number;
  hawkAlertDay: number;
  events: GameEvent[];
  /** Kundenaufträge (ab 0.2.0) */
  orders?: Order[];

  /** Weidezustand je Auslaufhälfte 0..100, 100 = frisch (ab 0.3.0). Ohne Wechselweide zählt nur [0]. */
  pasture?: [number, number];
  /** Aktive Auslaufhälfte bei Wechselweide */
  pastureSide?: 0 | 1;
  pastureSwitchDay?: number;
  /** Stalllicht eingeschaltet (Zeitschaltuhr, wirkt im Herbst und Winter) */
  lightOn?: boolean;
  /** Hühner-Album: freigeschaltete Rassen und Farbvarianten, Schlüssel „rasse:variante“ */
  album?: Record<string, AlbumEntry>;
  /** Nächste Geflügelschau */
  show?: PoultryShow;
  lastShow?: { title: string; day: number; results: ShowResult[] };
  trophies?: Trophy[];
  /** Tutorial-Pfeile ausgeschaltet */
  tutorialOff?: boolean;

  stats: {
    eggsSold: number;
    eggsTotal: number;
    hatched: number;
    deaths: number;
    deathsRecent: number[]; // Tage mit Todesfällen
    predatorLosses: number;
    juniorsRaised: number;
    income: number;
    expenses: number;
  };
  /** Finanzübersicht: laufender und letzter Monat, Ergebnis der letzten Monate (ohne Investitionen) */
  finance?: { cur: FinanceMonth; prev?: FinanceMonth; results: number[] };
  /** Tag, an dem Opa Heinz zuletzt Rat gegeben hat */
  adviceDay?: number;
  /** Anfrage oder zugesagter Hofbesuch */
  visit?: Visit | null;
  /** Wirkung des letzten Hofbesuchs auf den Hof-Ruf */
  visitEffect?: { until: number; points: number } | null;
  /** laufende Kosten (Strom, Wasser), die zur Monatsabrechnung fällig werden */
  pendingCosts: number;
  chapter: number;
  goals: Goal[];
  log: LogEntry[];
  /** Meldungen für das UI, die als Hinweis auftauchen sollen */
  toasts: LogEntry[];
  /** Erreichte Ziele, die als Banner angezeigt werden */
  banners: string[];
  /** Wichtige Meldungen, die bestätigt werden müssen (Kapitel, Geschenke, Kredit) */
  celebrations: Celebration[];
  /** Morgenbericht: wird nach einer Nacht mit Vorfällen angezeigt */
  report: string[] | null;
  gameOver: boolean;
}
