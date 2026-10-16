import type { CutItem } from '../types';
import { type GroundPlaneParams, calc } from './calc';

export function cutList(params: GroundPlaneParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'A',
      name: 'Radiador vertical',
      quantity: 1,
      meters: m['A']!,
      adjustable: true,
      note: 'Corte comprido e encurte aos poucos medindo a ROE.',
    },
    {
      label: 'B',
      name: 'Radial',
      quantity: params.radialCount,
      meters: m['B']!,
      adjustable: false,
      note: 'Todos do mesmo tamanho. A inclinação é o ajuste do casamento.',
    },
  ];
}
