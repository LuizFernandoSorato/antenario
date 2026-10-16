import type { CutItem } from '../types';
import { type YagiParams, calc } from './calc';

export function cutList(params: YagiParams): CutItem[] {
  const result = calc(params);
  const byLabel = new Map(result.measurements.map((m) => [m.label, m.meters]));
  const parasitic = result.measurements.filter((m) => m.label === 'R' || /^D\d+$/.test(m.label));
  return [
    ...parasitic.map((m) => ({
      label: m.label,
      name: m.name,
      quantity: 1,
      meters: m.meters,
      // O NBS pede tolerância de 0,003λ; os parasitas são cortados na medida, não ajustados.
      adjustable: false,
      ...(m.label === 'R' ? { note: 'Na medida (tolerância de 0,003λ).' } : {}),
    })),
    {
      label: 'DE',
      name: 'Elemento excitado',
      quantity: 1,
      meters: byLabel.get('DE')!,
      adjustable: true,
      note: 'Corte comprido e ajuste medindo a ROE.',
    },
  ];
}
