import type { CutItem } from '../types';
import { type DipoleParams, calc } from './calc';

export function cutList(params: DipoleParams): CutItem[] {
  const arm = calc(params).measurements.find((m) => m.label === 'B')!;
  return [
    {
      label: 'B',
      name: 'Braço',
      quantity: 2,
      meters: arm.meters,
      adjustable: true,
      note: 'Corte os dois iguais e encurte por igual nos dois lados ao ajustar.',
    },
  ];
}
