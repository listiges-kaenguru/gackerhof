import type { GameState } from './types';

// Deterministischer Zufall (mulberry32). Der Zustand liegt im Spielstand,
// damit Simulationen reproduzierbar und testbar sind.
export function rand(s: GameState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (s: GameState, p: number) => rand(s) < p;
export const between = (s: GameState, a: number, b: number) => a + rand(s) * (b - a);
export const intBetween = (s: GameState, a: number, b: number) => Math.floor(between(s, a, b + 1));
export function pick<T>(s: GameState, arr: readonly T[]): T {
  return arr[Math.floor(rand(s) * arr.length)];
}
