import type { CutItem } from '../types';
import { type CrossYagiParams, calc } from './calc';

export function cutList(params: CrossYagiParams): CutItem[] {
  const result = calc(params);
  const byLabel = new Map(result.measurements.map((m) => [m.label, m.meters]));
  const parasitic = result.measurements.filter((m) => m.label === 'R' || /^D\d+$/.test(m.label));
  const items: CutItem[] = [
    ...parasitic.map((m) => ({
      label: m.label,
      name: m.name,
      quantity: 2, // um para cada Yagi (horizontal e vertical)
      meters: m.meters,
      // O NBS pede tolerância de 0,003λ; os parasitas são cortados na medida, não ajustados.
      adjustable: false,
      ...(m.label === 'R' ? { note: 'Na medida (tolerância de 0,003λ). Um por Yagi.' } : {}),
    })),
    {
      label: 'DE',
      name: 'Elemento excitado',
      quantity: 2,
      meters: byLabel.get('DE')!,
      adjustable: true,
      note: 'Corte comprido e ajuste medindo a ROE, os dois por igual.',
    },
    {
      label: 'F',
      name: 'Linha defasadora (coaxial de 1/4 de onda)',
      quantity: 1,
      meters: byLabel.get('F')!,
      adjustable: false,
      note: 'Define a defasagem de 90°. Meça sem a capa nas pontas e confira o VF.',
    },
  ];
  if (byLabel.has('T')) {
    items.push({
      label: 'T',
      name: 'Transformador de 1/4 de onda (junção → cabo)',
      quantity: 1,
      meters: byLabel.get('T')!,
      adjustable: false,
      note: 'Coaxial de impedância calculada (ver medidas).',
    });
  }
  return items;
}
