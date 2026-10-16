/**
 * Turnstile: dois dipolos de meia onda cruzados a 90°, alimentados em quadratura.
 *
 * Fontes:
 *  - Princípio (dois dipolos idênticos em ângulo reto, correntes defasadas de 90°, sentido da polarização dado pelo
 *    sinal da defasagem; refletor plano a 1/4 de onda atrás dos elementos soma as ondas direta e refletida e dá +3 dB;
 *    modo normal: diagrama horizontal quase omni, desvio de ±5 %): Wikipedia, "Turnstile antenna",
 *    https://en.wikipedia.org/wiki/Turnstile_antenna (consultada em 2026-10-16), que cita Kraus, "Antennas", 2ª ed.,
 *    1988, pp. 726–729; Milligan, "Modern Antenna Design", 2ª ed., 2005, pp. 231–237; G. Brown, US 2.086.976.
 *    Os livros NÃO foram consultados diretamente.
 *  - Dipolo: comprimento K·λ/2 e Z ≈ 73 Ω, como em antennas/dipole (Balanis, §4.6).
 *  - Fase por linha de 1/4 de onda: teoria de linhas de transmissão (Pozar, "Microwave Engineering", cap. 2).
 *
 * Derivação da alimentação (sem coeficiente empírico): com o acoplamento mútuo desprezado (os dipolos são ortogonais),
 * o dipolo A liga direto no ponto de alimentação e o dipolo B por uma linha de 1/4 de onda de impedância Zq. Para uma
 * linha de 1/4 de onda, V_in = jZq·I_L, então I_B = −j·V/Zq e I_A = V/R. A razão I_B/I_A = −j·R/Zq tem módulo 1
 * quando Zq = R: correntes iguais e a 90°. A impedância no ponto de alimentação é R ∥ (Zq²/R) = R/2 ≈ 36,5 Ω.
 * TODO(fonte): o efeito do refletor sobre R (a 1/4 de onda o valor muda) e as dimensões do refletor.
 */

import { type Complex, abs, complex } from '../../core/complex';
import { reflectionCoefficient, swrFromGamma } from '../../core/reflection';
import { assertFrequencyMHz, formatNumber } from '../../core/units';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface TurnstileParams {
  frequencyMHz: number;
  /** Fator de encurtamento K dos dipolos, em (0, 1]. */
  shorteningFactor: number;
  /** Fator de velocidade do coaxial de fase, em (0, 1]. */
  velocityFactor: number;
  /** 1 = com refletor a 1/4 de onda; 0 = sem refletor. */
  reflector: number;
}

export const defaultParams: TurnstileParams = {
  frequencyMHz: 137.5,
  shorteningFactor: 0.95,
  velocityFactor: 0.66,
  reflector: 1,
};

/** Resistência de radiação do dipolo fino de meia onda no espaço livre (Ω): Balanis, §4.6. */
export const DIPOLE_RESISTANCE_OHMS = 73;

export interface QuadratureFeed {
  /** Módulo da razão |I_B/I_A| (1 = correntes iguais). */
  currentRatio: number;
  /** Fase de I_B em relação a I_A (graus): −90°. */
  phaseDeg: number;
  /** Impedância no ponto de alimentação (Ω). */
  feedImpedance: Complex;
}

/**
 * Dipolo A direto e dipolo B por linha de 1/4 de onda de impedância `zLine`, ambos com resistência `r`:
 * I_B/I_A = −j·r/zLine; Z_feed = r ∥ (zLine²/r).
 */
export function quadratureFeed(r: number, zLine: number): QuadratureFeed {
  if (!(r > 0) || !(zLine > 0)) throw new RangeError('As impedâncias devem ser positivas.');
  const ratio = r / zLine;
  const zB = (zLine * zLine) / r;
  return { currentRatio: ratio, phaseDeg: -90, feedImpedance: complex((r * zB) / (r + zB), 0) };
}

