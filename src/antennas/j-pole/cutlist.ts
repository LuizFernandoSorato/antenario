import type { CutItem } from '../types';
import { type JPoleParams, calc } from './calc';

export function cutList(params: JPoleParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'A',
      name: 'Elemento longo',
      quantity: 1,
      meters: m['A']!,
      adjustable: true,
      note: 'Radiador + seção de casamento numa peça só. A sobra fica no topo (radiador).',
    },
    {
      label: 'C',
      name: 'Elemento curto (seção de casamento)',
      quantity: 1,
      meters: m['C']!,
      adjustable: false,
    },
    {
      label: 'D',
      name: 'Ligação de base (curto)',
      quantity: 1,
      meters: m['D']!,
      adjustable: false,
      note: 'Distância centro a centro entre os elementos. Ajuste ao tê ou à conexão em U que você usar.',
    },
  ];
}
