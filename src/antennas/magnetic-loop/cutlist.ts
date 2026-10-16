import type { CutItem } from '../types';
import { type MagneticLoopParams, calc } from './calc';

export function cutList(params: MagneticLoopParams): CutItem[] {
  const b = calc(params).measurements.find((m) => m.label === 'B')!;
  return [
    {
      label: 'B',
      name: 'Tubo (ou coaxial) da espira',
      quantity: 1,
      meters: b.meters,
      adjustable: false,
      note: 'Corte e dobre num círculo. A sintonia é feita no capacitor, não no comprimento. O loop de acoplamento (cota C) é um pedaço à parte de ≈ π × C.',
    },
  ];
}
