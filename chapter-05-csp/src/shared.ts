import type { CSP } from './algorithms/index';

export const AUSTRALIA_CSP: CSP = {
  variables: ['WA', 'NT', 'Q', 'NSW', 'V', 'SA', 'T'],
  domains: new Map([
    ['WA', ['red', 'green', 'blue']],
    ['NT', ['red', 'green', 'blue']],
    ['Q', ['red', 'green', 'blue']],
    ['NSW', ['red', 'green', 'blue']],
    ['V', ['red', 'green', 'blue']],
    ['SA', ['red', 'green', 'blue']],
    ['T', ['red', 'green', 'blue']],
  ]),
  neighbors: new Map([
    ['WA', ['NT', 'SA']],
    ['NT', ['WA', 'SA', 'Q']],
    ['SA', ['WA', 'NT', 'Q', 'NSW', 'V']],
    ['Q', ['NT', 'SA', 'NSW']],
    ['NSW', ['Q', 'SA', 'V']],
    ['V', ['SA', 'NSW']],
    ['T', []],
  ]),
  constraints: (xi: string, vi: string, xj: string, vj: string) => vi !== vj,
};

export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  WA: { x: 80, y: 200 },
  NT: { x: 200, y: 120 },
  Q: { x: 320, y: 120 },
  NSW: { x: 320, y: 240 },
  V: { x: 280, y: 320 },
  SA: { x: 200, y: 240 },
  T: { x: 360, y: 400 },
};

export const AUSTRALIA_EDGES: ReadonlyArray<readonly [string, string]> = [
  ['WA', 'NT'], ['WA', 'SA'], ['NT', 'SA'], ['NT', 'Q'],
  ['SA', 'Q'], ['SA', 'NSW'], ['SA', 'V'], ['Q', 'NSW'], ['NSW', 'V'],
];

export const COLOR_HEX: Record<string, string> = {
  red: '#EF4444',
  green: '#10B981',
  blue: '#3B82F6',
};

export function colorToHex(color: string): string {
  return COLOR_HEX[color] ?? '#374151';
}
