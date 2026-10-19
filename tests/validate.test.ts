// Prüfung fremder Spielstände (src/game/validate.ts) direkt, ohne den Fehlerfang von importSave: Eine Prüfung, die
// bei einem kaputten Wert abstürzt statt false zu liefern, fällt hier auf.
// Grundlage ist ein Spielstand, in dem jedes optionale Feld gefüllt ist; jeder Fall verfälscht genau ein Feld.
import { describe, expect, it } from 'vitest';
import { advanceHour } from '../src/game/sim';
import { createAnimal, exportSave, newGame, SAVE_VERSION } from '../src/game/state';
import { isValidSave } from '../src/game/validate';

type O = Record<string, any>;

function voll(): O {
  const s = newGame({ farmName: 'Testhof', difficulty: 'mittel', plot: 'obst', seed: 7 });
  for (let i = 0; i < 24 * 2; i++) advanceHour(s);
  s.animals.push(
    createAnimal(s, 'hybrid', { sex: 'henne', ageDays: 200 }),
    createAnimal(s, 'hybrid', { sex: 'hahn', ageDays: 200 }),
  );
  const o = JSON.parse(exportSave(s)) as O;
  const [henne, hahn] = o.animals;
  henne.variant = 'braun';
  henne.conditions = [{ id: 'milben', severity: 10 }];
  henne.broodEggs = [{ breed: 'hybrid', fertile: true }];
  henne.history = ['geschlüpft'];
  henne.immuneUntil = { milben: 30 };
  henne.motherId = 0;
  henne.lastChanceUsed = false;
  henne.outside = true;
  hahn.dead = true;
  hahn.deathCause = 'Fuchs';
  hahn.deathDay = 2;
  o.minute = 30;
  o.equip = { fence: 'knoten', coop: 'kiste', drinker: 'eimer', feeder: 'trog' };
  o.extras = ['licht', 'schuppen'];
  o.cosmetics = ['zwerg', 'hut_krone'];
  o.hat = 'hut_krone';
  o.feedType = 'koerner';
  o.kraeuterUntil = 5;
  o.iceFreeUntil = 5;
  o.inventory = { koerner: 2 };
  o.eggs = { hybrid: 3 };
  o.nestEggs = { hybrid: 1 };
  o.hatchEggs = [{ breed: 'hybrid' }];
  o.nestHatchEggs = [{ breed: 'hybrid', fertile: false }];
  o.incubator = [{ breed: 'hybrid', hatchDay: 30, candled: false }];
  o.offers = [{ id: 1, kind: 'legehenne', breed: 'hybrid', price: 15, qty: 2, seller: 'Hof Meyer', hiddenAge: 300,
    hiddenMites: false, checked: true }];
  o.marketVersion = 2;
  o.events = [{ id: 'dorffest', until: 4 }, { id: 'futterteuer', until: 4 }, { id: 'stallpflicht', until: 4 }];
  o.orders = [
    { id: 1, customer: 'Bäckerei', kind: 'eier', qty: 10, reward: 5, dueDay: 9 },
    { id: 2, customer: 'Nachbarin', kind: 'junghenne', qty: 1, reward: 20, dueDay: 9 },
    { id: 3, customer: 'Gasthof', kind: 'suppenhuhn', qty: 1, reward: 12, dueDay: 9 },
  ];
  o.pasture = [80, 100];
  o.pastureSide = 1;
  o.pastureSwitchDay = 3;
  o.lightOn = false;
  o.tutorialOff = true;
  o.album = { 'hybrid:braun': { day: 2, name: 'Berta' } };
  o.show = { day: 20, title: 'Kreisschau', level: 2, entries: [1], announced: true };
  o.lastShow = { title: 'Frühjahrsschau', day: 5, results: [{ animalId: 1, name: 'Berta', breed: 'hybrid', points: 90,
    grade: 'sg', prize: 5, trophy: false }] };
  o.trophies = [{ day: 5, title: 'Pokal', animal: 'Berta', breed: 'hybrid' }];
  o.finance = { cur: { eier: 3 }, prev: { futter: -2 }, results: [1, -2] };
  o.adviceDay = 4;
  o.visit = { group: 'Kita', day: 9, fee: 20, accepted: false };
  o.visitEffect = { until: 12, points: 3 };
  o.goals = [{ id: 'eier', text: '10 Eier', done: false }];
  o.log = [{ day: 1, hour: 6, text: 'Guten Morgen', kind: 'info' }];
  o.toasts = [];
  o.banners = ['Willkommen'];
  o.celebrations = [{ emoji: '🎉', title: 'Geschafft', lines: ['eins'] }];
  o.report = ['Tagesbericht'];
  return o;
}

