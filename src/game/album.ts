// Hühner-Album: Jede Rasse und Farbvariante, die einmal auf dem Hof gelebt hat, wird freigeschaltet.
import { ALBUM_BREED_BONUS, ALBUM_FULL_BONUS, BREEDS } from './data';
import { addMoney, albumKey, albumTotal, breedLabel, log, stage } from './helpers';
import type { Animal, GameState } from './types';

/** Tier ins Album eintragen, sobald seine Farbe erkennbar ist (Küken sehen alle ähnlich aus) */
export function registerAlbum(s: GameState, a: Animal) {
  if (a.dead || stage(s, a) === 'kueken') return;
  s.album ??= {};
  const key = albumKey(a.breed, a.variant);
  if (s.album[key]) return;
  s.album[key] = { day: s.day, name: a.name };
  const n = Object.keys(s.album).length;
  log(s, `📒 Neu im Hühner-Album: ${breedLabel(a.breed, a.variant)} (${n}/${albumTotal()})`, 'good', true);

  const breed = BREEDS[a.breed];
  const breedDone = breed.variants.every(v => s.album![`${a.breed}:${v.id}`]);
  if (n === albumTotal()) {
    addMoney(s, ALBUM_FULL_BONUS, 'geschenke');
    log(s, `📒 Das Hühner-Album ist komplett! Der Geflügelzuchtverein schenkt dir ${ALBUM_FULL_BONUS} €.`, 'good');
    s.celebrations.push({ emoji: '📒', title: 'Album komplett!', lines: [
      `Alle ${albumTotal()} Rassen und Farbvarianten waren schon auf deinem Hof.`,
      `🏅 Der Geflügelzuchtverein ernennt dich zum Ehrenmitglied und schenkt dir ${ALBUM_FULL_BONUS} €.`,
    ] });
  } else if (breedDone) {
    addMoney(s, ALBUM_BREED_BONUS, 'geschenke');
    log(s, `📒 Alle Farben der Rasse ${breed.name} gesammelt: +${ALBUM_BREED_BONUS} €.`, 'good');
    s.celebrations.push({ emoji: '📒', title: `${breed.name}: alle Farben gesammelt!`, lines: [
      `${breed.variants.map(v => v.name).join(', ')}: Diese Rasse ist im Album komplett.`,
      `💰 Opa Heinz ist beeindruckt und gibt dir ${ALBUM_BREED_BONUS} €.`,
      `Im Album fehlen noch ${albumTotal() - n} Einträge.`,
    ] });
  }
}
