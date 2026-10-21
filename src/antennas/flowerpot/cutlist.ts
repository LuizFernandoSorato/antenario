import type { CutItem } from '../types';
import { type FlowerpotParams, calc } from './calc';

export function cutList(params: FlowerpotParams): CutItem[] {
  const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters])) as Record<string, number>;
  const items: CutItem[] = [
    {
      label: 'A',
      name: 'Elemento de cima (tirar capa e malha)',
      quantity: 1,
      meters: m['A']!,
      adjustable: true,
      note: 'Na ponta do cabo. Deixe uns 2,5 % a mais e apare medindo a ROE.',
    },
    {
      label: 'B',
      name: 'Elemento de baixo (coaxial inteiro)',
      quantity: 1,
      meters: m['B']!,
      adjustable: false,
      note: 'Do fim da malha até a marca do início da bobina. Mesmo cabo, sem emenda.',
    },
  ];
  if (m['D'] !== undefined) {
    items.push({
      label: 'D',
      name: 'Coaxial da bobina',
      quantity: 1,
      meters: m['D'],
      adjustable: false,
      note: 'Mesmo cabo, logo depois de B. Depois da bobina, o resto do cabo vai até o rádio.',
    });
  }
  return items;
}
