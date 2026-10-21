import type { CutItem } from '../types';
import { type InvertedVParams, calc } from './calc';

export function cutList(params: InvertedVParams): CutItem[] {
  const arm = calc(params).measurements.find((m) => m.label === 'B')!;
  return [
    {
      label: 'B',
      name: 'Braço',
      quantity: 2,
      meters: arm.meters,
      adjustable: true,
      note: 'Corte os dois iguais, com sobra (uns 2,5 % a mais, mais a volta no isolador), e encurte por igual nos dois lados medindo a ROE.',
    },
  ];
}
