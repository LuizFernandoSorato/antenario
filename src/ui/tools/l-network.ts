import { complex } from '../../core/complex';
import { formatEngineering, formatNumber } from '../../core/units';
import { type ReactiveComponent, designLNetwork } from '../../matching/l-network';
import type { CalcWarning } from '../../antennas/types';
import { type Tool, type ToolRow, type ToolSection, num } from './types';
import { lNetworkDiagram } from './diagrams';
import lNetworkGuide from './guides/l-network.md?raw';

const TOPOLOGY_TEXT = {
  'shunt-at-load': {
    title: 'elemento em paralelo junto à antena',
    series: 'Elemento em série (lado do rádio)',
    shunt: 'Elemento em paralelo (lado da antena)',
  },
  'series-at-load': {
    title: 'elemento em série junto à antena',
    series: 'Elemento em série (lado da antena)',
    shunt: 'Elemento em paralelo (lado do rádio)',
  },
} as const;

function componentRows(label: string, c: ReactiveComponent | null, withPower: boolean): ToolRow[] {
  if (!c) return [{ label, value: 'não precisa' }];
  const name = c.kind === 'inductor' ? 'Indutor' : 'Capacitor';
  const unit = c.kind === 'inductor' ? 'H' : 'F';
  const sign = c.reactanceOhms >= 0 ? '+' : '−';
  const rows: ToolRow[] = [
    {
      label,
      value: `${name} de ${formatEngineering(c.value, unit)}`,
      note: `Reatância ${sign}j${formatNumber(Math.abs(c.reactanceOhms), 1)} Ω`,
    },
  ];
  if (withPower) {
    rows.push({
      label: 'Tensão de pico / corrente eficaz nele',
      value: `${formatEngineering(c.peakVoltageV, 'V')} / ${formatEngineering(c.rmsCurrentA, 'A')}`,
    });
  }
  return rows;
}

export const lNetworkTool: Tool = {
  id: 'l-network',
  name: 'Rede L',
  guide: lNetworkGuide,
  description:
    'Dois componentes, um indutor e/ou um capacitor, casam qualquer impedância com parte resistiva ' +
    'com o cabo de 50 Ω. É o princípio de muitos acopladores de antena.',
  fields: [
    { kind: 'number', key: 'rl', label: 'Resistência da antena (R)', unit: 'Ω', defaultValue: 25 },
    {
      kind: 'number',
      key: 'xl',
      label: 'Reatância da antena (X)',
      unit: 'Ω',
      defaultValue: -30,
      help: 'Positiva = indutiva, negativa = capacitiva. Leia no NanoVNA (R + jX).',
    },
    { kind: 'number', key: 'z0', label: 'Impedância do sistema (Z0)', unit: 'Ω', defaultValue: 50 },
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 14.2 },
    { kind: 'number', key: 'powerW', label: 'Potência de transmissão', unit: 'W', defaultValue: 100, help: '0 = recepção.' },
  ],
  run(values) {
    const zLoad = complex(num(values, 'rl'), num(values, 'xl'));
    const z0 = num(values, 'z0');
    const fMHz = num(values, 'fMHz');
    const powerW = num(values, 'powerW');
    const solutions = designLNetwork({ zLoad, z0, fMHz, powerW });
    const withPower = powerW > 0;

    const sections: ToolSection[] = solutions.map((s, i) => {
      const text = TOPOLOGY_TEXT[s.topology];
      return {
        title: `Solução ${i + 1}: ${text.title}${s.lowPass ? ' (passa-baixas)' : ''}`,
        rows: [
          ...componentRows(text.series, s.series, withPower),
          ...componentRows(text.shunt, s.shunt, withPower),
        ],
      };
    });

    const warnings: CalcWarning[] = [];
    if (solutions.length === 0) {
      warnings.push({ level: 'warning', message: 'Nenhuma solução encontrada para esta carga.' });
    }
    if (solutions.some((s) => s.lowPass)) {
      warnings.push({
        level: 'info',
        message:
          'Em transmissão, prefira a solução passa-baixas (indutor em série, capacitor em paralelo): ' +
          'ela também atenua harmônicos do transmissor.',
      });
    }
    if (withPower) {
      warnings.push({
        level: 'danger',
        message:
          'Escolha capacitores com tensão de trabalho bem acima da tensão de pico indicada, e indutores ' +
          'com fio que suporte a corrente. Os valores consideram componentes ideais (sem perdas) e a ' +
          'potência entregue à antena; com ROE fora do casamento as tensões podem ser maiores.',
      });
    }
    warnings.push({
      level: 'info',
      message:
        'A impedância da antena muda com a frequência, então a rede casa bem só perto da frequência de ' +
        'projeto. Componentes reais têm tolerância: use capacitor variável ou ajuste as espiras medindo a ROE.',
    });

    return {
      diagrams: solutions.map((s, i) =>
        lNetworkDiagram({
          index: i,
          topology: s.topology,
          series: s.series,
          shunt: s.shunt,
          zLoadText: `${formatNumber(zLoad.re, 1)} ${zLoad.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(zLoad.im), 1)} Ω`,
          z0,
        }),
      ),
      sections,
      assumptions: [
        { name: 'Carga', value: `${formatNumber(zLoad.re, 1)} ${zLoad.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(zLoad.im), 1)} Ω` },
        { name: 'Fórmulas', value: 'Soluções analíticas da rede L', source: 'Pozar, Microwave Engineering, 4ª ed., §5.1' },
        { name: 'Componentes', value: 'Ideais (sem perdas, sem capacitância parasita)' },
        { name: 'Conferência', value: 'Cada solução é verificada numericamente (Z_in = Z0) antes de ser exibida' },
      ],
      warnings,
    };
  },
};
