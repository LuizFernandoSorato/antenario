import type { CutItem } from '../types';
import { type CubicQuadParams, calc } from './calc';

export function cutList(params: CubicQuadParams): CutItem[] {
  const result = calc(params);
  const m = Object.fromEntries(result.measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const elements = 2 + params.directorCount;
  return [
    { label: 'G', name: 'Fio do refletor', quantity: 1, meters: m['G']!, adjustable: false, note: 'Perímetro sem emendas; some o fio das voltas de fixação.' },
    {
      label: 'H',
      name: 'Fio da espira excitada',
      quantity: 1,
      meters: m['H']!,
      adjustable: true,
      note: 'Corte comprido e encurte aos poucos medindo a ROE.',
    },
    ...(params.directorCount > 0
      ? [{ label: 'I', name: 'Fio de cada diretor', quantity: params.directorCount, meters: m['I']!, adjustable: false }]
      : []),
    { label: 'E', name: 'Vareta (spreader)', quantity: 2 * elements, meters: m['E']!, adjustable: false, note: 'Duas por espira, todas do tamanho da maior.' },
    { label: 'F', name: 'Boom (entre espiras)', quantity: 1, meters: m['F']!, adjustable: false, note: 'Acrescente folga nas duas pontas e para a fixação no mastro.' },
  ];
}