export function calc(params: TurnstileParams): CalcResult {
  const { frequencyMHz: f, shorteningFactor: k, velocityFactor: vf } = params;
  assertFrequencyMHz(f);
  assertFactor(k, 'O fator de encurtamento K');
  assertFactor(vf, 'O fator de velocidade');
  if (params.reflector !== 0 && params.reflector !== 1) {
    throw new RangeError('O parâmetro "com refletor" deve ser 0 ou 1.');
  }
  const withReflector = params.reflector === 1;

  const lambda = wavelength(f);
  const total = physicalLength(0.5, f, k);
  const phasing = physicalLength(0.25, f, vf);
  const spacing = lambda / 4;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Comprimento total de cada dipolo', meters: total, description: 'Dois dipolos iguais, de ponta a ponta. Corte com sobra.' },
    { label: 'B', name: 'Cada braço', meters: total / 2, description: 'Do terminal central até a ponta. São quatro braços iguais no total.' },
    { label: 'C', name: 'Linha de fase (1/4 de onda de coaxial)', meters: phasing, description: 'Trecho de coaxial de 1/4 de onda com o VF do cabo, entre o ponto de alimentação e o segundo dipolo.' },
  ];
  if (withReflector) {
    measurements.push({ label: 'D', name: 'Distância ao refletor', meters: spacing, description: 'Do plano dos dipolos até o refletor, 1/4 de onda no ar.' });
  }

  const feed = quadratureFeed(DIPOLE_RESISTANCE_OHMS, DIPOLE_RESISTANCE_OHMS);
  const zFeed = feed.feedImpedance.re;
  const swr50 = swrFromGamma(abs(reflectionCoefficient(feed.feedImpedance, 50)));

  const gain: Estimate = withReflector
    ? {
        unit: 'dBic',
        note:
          'O refletor a 1/4 de onda soma 3 dB ao ganho do turnstile sem refletor (fonte: Wikipedia, citando Milligan). Não há valor absoluto ' +
          'com fonte aqui. TODO(fonte): ganho em dBic.',
        source: 'Wikipedia, "Turnstile antenna" (Milligan, 2005). TODO(fonte)',
      }
    : {
        unit: 'dBi',
        note:
          'Sem refletor, o diagrama horizontal é quase omnidirecional (desvio de ±5 % segundo Kraus, via Wikipedia). Não há valor de ganho ' +
          'com fonte aqui. TODO(fonte).',
        source: 'Wikipedia, "Turnstile antenna" (Kraus, 1988). TODO(fonte)',
      };

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (vf < 0.6 || vf > 0.9) {
    warnings.push({
      level: 'warning',
      message:
        `Fator de velocidade ${formatNumber(vf, 2)} é incomum para coaxial (polietileno sólido ≈ 0,66; espuma 0,78 a 0,85). ` +
        'Confira o datasheet: o VF define a defasagem de 90°.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        `A linha de fase ideal tem impedância igual à resistência de cada dipolo (≈ ${DIPOLE_RESISTANCE_OHMS} Ω; coaxial de 75 Ω é o mais próximo). ` +
        'Assim as duas correntes têm o mesmo módulo e 90° de defasagem. Com outro cabo (50 Ω) as correntes ficam desiguais ' +
        'e a polarização deixa de ser perfeitamente circular. Um erro no VF desloca a defasagem.',
    },
    {
      level: 'warning',
      message:
        `Impedância no ponto de alimentação ≈ ${formatNumber(zFeed, 1)} Ω (dois dipolos de ${DIPOLE_RESISTANCE_OHMS} Ω em paralelo), ` +
        `ROE ≈ ${formatNumber(swr50, 2)}:1 em 50 Ω, sem refletor. ` +
        (withReflector
          ? 'Com o refletor a 1/4 de onda a resistência de cada dipolo muda e este valor não vale; meça. TODO(fonte): valor com o refletor.'
          : 'Meça: o solo e os objetos próximos alteram esse valor.'),
    },
    {
      level: 'warning',
      message:
        'Os dipolos se cruzam no centro: isole um do outro (um fica levemente acima do outro, com isolador). Se os eixos não ' +
        'forem a 90° ou os braços diferirem, a polarização deixa de ser circular.',
    },
    {
      level: 'info',
      message:
        'O sentido da polarização (direita ou esquerda) depende do sinal da defasagem de 90°: inverta qual dipolo recebe a linha de fase para trocar. ' +
        'Satélites meteorológicos de 137 MHz usam polarização circular à direita; confirme para o seu satélite.',
    },
    {
      level: 'info',
      message:
        'Há outras formas de obter os 90° (divisor com defasador, ou dipolos de comprimentos diferentes, um indutivo e outro capacitivo; Kraus, via Wikipedia). ' +
        'Esta ferramenta calcula só a linha de 1/4 de onda.',
    },
    {
      level: 'info',
      message:
        'Dimensões do refletor (tamanho, tela ou hastes) não constam das fontes consultadas. TODO(fonte). Um refletor maior que os dipolos é o ponto ' +
        'de partida lógico; modele ou meça.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: as pontas dos dipolos ficam em tensão alta de RF e a linha de fase conduz corrente. Instale fora do alcance de pessoas e ' +
        'longe de rede elétrica, use choke no cabo e confira a potência máxima do coaxial. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Fator de encurtamento dos dipolos (K)', value: formatNumber(k, 3), source: 'Como no dipolo; dado do usuário' },
      { name: 'Fator de velocidade do coaxial de fase (VF)', value: formatNumber(vf, 3), source: 'Dado do usuário; datasheet do cabo' },
      { name: 'Resistência de cada dipolo', value: `${DIPOLE_RESISTANCE_OHMS} Ω (espaço livre)`, source: 'Balanis, Antenna Theory, §4.6' },
      { name: 'Impedância da linha de fase', value: `${DIPOLE_RESISTANCE_OHMS} Ω (igual à do dipolo)`, source: 'Teoria de linhas de 1/4 de onda (Pozar)' },
      { name: 'Defasagem', value: '90° (linha de 1/4 de onda)', source: 'Wikipedia (Kraus; Brown, US 2.086.976)' },
      { name: 'Refletor', value: withReflector ? 'Plano, a 1/4 de onda atrás dos dipolos' : 'Sem refletor', source: 'Wikipedia (Milligan, 2005)' },
    ],
    expected: {
      impedance: {
        typical: zFeed,
        unit: 'Ω',
        note:
          `Dois dipolos de ${DIPOLE_RESISTANCE_OHMS} Ω em paralelo (um pela linha de 1/4 de onda de ${DIPOLE_RESISTANCE_OHMS} Ω), sem refletor` +
          (withReflector ? '. Com refletor o valor muda: meça.' : '.'),
        source: 'Derivação de linhas (Pozar) com R de Balanis; TODO(fonte): valor medido ou modelado',
      },
      gain,
      bandwidth: null,
    },
    warnings,
  };
}
