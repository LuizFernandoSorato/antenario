/**
 * Quadra cúbica (cubical quad) com refletor, espira excitada e diretores.
 *
 * Perímetros das espiras: as fórmulas empíricas clássicas, com f em MHz e o comprimento em pés:
 *   refletor 1030/f, excitado 1005/f, diretor 975/f
 * (tabela de Carl O. Jelinek, N6VNG, https://www.qsl.net/ta1dx/amator/cubical_quad_antenna_design.htm,
 * consultada em 2026-10-16; a página não cita outra referência). Convertidas para metros com 1 ft = 0,3048 m. O perímetro do excitado dá ≈ 1,022λ (uma onda e um
 * pouco, por causa do efeito do fio), o refletor é ≈ 2,5 % maior e o diretor ≈ 3 % menor que ele.
 * São valores para fio fino, de uso comum; o diâmetro do fio e o ambiente deslocam a ressonância,
 * por isso o excitado precisa de ajuste. TODO(fonte): ARRL Antenna Book (capítulo de quads) para
 * confirmar as razões e a dependência do diâmetro do fio.
 */

import { assertFrequencyMHz, assertPositive, formatNumber, metersToInches } from '../../core/units';
import { wavelength } from '../../core/wave';
import { qBandwidthEstimate } from '../bandwidth';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';
import { quadQ } from './pattern-model';

export interface CubicQuadParams {
  frequencyMHz: number;
  /** Número de diretores (inteiro ≥ 0). */
  directorCount: number;
  /** Espaçamento entre elementos, em λ. */
  spacingLambda: number;
  /** Diâmetro do fio, em metros (só entra no modelo de padrão; os perímetros são para fio fino). */
  wireDiameter: number;
  /** Abertura do fio na alimentação da espira excitada, em metros; conta dentro do perímetro. */
  feedGap: number;
}

export const defaultParams: CubicQuadParams = {
  frequencyMHz: 145,
  directorCount: 1,
  spacingLambda: 0.2,
  // Premissa do modelo de padrão (era fixa em 2 mm); fio rígido comum, sem fonte.
  wireDiameter: 0.002,
  feedGap: 0.01,
};

const FT_IN_METERS = 0.3048;
/** Coeficientes (pés·MHz): perímetro = coeficiente / f(MHz). Fonte: ver o cabeçalho do arquivo. */
export const REFLECTOR_FT_MHZ = 1030;
export const DRIVEN_FT_MHZ = 1005;
export const DIRECTOR_FT_MHZ = 975;

/** Perímetro da espira (m) para o coeficiente em pés·MHz. */
export function loopPerimeter(coefficientFtMHz: number, fMHz: number): number {
  assertFrequencyMHz(fMHz);
  return (coefficientFtMHz * FT_IN_METERS) / fMHz;
}

