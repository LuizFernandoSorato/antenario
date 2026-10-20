import { complex } from '../../core/complex';
import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { designHairpin } from '../../matching/hairpin';
import { type Tool, num } from './types';

export const hairpinTool: Tool = {
  id: 'hairpin',
  name: 'Hairpin (casamento de Yagi)',
  description:
    'Um grampo de dois fios em curto, ligado nos terminais do elemento excitado, vale uma indutância em paralelo. Ela cancela a ' +
    'reatância capacitiva de um elemento propositalmente curto. Informe a impedância medida do elemento (NanoVNA).',
  fields: [
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    { kind: 'number', key: 'r', label: 'Resistência do elemento (R)', unit: 'Ω', defaultValue: 20, help: 'Medida nos terminais do gap.' },
    {
      kind: 'number',
      key: 'x',
      label: 'Reatância do elemento (X)',
      unit: 'Ω',
      defaultValue: -24.5,
      help: 'Tem de ser negativa (elemento curto = capacitivo).',
    },
    {
      kind: 'number',
      key: 'z0',
      label: 'Impedância do sistema (Z0)',
      unit: 'Ω',
      defaultValue: 50,
      help: '50 Ω com balun 1:1; 200 Ω se o balun for 4:1 e a medição for no lado do elemento.',
    },
    { kind: 'number', key: 'spacingMm', label: 'Espaçamento entre os fios (centro a centro)', unit: 'mm', defaultValue: 20 },
    { kind: 'number', key: 'wireMm', label: 'Diâmetro do fio do grampo', unit: 'mm', defaultValue: 4 },
  ],
  run(values) {
    const fMHz = num(values, 'fMHz');
    const res = lengthResolutionForFrequency(fMHz);
    const z0 = num(values, 'z0');
    const r = designHairpin({
      zElement: complex(num(values, 'r'), num(values, 'x')),
      z0,
      fMHz,
      spacingM: num(values, 'spacingMm') / 1000,
      wireDiameterM: num(values, 'wireMm') / 1000,
    });
    return {
      sections: [
        {
          title: 'Grampo',
          rows: [
            { label: 'Comprimento do grampo (dos terminais à barra de curto)', value: formatLength(r.legLengthM, res), note: 'No ar. Corte comprido e encurte medindo.' },
            { label: 'Reatância indutiva necessária', value: `${formatNumber(r.hairpinReactance, 2)} Ω` },
            { label: 'Indutância equivalente', value: `${formatNumber(r.inductanceH * 1e9, 1)} nH` },
            { label: 'Impedância da linha de dois fios', value: `${formatNumber(r.lineImpedance, 0)} Ω` },
          ],
        },
        {
          title: 'Resultado esperado',
          rows: [
            { label: 'Resistência paralela obtida', value: `${formatNumber(r.parallelResistance, 1)} Ω` },
            { label: 'ROE contra Z0', value: `${formatNumber(r.swr, 2)}:1` },
            {
              label: 'Reatância do elemento para casamento exato',
              value: r.idealElementReactance === null ? 'não existe (R ≥ Z0)' : `${formatNumber(r.idealElementReactance, 2)} Ω`,
              note: 'Se a sua for diferente, encurte ou alongue o elemento até chegar perto.',
            },
          ],
        },
      ],
      assumptions: [
        { name: 'Modelo', value: 'Indutor ideal em paralelo (linha de dois fios em curto, no ar)', source: 'Teoria de linhas; Z = 276·log10(2D/d) (ARRL/Kraus)' },
        // TODO(fonte): fonte pendente para o texto abaixo.
        { name: 'Ignorado', value: 'Efeito dos cantos, da barra de curto e da proximidade do boom', source: 'Sem fonte citada' },
      ],
      warnings: [
        {
          level: 'warning',
          message:
            'O casamento é sensível: quanto menor a impedância do elemento, mais crítico o ajuste (relato de radioamadores). ' +
            // TODO(fonte): referência de engenharia para a faixa de uso.
            'Ajuste medindo com NanoVNA.',
        },
        {
          level: 'info',
          message:
            'Em transmissão: o grampo e a ponte de curto conduzem corrente alta; use fio grosso e solda ou parafuso firme. ' +
            'Use choke (balun de corrente) no cabo.',
        },
      ],
    };
  },
};
