import { formatNumber } from '../../core/units';
import type { CutItem } from '../types';
import { type YagiParams, calc } from './calc';

export function cutList(params: YagiParams): CutItem[] {
  const result = calc(params);
  const byLabel = new Map(result.measurements.map((m) => [m.label, m.meters]));
  const parasitic = result.measurements.filter((m) => m.label === 'R' || /^D\d+$/.test(m.label));
  const arm = byLabel.get('DB');
  const gammaRod = byLabel.get('GL');
  const gammaItems: CutItem[] =
    gammaRod === undefined
      ? []
      : [
          {
            label: 'GL',
            name: 'Barra do gamma',
            quantity: 1,
            meters: gammaRod,
            adjustable: true,
            note: `Diâmetro GD = ${formatNumber(byLabel.get('GD')! * 1000, 2)} mm. Corte mais comprida que GL: a ponte de curto desliza no ajuste.`,
          },
        ];
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
    arm === undefined
      ? {
          label: 'DE',
          name: 'Elemento excitado',
          quantity: 1,
          meters: byLabel.get('DE')!,
          adjustable: true,
          note: 'Corte comprido e ajuste medindo a ROE.',
        }
      : {
          label: 'DB',
          name: 'Excitado: braço',
          quantity: 2,
          meters: arm,
          adjustable: true,
          note: 'Dois braços iguais, com o espaço central entre eles. Corte comprido e ajuste medindo a ROE, os dois por igual.',
        },
    ...gammaItems,
  ];
}
