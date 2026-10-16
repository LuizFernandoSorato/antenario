import type { CutItem } from '../types';
import { type HelicalParams, calc } from './calc';

export function cutList(params: HelicalParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'E',
      name: 'Fio da hélice',
      quantity: 1,
      meters: m['E']!,
      adjustable: false,
      note: 'Só as N voltas; some o terminal de ligação ao conector.',
    },
    {
      label: 'F',
      name: 'Refletor (diâmetro)',
      quantity: 1,
      meters: m['F']!,
      adjustable: false,
      note: 'Disco, tela ou grade metálica. Pode ser maior que o mínimo.',
    },
  ];
}
