import type { CutItem } from '../types';
import { type MoxonParams, calc } from './calc';

export function cutList(params: MoxonParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'F',
      name: 'Metade do excitado',
      quantity: 2,
      meters: m['F']!,
      adjustable: false,
      note: 'Na medida. Marque o canto a B da ponta de fora e dobre a 90° com o meio da curva na marca.',
    },
    {
      label: 'G',
      name: 'Refletor',
      quantity: 1,
      meters: m['G']!,
      adjustable: false,
      note: 'Inteiro, na medida. Marque os dois cantos a D de cada ponta e dobre a 90°.',
    },
  ];
}