const pruefe = (o: unknown) => isValidSave(o, SAVE_VERSION);
const mit = (aenderung: (o: O) => void) => { const o = voll(); aenderung(o); return o; };
const tier = (o: O, i = 0): O => o.animals[i];
const text = (n: number) => 'x'.repeat(n);

describe('Gültige Spielstände', () => {
  it('übernimmt einen Spielstand mit allen optionalen Feldern, auch einer Henne und einem Hahn', () => {
    const o = voll();
    expect(tier(o, 1).sex).toBe('hahn');
    expect(pruefe(o)).toBe(true);
  });

  it.each([
    ['Name mit genau 60 Zeichen', (o: O) => { o.farmName = text(60); }],
    ['Lager mit genau 1000 Sorten', (o: O) => { o.inventory = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`k${i}`, 1])); }],
    ['Geld genau an der Obergrenze', (o: O) => { o.money = 1e12; }],
    ['Stunde 23', (o: O) => { o.hour = 23; }],
    ['nextId genau eins über der höchsten Tier-ID', (o: O) => { o.nextId = Math.max(...o.animals.map((a: O) => a.id)) + 1; }],
    ['Liste mit genau 100 Zusatzgeräten', (o: O) => { o.extras = Array.from({ length: 100 }, () => 'licht'); }],
    ['Besuch null', (o: O) => { o.visit = null; }],
    ['Futtersorte null', (o: O) => { o.feedType = null; }],
    ['leerer Stall', (o: O) => { o.equip = { fence: null, coop: null, drinker: null, feeder: null }; }],
    ['Tagesbericht null', (o: O) => { o.report = null; }],
    ['Weide auf der anderen Seite', (o: O) => { o.pastureSide = 0; }],
    ['Ausstellung der Stufe 1', (o: O) => { o.show.level = 1; }],
  ])('übernimmt: %s', (_, aenderung) => {
    expect(pruefe(mit(aenderung))).toBe(true);
  });
});

