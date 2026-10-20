import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { quarterWaveTransformer } from '../../matching/quarter-wave';
import { type Tool, cableAssumptions, cableField, getCable, num } from './types';
import { quarterWaveDiagrams } from './diagrams';
import quarterWaveGuide from './guides/quarter-wave.md?raw';

export const quarterWaveTool: Tool = {
  id: 'quarter-wave',
  name: 'Transformador de 1/4 de onda',
  guide: quarterWaveGuide,
  description:
    'Um pedaço de cabo de λ/4 com impedância Z_t = √(Z0·R) casa uma carga resistiva R com Z0. ' +
    'Ex.: 50 Ω → 100 Ω pede 70,7 Ω, e um cabo de 75 Ω fica bem perto.',
  fields: [
    { kind: 'number', key: 'z0', label: 'Impedância do sistema (Z0)', unit: 'Ω', defaultValue: 50 },
    {
      kind: 'number',
      key: 'loadOhms',
      label: 'Resistência da carga (antena)',
      unit: 'Ω',
      defaultValue: 100,
      help: 'A carga precisa ser resistiva no ponto em que o transformador é ligado.',
    },
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    { kind: 'number', key: 'maxSwr', label: 'ROE máxima aceitável (banda)', unit: ':1', defaultValue: 2 },
    cableField('cable', 'Cabo do transformador', 'belden-1694a', 'Define a impedância real e o fator de velocidade.'),
  ],
  run(values) {
    const z0 = num(values, 'z0');
    const loadOhms = num(values, 'loadOhms');
    const fMHz = num(values, 'fMHz');
    const maxSwr = num(values, 'maxSwr');
    const cable = getCable(values, 'cable');
    const res = lengthResolutionForFrequency(fMHz);
    const base = { z0, loadOhms, fMHz, maxSwr, velocityFactor: cable.velocityFactor };

    const ideal = quarterWaveTransformer(base);
    const single = quarterWaveTransformer({ ...base, actualLineOhms: cable.impedanceOhms });
    const pair = quarterWaveTransformer({ ...base, actualLineOhms: cable.impedanceOhms / 2 });

    const bw = ideal.fractionalBandwidth;
    const bandValue =
      bw === null
        ? '—'
        : Number.isFinite(bw)
          ? `${formatNumber(bw * 100, 1)} % (${formatNumber(ideal.bandEdgesMHz!.low, 2)} a ${formatNumber(ideal.bandEdgesMHz!.high, 2)} MHz)`
          : 'Toda a faixa: o descasamento nunca passa do limite';

    return {
      diagrams: quarterWaveDiagrams({ z0, loadOhms, idealOhms: ideal.idealLineOhms, cableName: cable.name, cableOhms: cable.impedanceOhms, singleLengthM: single.physicalLengthM, pairLengthM: pair.physicalLengthM, res }),
      sections: [
        {
          title: 'Transformador ideal',
          rows: [
            { label: 'Impedância ideal do cabo (Z_t)', value: `${formatNumber(ideal.idealLineOhms, 1)} Ω` },
            {
              label: `Banda com ROE ≤ ${formatNumber(maxSwr, 1)}:1`,
              value: bandValue,
              note: 'Pozar, Microwave Engineering, 4ª ed., §5.5 (linha TEM, um trecho).',
            },
          ],
        },
        {
          title: `Com um ${cable.name}`,
          rows: [
            { label: 'Comprimento do trecho (VF incluído)', value: formatLength(single.physicalLengthM, res) },
            { label: 'Impedância vista na entrada', value: `${formatNumber(single.inputOhms, 1)} Ω` },
            { label: 'ROE resultante na frequência central', value: `${formatNumber(single.swrAtCenter, 2)}:1` },
          ],
        },
        {
          title: `Com dois ${cable.name} em paralelo (${formatNumber(cable.impedanceOhms / 2, 1)} Ω)`,
          description: 'Dois cabos iguais lado a lado, vivos unidos e malhas unidas nas duas pontas.',
          rows: [
            { label: 'Comprimento de cada cabo', value: formatLength(pair.physicalLengthM, res) },
            { label: 'Impedância vista na entrada', value: `${formatNumber(pair.inputOhms, 1)} Ω` },
            { label: 'ROE resultante na frequência central', value: `${formatNumber(pair.swrAtCenter, 2)}:1` },
          ],
        },
      ],
      assumptions: [
        ...cableAssumptions(cable),
        { name: 'Z_t ideal', value: 'Z_t = √(Z0·R)', source: 'Pozar, Microwave Engineering, 4ª ed., §5.5' },
        { name: 'Comprimento', value: 'l = VF · λ/4, linha sem perdas' },
      ],
      warnings: [
        {
          level: 'warning',
          message:
            'O transformador só funciona com carga resistiva. Se a antena tiver reatância, ajuste-a ' +
            'para ressonância primeiro ou ligue o transformador num ponto da linha onde a impedância seja real.',
        },
        {
          level: 'info',
          message:
            'Os conectores também têm comprimento elétrico. Em UHF isso pesa: corte o trecho um pouco ' +
            'comprido e confira com NanoVNA. Com a ponta em aberto, um trecho de λ/4 aparece como curto ' +
            '(mínimo de |Z|) exatamente na frequência em que ele tem λ/4.',
        },
      ],
    };
  },
};
