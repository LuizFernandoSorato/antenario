import type { CutItem } from '../types';
import { type DisconeParams, calc } from './calc';

/** Folha de corte com hastes: cada haste do cone mede a lateral (A); cada haste do disco, o raio (E). */
export function cutList(params: DisconeParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'A',
      name: 'Haste do cone (lateral)',
      quantity: params.rodCount,
      meters: m['A']!,
      adjustable: false,
      note: 'Para chapa, use a cota A como a geratriz do cone.',
    },
    {
      label: 'E',
      name: 'Haste do disco (raio)',
      quantity: params.rodCount,
      meters: m['E']!,
      adjustable: false,
      note: 'Para chapa, o disco tem diâmetro D.',
    },
  ];
}
