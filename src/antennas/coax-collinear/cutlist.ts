import type { CutItem } from '../types';
import { type CoaxCollinearParams, calc } from './calc';

export function cutList(params: CoaxCollinearParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'A',
      name: 'Chicote do topo',
      quantity: 1,
      meters: m['A']!,
      adjustable: true,
      note: 'Corte comprido e encurte de 2 a 3 mm por vez medindo a ROE.',
    },
    {
      label: 'B',
      name: 'Seção de meia onda (coaxial)',
      quantity: params.sections,
      meters: m['B']!,
      adjustable: false,
      note: 'Todas iguais. Some a sobra das ligações (alguns mm por ponta).',
    },
    {
      label: 'C',
      name: 'Seção de baixo (coaxial, 1/4 de onda)',
      quantity: 1,
      meters: m['C']!,
      adjustable: false,
      note: 'Transformador de 1/4 de onda, mesma regra do VF.',
    },
  ];
}
