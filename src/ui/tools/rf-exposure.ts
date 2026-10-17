import {
  averagePower,
  farFieldDistance,
  gainLinearFromDbi,
  powerDensity,
  safeDistance,
} from '../../core/exposure';
import { formatNumber } from '../../core/units';
import { EXPOSURE_LIMITS_SOURCE, type ExposureScenario, powerDensityLimit } from '../../data/rf-exposure-limits';
import type { CalcWarning } from '../../antennas/types';
import { type Tool, num, str } from './types';

function meters(m: number): string {
  return m < 1 ? `${formatNumber(m * 100, 0)} cm` : `${formatNumber(m, 2)} m`;
}

export const rfExposureTool: Tool = {
  id: 'rf-exposure',
  name: 'Exposição a RF: distância de segurança',
  description:
    'Estimativa da densidade de potência S = P·G / (4π·r²) em campo distante e da distância mínima para ficar abaixo ' +
    'do limite de referência da ICNIRP. É uma estimativa: serve para ter ordem de grandeza, não para atestar conformidade.',
  fields: [
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    {
      kind: 'number',
      key: 'powerW',
      label: 'Potência na antena',
      unit: 'W',
      defaultValue: 50,
      help: 'Potência que chega à antena (descontada a perda do cabo), portadora ou pico conforme o modo.',
    },
    { kind: 'number', key: 'gainDbi', label: 'Ganho da antena', unit: 'dBi', defaultValue: 2.15 },
    {
      kind: 'number',
      key: 'duty',
      label: 'Fração do tempo transmitindo',
      unit: '0 a 1',
      defaultValue: 1,
      help: 'Os limites são médias de 30 min. 1 = transmitindo o tempo todo (pior caso); use menos se a fonte do seu modo permitir.',
    },
    {
      kind: 'number',
      key: 'sizeM',
      label: 'Maior dimensão da antena',
      unit: 'm',
      defaultValue: 1,
      help: 'Serve só para avisar se a distância calculada está no campo distante (2D²/λ).',
    },
    {
      kind: 'number',
      key: 'distanceM',
      label: 'Distância da pessoa à antena',
      unit: 'm',
      defaultValue: 5,
    },
    {
      kind: 'select',
      key: 'scenario',
      label: 'Quem é exposto',
      defaultValue: 'public',
      options: [
        { value: 'public', label: 'Público em geral (vizinhos, família)' },
        { value: 'occupational', label: 'Ocupacional (operador consciente, treinado)' },
      ],
    },
  ],
  run(values) {
    const f = num(values, 'fMHz');
    const scenario = str(values, 'scenario') as ExposureScenario;
    const p = averagePower(num(values, 'powerW'), num(values, 'duty'));
    const g = gainLinearFromDbi(num(values, 'gainDbi'));
    const d = num(values, 'distanceM');
    const limit = powerDensityLimit(f, scenario);
    const warnings: CalcWarning[] = [];

    const assumptions = [
      { name: 'Modelo', value: 'Campo distante, espaço livre, sem reflexão no solo', source: 'S = P·G/(4π·r²) (CLAUDE.md)' },
      { name: 'Potência média considerada', value: `${formatNumber(p, 2)} W` },
      { name: 'Ganho linear', value: formatNumber(g, 3) },
      {
        name: 'Limite de referência',
        value: limit === null ? 'Não há densidade de potência na tabela até 30 MHz' : `${formatNumber(limit, 3)} W/m²`,
        source: `${EXPOSURE_LIMITS_SOURCE.document}, consultado em ${EXPOSURE_LIMITS_SOURCE.consulted}`,
      },
    ];

    if (limit === null) {
      warnings.push({
        level: 'danger',
        message:
          'Até 30 MHz (HF) a diretriz da ICNIRP usa campo elétrico e magnético em zona de campo próximo, não densidade de ' +
          'potência. Esta calculadora de campo distante NÃO se aplica. Para HF, avalie com os limites de campo E e H e com ' +
          'modelagem ou medição, e mantenha as pessoas bem afastadas de antenas baixas e de elementos alimentados.',
      });
      return {
        sections: [
          {
            title: 'Resultado',
            rows: [{ label: 'Densidade de potência', value: 'não aplicável abaixo de 30 MHz' }],
          },
        ],
        assumptions,
        warnings,
      };
    }

    const s = powerDensity(p, g, d);
    const safe = safeDistance(p, g, limit);
    const far = farFieldDistance(num(values, 'sizeM'), f);
    const ok = s <= limit;
    if (!ok) {
      warnings.push({
        level: 'danger',
        message: `A estimativa passa do limite a ${meters(d)}. Mantenha as pessoas além de ${meters(safe)} da antena ou reduza potência/ciclo.`,
      });
    }
    if (Math.min(d, safe) < far) {
      warnings.push({
        level: 'warning',
        message:
          `A distância está dentro do campo próximo da antena (início do campo distante em ≈ ${meters(far)}). Aí a fórmula ` +
          'não vale: os campos reais podem ser maiores ou menores. Use margem generosa.',
      });
    }
    warnings.push(
      {
        level: 'warning',
        message:
          'Estimativa. Reflexão no solo e em estruturas pode somar campos e passar do valor calculado; o lóbulo principal ' +
          'aponta o ganho para onde a antena aponta. Use margem de segurança.',
      },
      {
        level: 'info',
        message:
          'No Brasil, a Resolução Anatel nº 700/2018 adota os limites da ICNIRP, detalhados em Ato específico (hoje o Ato nº ' +
          '17.865, em vigor desde 01/03/2024). A minuta desse Ato usa os mesmos valores da ICNIRP 2020 aplicados aqui. ' +
          'Confira o texto vigente no site da Anatel.',
      },
    );

    return {
      sections: [
        {
          title: scenario === 'public' ? 'Público em geral' : 'Ocupacional',
          rows: [
            { label: `Densidade de potência a ${meters(d)}`, value: `${formatNumber(s, 3)} W/m²` },
            { label: 'Limite de referência', value: `${formatNumber(limit, 3)} W/m²` },
            { label: 'Situação a essa distância', value: ok ? 'abaixo do limite (estimativa)' : 'ACIMA do limite (estimativa)' },
            { label: 'Distância mínima para ficar abaixo do limite', value: meters(safe) },
            { label: 'Início do campo distante (2D²/λ)', value: meters(far) },
          ],
        },
      ],
      assumptions,
      warnings,
    };
  },
};
