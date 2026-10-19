/**
 * Yagi pelo método DL6WU (ver `dl6wu.ts`): qualquer número de elementos. O comprimento do boom sai da tabela
 * de espaçamentos do DL6WU. Boom metálico com elementos soldados a ele (opção 1 do programa); `boomDiameter` = 0
 * significa boom isolante ou elementos isolados acima/abaixo dele, sem correção.
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { assertFactor, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import type { YagiParams } from './calc';
import {
  DL6WU_BOOM_FIT_MAX,
  DL6WU_BOOM_RANGE,
  DL6WU_CUT_TOLERANCE_LAMBDA,
  DL6WU_DBD_TO_DBI,
  DL6WU_REFLECTOR_REACTANCE,
  DL6WU_REFLECTOR_SPACING,
  beamwidthsDeg,
  boomCorrection,
  boomLength,
  directorLengths,
  directorPositions,
  estimatedGainDbd,
  foldedDrivenLength,
  reflectorLength,
} from './dl6wu';
import { meta } from './meta';

/**
 * Maior número de elementos aceito pela ferramenta. O programa original (DL6WU.BAS) vai a 102, mas o padrão de irradiação por momentos
 * custa O(N³) no navegador e só é calculado até 40; por isso a ferramenta não aceita mais que isso.
 */
export const DL6WU_MAX_ELEMENTS = 40;

