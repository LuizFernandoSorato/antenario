import type { CutItem } from '../types';
import { type TurnstileParams, calc } from './calc';

export function cutList(params: TurnstileParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const items: CutItem[] = [
    {
      label: 'B',
      name: 'Braço do dipolo',
      quantity: 4,
      meters: m['B']!,
      adjustable: true,
      note: 'Corte com sobra e encurte aos poucos medindo a ROE, sempre os quatro por igual.',
    },
    {
      label: 'C',
      name: 'Linha de fase (coaxial de 1/4 de onda)',
      quantity: 1,
      meters: m['C']!,
      adjustable: false,
      note: 'Comprimento define a defasagem de 90°. Meça o cabo sem a capa nas pontas e confira o VF.',
    },
  ];
  if (m['D'] !== undefined) {
    items.push({
      label: 'D',
      name: 'Distância dipolos → refletor',
      quantity: 1,
      meters: m['D'],
      adjustable: true,
      // TODO(fonte): refine medindo a ROE.
      note: 'Distância de montagem (espaçadores), não uma peça.',
    });
  }
  return items;
}
