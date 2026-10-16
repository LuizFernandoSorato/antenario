import type { CutItem } from '../types';
import { type QfhParams, calc } from './calc';

export function cutList(params: QfhParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'A',
      name: 'Fio da espira maior',
      quantity: 1,
      meters: m['A']!,
      adjustable: true,
      note: 'Corte com sobra e ajuste medindo a ROE. As duas espiras têm comprimentos diferentes de propósito.',
    },
    {
      label: 'E',
      name: 'Fio da espira menor',
      quantity: 1,
      meters: m['E']!,
      adjustable: true,
      note: 'Mais curta que a maior. Não iguale as duas.',
    },
  ];
}