describe('Abgelehnte Spielstände (genau ein Feld verfälscht)', () => {
  it.each([
    // Grundtypen: Objekt, Zahl, Text, Wahrheitswert, Liste, Tabelle
    ['Lager als Liste', (o: O) => { o.inventory = []; }],
    ['Lager als Zahl', (o: O) => { o.inventory = 5; }],
    ['Lager als null', (o: O) => { o.inventory = null; }],
    ['Lager mit 1001 Sorten', (o: O) => { o.inventory = Object.fromEntries(Array.from({ length: 1001 }, (_, i) => [`k${i}`, 1])); }],
    ['Geld über der Obergrenze', (o: O) => { o.money = 2e12; }],
    ['Stunde 24', (o: O) => { o.hour = 24; }],
    ['Hofname als Liste', (o: O) => { o.farmName = ['Testhof']; }],
    ['Hofname mit 61 Zeichen', (o: O) => { o.farmName = text(61); }],
    ['Tür offen als Text', (o: O) => { o.doorOpen = 'ja'; }],
    ['Rasse als Liste mit gültiger Kennung', (o: O) => { tier(o).breed = ['hybrid']; }],
    ['Zusatzgeräte als Text', (o: O) => { o.extras = 'licht'; }],
    ['101 Zusatzgeräte', (o: O) => { o.extras = Array.from({ length: 101 }, () => 'licht'); }],
    ['unbekanntes Zusatzgerät', (o: O) => { o.extras = ['nope']; }],
    ['unbekannte Deko', (o: O) => { o.cosmetics = ['nope']; }],
    ['Stall im Zaun-Platz', (o: O) => { o.equip.fence = 'kiste'; }],
    ['unbekanntes Gerät im Futterplatz', (o: O) => { o.equip.feeder = 'nope'; }],
    ['Ausrüstung null', (o: O) => { o.equip = null; }],
    ['Bruteier mit Fruchtbarkeit als Text', (o: O) => { o.hatchEggs = [{ breed: 'hybrid', fertile: 'ja' }]; }],
    ['Minute als Text', (o: O) => { o.minute = 'x'; }],

    // Tiere
    ['Tier als Zahl', (o: O) => { o.animals = [5]; }],
    ['Tier als null', (o: O) => { o.animals = [null]; }],
    ['Futterstand als Text', (o: O) => { tier(o).food = 'voll'; }],
    ['Alter als Text', (o: O) => { tier(o).hatchedDay = 'gestern'; }],
    ['Geschlecht unbekannt', (o: O) => { tier(o, 1).sex = 'huhn'; }],
    ['Verlauf mit Zahl', (o: O) => { tier(o).history = [5]; }],
    ['Krankheit unbekannt', (o: O) => { tier(o).conditions = [{ id: 'pest', severity: 1 }]; }],
    ['Krankheit ohne Schwere', (o: O) => { tier(o).conditions = [{ id: 'milben' }]; }],
    ['Krankheit mit Schwere 1001', (o: O) => { tier(o).conditions = [{ id: 'milben', severity: 1001 }]; }],
    ['Krankheit null', (o: O) => { tier(o).conditions = [null]; }],
    ['Immunität gegen Unbekanntes', (o: O) => { tier(o).immuneUntil = { pest: 3 }; }],
    ['Immunität mit Text', (o: O) => { tier(o).immuneUntil = { milben: 'lange' }; }],
    ['Immunität null', (o: O) => { tier(o).immuneUntil = null; }],
    ['Immunität als Zahl', (o: O) => { tier(o).immuneUntil = 5; }],
    ['Immunität: eine bekannte, eine unbekannte Krankheit', (o: O) => { tier(o).immuneUntil = { milben: 3, pest: 3 }; }],
    ['Immunität: ein Tag als Zahl, einer als Text', (o: O) => { tier(o).immuneUntil = { milben: 3, schnupfen: 'x' }; }],
    ['Mutter-ID negativ', (o: O) => { tier(o).motherId = -1; }],
    ['letzte Chance als Text', (o: O) => { tier(o).lastChanceUsed = 'ja'; }],
    ['draußen als Text', (o: O) => { tier(o).outside = 'ja'; }],
    ['Todesursache als Zahl', (o: O) => { tier(o, 1).deathCause = 5; }],
    ['Todestag als Text', (o: O) => { tier(o, 1).deathDay = 'gestern'; }],
    ['nextId gleich der höchsten Tier-ID', (o: O) => { o.nextId = Math.max(...o.animals.map((a: O) => a.id)); }],

    // Markt, Aufträge, Ereignisse
    ['Angebot null', (o: O) => { o.offers = [null]; }],
    ['Angebots-ID negativ', (o: O) => { o.offers[0].id = -1; }],
    ['Angebotsart unbekannt', (o: O) => { o.offers[0].kind = 'drache'; }],
    ['verstecktes Alter als Text', (o: O) => { o.offers[0].hiddenAge = 'alt'; }],
    ['versteckte Milben als Text', (o: O) => { o.offers[0].hiddenMites = 'ja'; }],
    ['geprüft als Text', (o: O) => { o.offers[0].checked = 'ja'; }],
    ['Auftrag null', (o: O) => { o.orders = [null]; }],
    ['Aufträge als Text', (o: O) => { o.orders = 'viele'; }],
    ['Auftrags-ID negativ', (o: O) => { o.orders[0].id = -1; }],
    ['Kunde mit 201 Zeichen', (o: O) => { o.orders[0].customer = text(201); }],
    ['Auftragsart unbekannt', (o: O) => { o.orders[0].kind = 'drache'; }],
    ['Auftragsart leer', (o: O) => { o.orders[0].kind = ''; }],
    ['Auftragsmenge als Text', (o: O) => { o.orders[0].qty = 'zehn'; }],
    ['Belohnung negativ', (o: O) => { o.orders[0].reward = -1; }],
    ['Fälligkeit als Text', (o: O) => { o.orders[0].dueDay = 'bald'; }],
    ['Ereignis leer', (o: O) => { o.events = [{ id: '', until: 3 }]; }],
    ['Marktversion als Text', (o: O) => { o.marketVersion = 'neu'; }],
    ['Temperatur 101 Grad', (o: O) => { o.temperature = 101; }],
    ['Eierpreis negativ', (o: O) => { o.eggPrice = -1; }],

    // Stall und Lager
    ['Wasser negativ', (o: O) => { o.water = -1; }],
    ['Futter negativ', (o: O) => { o.feed = -1; }],
    ['Futtersorte unbekannt', (o: O) => { o.feedType = 'kuchen'; }],
    ['Sauberkeit 101', (o: O) => { o.cleanliness = 101; }],
    ['Flatterband als Text', (o: O) => { o.flatterbandSince = 'x'; }],
    ['Kieselgur als Text', (o: O) => { o.kieselgurUntil = 'x'; }],
    ['Kräuter als Text', (o: O) => { o.kraeuterUntil = 'x'; }],
    ['eisfrei als Text', (o: O) => { o.iceFreeUntil = 'x'; }],
    ['Lagerbestand negativ', (o: O) => { o.inventory = { koerner: -1 }; }],
    ['Eier negativ', (o: O) => { o.eggs = { hybrid: -1 }; }],
    ['Nesteier negativ', (o: O) => { o.nestEggs = { hybrid: -1 }; }],
    ['Brutapparat mit unbekannter Rasse', (o: O) => { o.incubator[0].breed = 'drache'; }],
    ['Brutapparat mit null', (o: O) => { o.incubator = [null]; }],
    ['Brutapparat ohne Schierlampe', (o: O) => { o.incubator[0].candled = 'nein'; }],

    // Spätere Felder
    ['Weide mit einem Wert', (o: O) => { o.pasture = [50]; }],
    ['Weide über 100', (o: O) => { o.pasture = [50, 101]; }],
    ['Weideseite 2', (o: O) => { o.pastureSide = 2; }],
    ['Weidewechsel als Text', (o: O) => { o.pastureSwitchDay = 'x'; }],
    ['Licht als Text', (o: O) => { o.lightOn = 'an'; }],
    ['Tutorial als Text', (o: O) => { o.tutorialOff = 'aus'; }],
    ['Album-Eintrag null', (o: O) => { o.album = { hybrid: null }; }],
    ['Album-Tag als Text', (o: O) => { o.album = { hybrid: { day: 'x', name: 'Berta' } }; }],
    ['Ausstellung null', (o: O) => { o.show = null; }],
    ['Ausstellungstag als Text', (o: O) => { o.show.day = 'x'; }],
    ['Ausstellungstitel mit 201 Zeichen', (o: O) => { o.show.title = text(201); }],
    ['angemeldet als Text', (o: O) => { o.show.announced = 'ja'; }],
    ['letzte Ausstellung null', (o: O) => { o.lastShow = null; }],
    ['letzte Ausstellung ohne Titel', (o: O) => { o.lastShow.title = 5; }],
    ['letzte Ausstellung mit Tag als Text', (o: O) => { o.lastShow.day = 'x'; }],
    ['Ergebnis null', (o: O) => { o.lastShow.results = [null]; }],
    ['Ergebnis mit Tier-ID negativ', (o: O) => { o.lastShow.results[0].animalId = -1; }],
    ['Ergebnis mit Name 61 Zeichen', (o: O) => { o.lastShow.results[0].name = text(61); }],
    ['Ergebnis mit unbekannter Rasse', (o: O) => { o.lastShow.results[0].breed = 'drache'; }],
    ['Ergebnis mit Pokal als Text', (o: O) => { o.lastShow.results[0].trophy = 'ja'; }],
    ['Pokal null', (o: O) => { o.trophies = [null]; }],
    ['Pokaltag als Text', (o: O) => { o.trophies[0].day = 'x'; }],
    ['Pokaltitel mit 201 Zeichen', (o: O) => { o.trophies[0].title = text(201); }],
    ['Pokal mit Tiername 61 Zeichen', (o: O) => { o.trophies[0].animal = text(61); }],
    ['Finanzergebnis als Text', (o: O) => { o.finance.results = ['plus']; }],
    ['Rat-Tag als Text', (o: O) => { o.adviceDay = 'x'; }],
    ['Besuch mit Gruppe 201 Zeichen', (o: O) => { o.visit.group = text(201); }],
    ['Besuch mit Tag als Text', (o: O) => { o.visit.day = 'x'; }],
    ['Besuch zugesagt als Text', (o: O) => { o.visit.accepted = 'ja'; }],
    ['Besuchseffekt null-Objekt mit Text', (o: O) => { o.visitEffect = { until: 'x', points: 3 }; }],

    // Verlauf
    ['Ziel null', (o: O) => { o.goals = [null]; }],
    ['Ziel-ID mit 101 Zeichen', (o: O) => { o.goals[0].id = text(101); }],
    ['Zieltext als Zahl', (o: O) => { o.goals[0].text = 5; }],
    ['Ziel erledigt als Text', (o: O) => { o.goals[0].done = 'ja'; }],
    ['Tagebuch null', (o: O) => { o.log = [null]; }],
    ['Tagebuch-Tag als Text', (o: O) => { o.log[0].day = 'x'; }],
    ['Tagebuch-Stunde 25', (o: O) => { o.log[0].hour = 25; }],
    ['Tagebuch-Text als Zahl', (o: O) => { o.log[0].text = 5; }],
    ['Tagebuch-Art unbekannt', (o: O) => { o.log[0].kind = 'evil'; }],
    ['Hinweise als Text', (o: O) => { o.toasts = 'x'; }],
    ['Banner mit Zahl', (o: O) => { o.banners = [5]; }],
    ['Feier null', (o: O) => { o.celebrations = [null]; }],
    ['Feier mit Emoji 21 Zeichen', (o: O) => { o.celebrations[0].emoji = text(21); }],
    ['Feier mit Titel 201 Zeichen', (o: O) => { o.celebrations[0].title = text(201); }],
    ['Kapitel 0', (o: O) => { o.chapter = 0; }],
    ['Spielende als Text', (o: O) => { o.gameOver = 'nein'; }],
  ])('lehnt ab: %s', (_, aenderung) => {
    expect(pruefe(mit(aenderung))).toBe(false);
  });
});