export function calcDl6wu(params: YagiParams): CalcResult {
  const { frequencyMHz: f, elementCount: n, elementDiameter: d, boomDiameter: boom, drivenFactor: k } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro dos elementos');
  assertFactor(k, 'O fator de encurtamento do excitado');
  if (!Number.isFinite(boom) || boom < 0) {
    throw new RangeError(`O diâmetro do boom deve ser ≥ 0 (recebido: ${boom}).`);
  }
  if (!Number.isInteger(n) || n < 3 || n > DL6WU_MAX_ELEMENTS) {
    throw new RangeError(`No método DL6WU o número de elementos deve ser um inteiro de 3 a ${DL6WU_MAX_ELEMENTS} (recebido: ${n}).`);
  }
  const directorCount = n - 2;
  const lambda = wavelength(f);
  const dOverLambda = d / lambda;
  const boomOverLambda = boom / lambda;
  const boomExtra = boom > 0 ? boomCorrection(boomOverLambda, true) : 0;
  const directors = directorLengths(directorCount, dOverLambda).map((l) => (l + boomExtra) * lambda);
  const reflector = (reflectorLength(dOverLambda) + boomExtra) * lambda;
  const driven = (k * lambda) / 2;
  const positions = directorPositions(directorCount);
  const boomLambda = boomLength(directorCount);
  const foldedRef = foldedDrivenLength(dOverLambda) * lambda;

  const measurements: Measurement[] = [
    { label: 'R', name: 'Refletor', meters: reflector, description: 'Comprimento total do elemento, nas pontas.' },
    { label: 'DE', name: 'Elemento excitado', meters: driven, description: 'Dipolo ligado ao cabo; ajustável (ver ajuste).' },
    ...directors.map((meters, i) => ({
      label: `D${i + 1}`,
      name: `Diretor ${i + 1}`,
      meters,
      description: 'Comprimento total do elemento, nas pontas.',
    })),
    {
      label: 'E',
      name: 'Refletor ao excitado',
      meters: DL6WU_REFLECTOR_SPACING * lambda,
      description: 'Distância no boom entre o refletor e o elemento excitado (0,2λ).',
    },
    ...positions.map((p, i) => ({
      label: `P${i + 1}`,
      name: `Posição do diretor ${i + 1}`,
      meters: p * lambda,
      description: 'Distância do refletor ao centro deste diretor, ao longo do boom. O espaçamento cresce até o 14º diretor.',
    })),
    {
      label: 'L',
      name: 'Comprimento do boom (entre centros)',
      meters: boomLambda * lambda,
      description: 'Do refletor ao último diretor, medido entre os centros dos elementos. Some a sobra das pontas ao cortar o boom.',
    },
  ];

  const inRange = boomLambda >= DL6WU_BOOM_RANGE.min && boomLambda <= DL6WU_BOOM_RANGE.max;
  const gainDbd = estimatedGainDbd(boomLambda);
  const beams = beamwidthsDeg(gainDbd);

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (!inRange) {
    warnings.push({
      level: 'warning',
      message:
        `O boom de ${formatNumber(boomLambda, 2)}λ está fora da faixa do método DL6WU (${DL6WU_BOOM_RANGE.min} a ${DL6WU_BOOM_RANGE.max}λ, ou seja, ` +
        'a partir de 11 elementos). Os elementos e posições foram calculados com as mesmas equações, mas o método foi feito para Yagis longos e ' +
        'o ganho não é estimado. Para Yagis curtos, prefira o método NBS (3, 5 ou 6 elementos).',
    });
  }
  if (boomOverLambda > DL6WU_BOOM_FIT_MAX) {
    warnings.push({
      level: 'warning',
      message: `D/λ do boom = ${formatNumber(boomOverLambda, 3)} passa de ${DL6WU_BOOM_FIT_MAX}λ: a correção do boom só ajusta os dados do DL6WU até esse valor.`,
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        `Corte os elementos com tolerância de ${formatNumber(DL6WU_CUT_TOLERANCE_LAMBDA * lambda * 1000, 1)} mm (0,003λ), como o DL6WU pede. ` +
        'A correção de boom supõe elementos soldados ao boom metálico; com boom isolante informe 0.',
    },
    {
      level: 'warning',
      message:
        `O DL6WU calcula o excitado para um dipolo DOBRADO: ${formatNumber(foldedRef * 1000, 1)} mm com o diâmetro informado. O valor mostrado é λ/2 × K, ponto de ` +
        'partida para um dipolo simples. Corte comprido e ajuste medindo a ROE. Para o hairpin, use a ferramenta "Hairpin".',
    },
    {
      level: 'info',
      message:
        'Um Yagi é direcional: aponte a frente (lado dos diretores) para a estação. Use choke de corrente no coaxial, logo atrás do ponto de alimentação.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: tensão alta de RF nas pontas dos elementos e potência concentrada na frente (EIRP = potência × ganho). Mantenha pessoas e rede elétrica ' +
        'longe. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      {
        name: 'Projeto',
        value: `${n} elementos (refletor, excitado e ${directorCount} diretor${directorCount > 1 ? 'es' : ''}); boom de ${formatNumber(boomLambda, 2)}λ entre centros`,
        source: 'DL6WU (programa DL6WU.BAS, G3SEK, 2006): espaçamentos de 0,075λ a 0,4λ, constantes a partir do 14º diretor',
      },
      {
        name: 'Diâmetro dos elementos',
        value: `${formatNumber(d * 1000, 2)} mm (d/λ = ${formatNumber(dOverLambda, 4)})`,
        source: 'Mesmo diâmetro para os parasitas e o excitado',
      },
      {
        name: 'Boom',
        value:
          boom > 0
            ? `metálico, elementos soldados, ${formatNumber(boom * 1000, 1)} mm (D/λ = ${formatNumber(boomOverLambda, 4)}): +${formatNumber(boomExtra, 4)}λ nos parasitas`
            : 'isolante, sem correção',
        source: 'DL6WU.BAS, linha 890',
      },
      { name: 'Reatância do refletor', value: `${DL6WU_REFLECTOR_REACTANCE} Ω`, source: 'Recomendada pelo DL6WU (DL6WU.BAS, linha 1520)' },
      { name: 'Fator do excitado (K)', value: formatNumber(k, 3), source: 'λ/2 × K, ponto de partida (CLAUDE.md)' },
      {
        name: 'Larguras de feixe estimadas',
        value: `E ≈ ${formatNumber(beams.e, 0)}°, H ≈ ${formatNumber(beams.h, 0)}°`,
        source: 'Correlação de O. Duffy VK1OD (a partir de modelos NEC), em DL6WU.BAS; vale na faixa do método',
      },
    ],
    expected: {
      impedance: {
        unit: 'Ω',
        note:
          'O DL6WU dimensiona o excitado como dipolo dobrado (cerca de 4 vezes a impedância de um dipolo simples, para casar com 50 Ω por um balun 4:1). ' +
          'Com um dipolo simples a impedância cai bem abaixo de 50 Ω e precisa de casamento. Meça.',
        source: 'DL6WU.BAS, linhas 1530–1540 (comentário sobre o dipolo dobrado)',
      },
      gain: inRange
        ? {
            typical: gainDbd + DL6WU_DBD_TO_DBI,
            unit: 'dBi',
            note:
              `Estimativa do DL6WU: 9,2 + 3,39·ln(boom em λ) = ${formatNumber(gainDbd, 1)} dBd (+ 2,15 dB para dBi). ` +
              'O próprio programa avisa que o ganho real pode ser menor; vale para Yagis construídos com a tolerância de 0,003λ.',
            source: 'DL6WU.BAS, linhas 610 e 1340 (G. Hoch, DL6WU, VHF Communications 3/82)',
          }
        : {
            unit: 'dBi',
            note: 'Fora da faixa do método DL6WU (boom de 2,2 a 39λ): ganho não estimado.',
            source: 'DL6WU.BAS, linhas 400 e 540',
          },
      bandwidth: null,
    },
    warnings,
  };
}
