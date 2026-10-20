import { formatNumber, formatLength, lengthResolutionForFrequency } from '../../core/units';
import { wavelengthInLine } from '../../core/wave';
import { analyzeFeedline } from '../../lines/coax';
import { type Tool, cableAssumptions, cableField, getCable, num } from './types';
import { cableFlowDiagram, coaxCrossSectionDiagram } from './diagrams';
import cableGuide from './guides/cable-loss.md?raw';

function db(value: number | null): string {
  return value === null ? '—' : `${formatNumber(value, 2)} dB`;
}

function swr(value: number | null): string {
  return value === null ? '—' : `${formatNumber(value, 2)}:1`;
}

export const cableLossTool: Tool = {
  id: 'cable-loss',
  name: 'Perdas no cabo coaxial',
  guide: cableGuide,
  description:
    'Quanto do sinal se perde no cabo, como a ROE da antena aparece no rádio e se o cabo aguenta a ' +
    'potência de transmissão. Dados de atenuação e potência vêm do datasheet de cada cabo.',
  fields: [
    cableField('cable', 'Cabo', 'belden-8267'),
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    { kind: 'number', key: 'lengthM', label: 'Comprimento do cabo', unit: 'm', defaultValue: 20 },
    {
      kind: 'number',
      key: 'swrAtLoad',
      label: 'ROE na antena',
      unit: ':1',
      defaultValue: 1.5,
      help: 'Medida na antena (ou estimada). 1 = casamento perfeito.',
    },
    {
      kind: 'number',
      key: 'powerW',
      label: 'Potência de transmissão',
      unit: 'W',
      defaultValue: 50,
      help: 'Use 0 para recepção.',
    },
  ],
  run(values) {
    const cable = getCable(values, 'cable');
    const fMHz = num(values, 'fMHz');
    const lengthM = num(values, 'lengthM');
    const powerW = num(values, 'powerW');
    const r = analyzeFeedline({ cable, fMHz, lengthM, swrAtLoad: num(values, 'swrAtLoad'), powerW });

    const sections = [
      {
        title: 'Perdas',
        rows: [
          {
            label: 'Atenuação do cabo nessa frequência',
            value: r.attenuationDbPer100m === null ? '—' : `${formatNumber(r.attenuationDbPer100m, 2)} dB/100 m`,
          },
          { label: 'Perda casada (ROE 1:1)', value: db(r.matchedLossDb) },
          { label: 'Perda adicional pela ROE', value: db(r.swrLossDb) },
          { label: 'Perda total', value: db(r.totalLossDb) },
          {
            label: 'Fração da potência perdida no cabo',
            value: r.lossFraction === null ? '—' : `${formatNumber(r.lossFraction * 100, 1)} %`,
          },
          ...(powerW > 0
            ? [
                {
                  label: 'Potência que chega à antena',
                  value: r.powerAtLoadW === null ? '—' : `${formatNumber(r.powerAtLoadW, 1)} W`,
                },
              ]
            : []),
        ],
      },
      {
        title: 'ROE',
        rows: [
          { label: 'Na antena', value: swr(num(values, 'swrAtLoad')) },
          {
            label: 'No rádio (entrada do cabo)',
            value: swr(r.inputSwr),
            note: 'Menor que na antena: a perda do cabo atenua a onda refletida na ida e na volta.',
          },
        ],
      },
      {
        title: 'Limites para transmissão',
        rows: [
          {
            label: 'Potência máxima do datasheet (ROE 1:1)',
            value: r.ratedPowerW === null ? 'sem dado' : `${formatNumber(r.ratedPowerW, 0)} W`,
          },
          {
            label: 'Tensão de pico estimada no cabo',
            value: r.peakVoltageV === null ? '—' : `${formatNumber(r.peakVoltageV, 0)} V`,
            note: 'Limite superior conservador ao longo do cabo.',
          },
          {
            label: 'Especificação de tensão do cabo',
            value: cable.voltageRating ? `${formatNumber(cable.voltageRating.volts, 0)} V` : 'sem dado',
            ...(cable.voltageRating ? { note: cable.voltageRating.kind } : {}),
          },
        ],
      },
      {
        title: 'Cabo',
        rows: [
          { label: 'Impedância', value: `${cable.impedanceOhms} Ω` },
          { label: 'Fator de velocidade', value: formatNumber(cable.velocityFactor, 2) },
          { label: 'Diâmetro externo', value: `${formatNumber(cable.outerDiameterMm, 1)} mm` },
          { label: 'Dielétrico', value: cable.dielectric },
          {
            label: 'Comprimento elétrico',
            value: `${formatNumber(r.electricalLengthWavelengths, 3)} λ`,
            note: `λ dentro do cabo = ${formatLength(wavelengthInLine(fMHz, cable.velocityFactor), lengthResolutionForFrequency(fMHz))}`,
          },
          { label: 'Observações', value: cable.notes },
        ],
      },
    ];

    return {
      diagrams: [
        cableFlowDiagram({ powerW, powerAtLoadW: r.powerAtLoadW, lossDb: r.totalLossDb, lossFraction: r.lossFraction, lengthM, cableName: cable.name }),
        coaxCrossSectionDiagram({ cableName: cable.name, outerDiameterMm: cable.outerDiameterMm, dielectric: cable.dielectric, impedanceOhms: cable.impedanceOhms }),
      ],
      sections,
      assumptions: [
        ...cableAssumptions(cable),
        {
          name: 'Interpolação',
          value: 'Log-log entre os pontos da tabela do fabricante; sem extrapolação.',
        },
        {
          name: 'Perda total com ROE',
          value: 'TL = 10·log10[(a² − |Γ|²)/(a(1 − |Γ|²))], a = 10^(perda casada/10)',
          source: 'ARRL Antenna Book, capítulo sobre linhas de transmissão',
        },
        ...(cable.powerConditions ? [{ name: 'Condições da potência máxima', value: cable.powerConditions }] : []),
        { name: 'Linha', value: 'Z0 real; ROE na antena em relação à impedância nominal do cabo' },
      ],
      warnings: r.warnings,
    };
  },
};