export function calc(params: CubicQuadParams): CalcResult {
  const { frequencyMHz: f, directorCount: nDir, spacingLambda: s, wireDiameter: wd, feedGap: gap } = params;
  assertFrequencyMHz(f);
  assertPositive(wd, 'O diâmetro do fio');
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço de alimentação deve ser ≥ 0 (recebido: ${gap}).`);
  }
  if (!Number.isInteger(nDir) || nDir < 0) {
    throw new RangeError(`O número de diretores deve ser um inteiro ≥ 0 (recebido: ${nDir}).`);
  }
  if (!Number.isFinite(s) || s <= 0) {
    throw new RangeError(`O espaçamento deve ser positivo (recebido: ${s}).`);
  }

  const lambda = wavelength(f);
  const reflector = loopPerimeter(REFLECTOR_FT_MHZ, f);
  const driven = loopPerimeter(DRIVEN_FT_MHZ, f);
  const director = loopPerimeter(DIRECTOR_FT_MHZ, f);
  const spacing = s * lambda;
  const elements = 2 + nDir;
  const boom = (elements - 1) * spacing;
  if (gap >= driven / 4) {
    throw new RangeError('O espaço de alimentação é maior que um lado da espira excitada.');
  }
  const spreader = (reflector / 4) * Math.SQRT2; // diagonal da maior espira

  const measurements: Measurement[] = [
    { label: 'A', name: 'Lado da espira do refletor', meters: reflector / 4, description: 'Cada um dos 4 lados (perímetro ÷ 4).' },
    { label: 'B', name: 'Lado da espira excitada', meters: driven / 4, description: 'Cada um dos 4 lados.' },
    ...(nDir > 0
      ? [{ label: 'C', name: 'Lado da espira do diretor', meters: director / 4, description: 'Cada um dos 4 lados; todos os diretores são iguais.' }]
      : []),
    { label: 'D', name: 'Espaçamento entre elementos', meters: spacing, description: 'Entre espiras consecutivas, medido no boom.' },
    { label: 'E', name: 'Vareta (spreader)', meters: spreader, description: 'Diagonal da espira do refletor; duas por espira, cruzadas. Pode usar a mesma para todas.' },
    { label: 'F', name: 'Comprimento do boom (entre espiras)', meters: boom, description: 'Do refletor ao último elemento, entre centros; some folga nas pontas.' },
    { label: 'G', name: 'Fio do refletor', meters: reflector, description: 'Perímetro total, sem emendas.' },
    { label: 'H', name: 'Fio da espira excitada', meters: driven, description: 'Perímetro total, sem emendas.' },
    ...(nDir > 0
      ? [{ label: 'I', name: 'Fio de cada diretor', meters: director, description: 'Perímetro total, sem emendas.' }]
      : []),
    ...(gap > 0
      ? [
          { label: 'J', name: 'Fio a cortar da espira excitada', meters: driven - gap, description: 'H menos o espaço de alimentação: o fio é aberto no meio do lado de baixo.' },
          { label: 'K', name: 'Espaço de alimentação', meters: gap, description: 'Abertura entre as duas pontas do fio, no meio do lado de baixo; já conta dentro de H.' },
        ]
      : []),
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (s < 0.15 || s > 0.25) {
    warnings.push({
      level: 'warning',
      message:
        `Espaçamento de ${formatNumber(s, 2)}λ fora de 0,15λ a 0,25λ. Abaixo de ≈ 0,15λ a impedância cai e precisa de casamento; ` +
        'as fórmulas de perímetro não foram verificadas nessa faixa.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'Os perímetros são fórmulas empíricas para fio fino. Corte o fio da espira excitada comprido (uma sobra) e ajuste ' +
        'medindo a ROE. Isso vale mais que a precisão da fórmula.',
    },
    {
      level: 'warning',
      message:
        'O ganho mostrado é uma soma aproximada, de fonte secundária, com incerteza de vários dB.',
      // TODO(fonte): ARRL Antenna Book, com o ganho de quads de 2, 3 e 4 elementos.
    },
    {
      level: 'info',
      message:
        'Polarização: alimente no meio do lado de baixo para horizontal, ou no meio de um dos lados verticais para vertical. ' +
        'Use balun/choke de corrente no coaxial.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: os cantos das espiras têm tensão alta de RF e o ganho concentra a potência na frente (EIRP = potência × ' +
        'ganho). Mantenha pessoas e rede elétrica longe. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  // Banda pelo Q da espira excitada no modelo por momentos (pattern-model.ts; o teste de lá confere o Q contra a varredura).
  const { z0, q, directivity } = quadQ({ measurements }, f, nDir, wd);
  const direct = Math.max(z0.re / 50, 50 / z0.re);
  const bandwidth = qBandwidthEstimate(f, q, {
    // O Q vale para uma ressonância isolada: quando outra espira ressoa perto (no modelo, com 2 diretores), a faixa real é maior.
    // Espaço livre, fio de cobre ideal, sem varetas nem boom. Q de Yaghjian e Best, IEEE 2005 (fórmulas via arXiv 1909.08019).
    note:
      `Direto em 50 Ω (R ≈ ${formatNumber(z0.re, 0)} Ω) a ROE mínima seria ≈ ${formatNumber(direct, 1)}:1. ` +
      'Conservadora se outra espira ressoar perto.',
    source: 'Momentos desta ferramenta e Q de Yaghjian e Best (IEEE, 2005); sem comparação com medida',
  });

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Perímetro do excitado', value: `${formatNumber(driven / lambda, 4)}λ`, source: 'N6VNG: 1005/f (ft, MHz)' },
      { name: 'Perímetro do refletor', value: `${formatNumber(reflector / lambda, 4)}λ (+${formatNumber((reflector / driven - 1) * 100, 1)} %)`, source: 'N6VNG: 1030/f (ft, MHz)' },
      { name: 'Perímetro do diretor', value: `${formatNumber(director / lambda, 4)}λ (${formatNumber((director / driven - 1) * 100, 1)} %)`, source: 'N6VNG: 975/f (ft, MHz)' },
      { name: 'Elementos', value: `${elements}: refletor, excitado e ${nDir} diretor${nDir === 1 ? '' : 'es'}` },
      { name: 'Espaçamento', value: `${formatNumber(s, 3)}λ (${formatNumber(metersToInches(spacing), 1)} pol)`, source: 'Electronics Notes: 0,15λ a 0,2λ → ≈ 50 Ω' },
      // TODO(fonte): efeito do diâmetro nos perímetros.
      { name: 'Diâmetro do fio', value: `${formatNumber(wd * 1000, 2)} mm: entra só no padrão e na impedância do modelo por momentos; os perímetros são para fio fino`, source: 'Sem fonte citada' },
      { name: 'Espaço de alimentação', value: `${formatNumber(gap * 1000, 1)} mm (dentro do perímetro H)`, source: 'Dado do usuário; comprimento total, como no dipolo' },
    ],
    expected: {
      // Impedância e ganho do modelo por momentos (pattern-model.ts). O Electronics Notes (fonte secundária) fala em ≈ 50 Ω com 2
      // elementos a 0,15–0,2λ e ≈ 75 Ω acima de 0,25λ; o modelo dá ≈ 80 Ω a 0,2λ. Divergência não resolvida. TODO(fonte): ARRL Antenna
      // Book ou medida. A soma aditiva de ganho usada antes (Electronics Notes, sem fonte primária) dava 1,6 a 2,6 dB a mais.
      impedance: {
        typical: z0.re,
        unit: 'Ω',
        note:
          `Espira excitada no modelo: ${formatNumber(z0.re, 0)} ${z0.im < 0 ? '−' : '+'} j${formatNumber(Math.abs(z0.im), 0)} Ω (espaço livre, ` +
          'fio ideal, sem varetas nem boom). O Electronics Notes cita ≈ 50 Ω com 2 elementos a 0,15–0,2λ; o modelo não confirma. Meça.',
        source: 'Momentos desta ferramenta; Electronics Notes (fonte secundária, diverge)',
      },
      gain: {
        typical: 10 * Math.log10(directivity),
        unit: 'dBi',
        note: 'Diretividade do modelo na frente, no espaço livre e sem perdas. O real fica um pouco abaixo.',
        source: 'Momentos desta ferramenta; sem comparação com medida',
      },
      bandwidth,
    },
    warnings,
  };
}

// TODO(fonte) [guide.md]: fonte pendente: «ferramenta "Transformador de 1/4 de onda"). Para casar, veja as ferramentas de rede L e de…»
// TODO(fonte) [guide.md]: conferir razões e ganho.
