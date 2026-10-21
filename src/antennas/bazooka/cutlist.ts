import type { CutItem } from '../types';
import { type BazookaParams, calc } from './calc';

export function cutList(params: BazookaParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  return [
    {
      label: 'B',
      name: 'Seção de coaxial',
      quantity: 1,
      meters: m['B']!,
      adjustable: false,
      note: 'Na medida, mais alguns cm em cada ponta para descascar e fazer o curto. Os tocos (C) não se ajustam.',
    },
    {
      label: 'D',
      name: 'Fio da ponta',
      quantity: 2,
      meters: m['D']!,
      adjustable: true,
      note: 'Corte com sobra: cada fio uns 2,5 % de A a mais (a antena toda fica 5 % mais comprida), mais a volta no isolador. Encurte os dois por igual medindo a ROE.',
    },
  ];
}
