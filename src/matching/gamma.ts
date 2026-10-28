/**
 * Gamma match: uma barra paralela ao elemento, ligada a ele por uma ponte (strap) numa ponta e ao vivo do coaxial, por um
 * capacitor em série, na outra; a malha vai ao centro do elemento, que fica inteiro (pode ser preso num boom metálico).
 *
 * Fonte: H. F. Tolles, W7ITB, "How to design gamma-matching networks", Ham Radio, maio de 1973, pp. 46–55 (docs/Ham-Radio-197305.pdf):
 * - Eq. 2: impedância da linha barra–elemento no ar, Z0 = 60·acosh((4S² − D² − d²)/(2Dd)) (S entre centros, D do elemento, d da barra);
 * - Eq. 3: razão de transformação Hz = [1 + acosh((4S² − D² + d²)/(4Sd)) / acosh((4S² + D² − d²)/(4SD))]²;
 * - Eqs. 9 a 11: T = Hz/Z0; Q = A + √(A² + B), com A = R0·Xa/(Hz·Ra − R0) e B = R0·(Ra² + Xa²)/(Hz·Ra − R0); tan(k·l) = Q·T;
 * - Eq. 8: comprimento elétrico em graus = 360·l/(0,956·λ), com 0,956 de velocidade relativa média ao longo da barra e do elemento
 *   (Thourel, citado pelo Tolles);
 * - Eqs. 12 e 13: Xc = −(E + F), C = 1/(2π·f·(E + F)), com E = (R0/Ra)·(Ra² + Xa²)/Q e F = (R0/Ra)·Xa;
 * - Eq. 14 e texto: Hz > R0/Ra; E + F > 0 (senão o capacitor não serve); k·l < 90° e de preferência > 15° (perdas e banda);
 *   Hz acima de 20 a 30 pode não ser prático.
 * - Za é METADE da impedância do dipolo (a barra corre ao longo de um lado só) ou a impedância inteira do monopolo.
 *
 * Conferência (gamma.test.ts): os dois exemplos do artigo e os três do programa GAMMA do ARRL Antenna Book, 19ª ed., p. 26-9 e 26-10
 * (Tolles adaptado por WB0IKN e W6NL). O programa do ARRL converte graus em comprimento com o λ do espaço livre (sem o 0,956): com isso
 * os três exemplos saem exatos.
 */

import { type Complex, add, complex, parallel, scale } from '../core/complex';
import { assertFrequencyMHz, assertPositive } from '../core/units';
import { wavelength } from '../core/wave';

/** Velocidade relativa média ao longo da barra e do elemento (Tolles, eq. 8, citando Thourel). */
export const TOLLES_VELOCITY = 0.956;
/** Abaixo disso a barra fica curta demais: perdas maiores e banda menor (Tolles, p. 49). */
export const MIN_ELECTRICAL_DEG = 15;
/** Acima disso a razão de transformação "pode não ser prática" (Tolles, p. 49: "more than 20 to 30"). */
export const MAX_PRACTICAL_STEP_UP = 30;

export interface GammaInput {
  fMHz: number;
  /** Impedância vista pelo gamma (Tolles: metade da do dipolo, ou a do monopolo inteira), Ω. */
  za: Complex;
  /** Impedância da linha a casar (R0), Ω. */
  lineOhms: number;
  /** Diâmetro do elemento (D), m. */
  elementDiameterM: number;
  /** Diâmetro da barra (d), m. */
  rodDiameterM: number;
  /** Espaçamento entre os centros do elemento e da barra (S), m. */
  spacingM: number;
  /** Velocidade relativa para converter graus em comprimento; padrão: a do Tolles (0,956). O programa do ARRL usa 1. */
  velocity?: number;
}

export type GammaResult =
  | {
      ok: true;
      /** Razão de transformação Hz (eq. 3). */
      stepUp: number;
      /** Impedância da linha barra–elemento (eq. 2), Ω. */
      rodLineOhms: number;
      /** Comprimento elétrico da barra, graus. */
      electricalDeg: number;
      /** Comprimento da barra, do ponto de alimentação à ponte, m. */
      rodLengthM: number;
      /** Capacitor em série, pF. */
      capacitancePF: number;
      /** Reatância do capacitor (negativa), Ω. */
      capacitorReactanceOhms: number;
    }
  | { ok: false; stepUp: number; reason: string };

/** Razão de transformação Hz (Tolles, eq. 3). */
export function gammaStepUp(elementDiameter: number, rodDiameter: number, spacing: number): number {
  const D = elementDiameter;
  const d = rodDiameter;
  const S = spacing;
  const num = Math.acosh((4 * S * S - D * D + d * d) / (4 * S * d));
  const den = Math.acosh((4 * S * S + D * D - d * d) / (4 * S * D));
  return (1 + num / den) ** 2;
}

/** Impedância da linha de dois condutores de diâmetros diferentes no ar (Tolles, eq. 2), Ω. */
export function rodLineImpedance(elementDiameter: number, rodDiameter: number, spacing: number): number {
  const D = elementDiameter;
  const d = rodDiameter;
  return 60 * Math.acosh((4 * spacing * spacing - D * D - d * d) / (2 * D * d));
}

export function designGamma(input: GammaInput): GammaResult {
  const { fMHz, za, lineOhms: r0, elementDiameterM: D, rodDiameterM: d, spacingM: S } = input;
  const velocity = input.velocity ?? TOLLES_VELOCITY;
  assertFrequencyMHz(fMHz);
  assertPositive(r0, 'A impedância da linha');
  assertPositive(D, 'O diâmetro do elemento');
  assertPositive(d, 'O diâmetro da barra do gamma');
  assertPositive(S, 'O espaçamento da barra do gamma');
  assertPositive(velocity, 'A velocidade relativa');
  if (S <= (D + d) / 2) {
    throw new RangeError('A barra do gamma encostaria no elemento: o espaçamento entre centros precisa passar da soma dos raios.');
  }
  if (!(za.re > 0)) throw new RangeError(`A resistência da antena deve ser positiva (recebido: ${za.re} Ω).`);

  const ra = za.re;
  const xa = za.im;
  const hz = gammaStepUp(D, d, S);
  const z0 = rodLineImpedance(D, d, S);
  if (hz * ra <= r0) {
    return {
      ok: false,
      stepUp: hz,
      reason:
        `A razão de transformação (Hz ≈ ${hz.toFixed(1)}) não leva ${ra.toFixed(1)} Ω a ${r0.toFixed(0)} Ω: precisa passar de R0/Ra ≈ ` +
        `${(r0 / ra).toFixed(1)} (Tolles, eq. 14). Aproxime a barra do elemento ou use uma barra mais fina.`,
    };
  }
  const den = hz * ra - r0;
  const a = (r0 * xa) / den;
  const b = (r0 * (ra * ra + xa * xa)) / den;
  const q = a + Math.sqrt(a * a + b);
  const electricalDeg = (Math.atan(q * (hz / z0)) * 180) / Math.PI;
  const e = ((r0 / ra) * (ra * ra + xa * xa)) / q;
  const f = (r0 / ra) * xa;
  if (e + f <= 0) {
    return {
      ok: false,
      stepUp: hz,
      reason: 'Com essa impedância o capacitor em série não fecha o casamento (E + F ≤ 0, Tolles, eqs. 12 e 13). Mude o comprimento do excitado.',
    };
  }
  const xc = -(e + f);
  return {
    ok: true,
    stepUp: hz,
    rodLineOhms: z0,
    electricalDeg,
    rodLengthM: (electricalDeg / 360) * wavelength(fMHz) * velocity,
    capacitancePF: 1e12 / (2 * Math.PI * fMHz * 1e6 * (e + f)),
    capacitorReactanceOhms: xc,
  };
}

export type GammaDesign = Extract<GammaResult, { ok: true }>;

/**
 * Impedância vista pelo coaxial na entrada do gamma, em f, para um gamma projetado em f0: Hz·Za em paralelo com a reatância da
 * linha barra–elemento em curto, j·Z0·tan(k·l), e o capacitor em série. É o circuito das eqs. 6 e 9 a 13 do Tolles: com
 * Q = Z0·tan(k·l)/Hz, a parte real dá R0 exatamente quando Q = A + √(A² + B), e a parte imaginária é E + F, que o capacitor cancela.
 * Fora de f0, k·l cresce com f e a reatância do capacitor cai com 1/f; Hz e Z0 (geometria) não mudam.
 */
export function gammaInputImpedance(design: GammaDesign, za: Complex, fMHz: number, f0MHz: number): Complex {
  const kl = ((design.electricalDeg * Math.PI) / 180) * (fMHz / f0MHz);
  const rod = complex(0, design.rodLineOhms * Math.tan(kl));
  const capacitor = complex(0, design.capacitorReactanceOhms * (f0MHz / fMHz));
  return add(parallel(scale(za, design.stepUp), rod), capacitor);
}

/** Tensão eficaz no capacitor com a linha casada: I = √(P/R0), V = I·|Xc| (V). */
export function capacitorVoltageRms(powerW: number, lineOhms: number, reactanceOhms: number): number {
  return Math.sqrt(powerW / lineOhms) * Math.abs(reactanceOhms);
}

/** Regras práticas do ARRL Antenna Book, 19ª ed., p. 26-9, para Yagi de tubo de alumínio casada a 50 Ω. */
export const ARRL_GAMMA_RULES = {
  /** Comprimento da barra, em λ. */
  rodLengthLambda: { min: 0.04, max: 0.05 },
  /** Diâmetro da barra em relação ao do elemento. */
  rodDiameterRatio: { min: 1 / 3, max: 1 / 2 },
  /** Espaçamento entre os centros da barra e do elemento, em λ. */
  spacingLambda: 0.007,
  /** Capacitor: ≈ 7 pF por metro de λ (≈ 140 pF no 20 m). */
  pfPerMeterOfWavelength: 7,
  /** O ponto de partida acima vale para ≈ 25 Ω no excitado, encurtado ≈ 3 % da ressonância. */
  drivenShortening: 0.97,
} as const;

/** Comprimento elétrico preferido da barra: o Tolles usaria "uma das linhas de 18 a 45 graus" da fig. 5 (p. 54); acima de ≈ 15° (p. 49). */
export const PREFERRED_ELECTRICAL_DEG = { min: MIN_ELECTRICAL_DEG, max: 45 } as const;

/**
 * Barras mais finas tentadas, em ordem, quando a de 1/3 do elemento (ARRL) não fecha o casamento: barra mais fina dá razão Hz maior.
 * O próprio exemplo do Tolles usa fio #12 num elemento de 3/8" (barra ≈ 1/4,6 do elemento). Critério desta ferramenta.
 */
const ROD_RATIOS = [1 / 3, 1 / 4, 1 / 5, 1 / 6] as const;

/** Espaçamento máximo da busca, em λ (≈ 4 vezes o do ARRL). Critério desta ferramenta. */
const MAX_SPACING_LAMBDA = 0.03;

export interface AutoGammaInput {
  fMHz: number;
  za: Complex;
  lineOhms: number;
  elementDiameterM: number;
  /** Diâmetro da barra, m; omitido = 1/3 do elemento (ARRL) e, se não casar, mais fina (até 1/6). */
  rodDiameterM?: number;
  /** Espaçamento entre centros, m; omitido = 0,007λ (ARRL), ou o mais próximo dele com a barra entre 15° e 45° (Tolles). */
  spacingM?: number;
  /** A barra não pode passar disto (metade do excitado), m. */
  maxRodLengthM: number;
}

export interface AutoGammaResult {
  design: GammaResult;
  rodDiameterM: number;
  spacingM: number;
  /** Folga mínima entre as superfícies da barra e do elemento usada na busca (= diâmetro da barra), m. */
  minGapM: number;
  autoRod: boolean;
  autoSpacing: boolean;
}

/**
 * Gamma com barra e espaçamento escolhidos sozinhos quando não informados. Busca: a barra de 1/3 do elemento (ARRL) e o espaçamento
 * de 0,007λ (ARRL); se o casamento não fecha ou a barra sai de 15° a 45° (Tolles), o espaçamento mais próximo do do ARRL que dá a
 * barra nessa faixa; se nenhum serve, uma barra mais fina. A folga entre as superfícies fica de pelo menos um diâmetro da barra
 * (critério desta ferramenta, para caber o isolador ou a braçadeira).
 */
export function autoGamma(input: AutoGammaInput): AutoGammaResult {
  const { fMHz, za, lineOhms, elementDiameterM: D, maxRodLengthM } = input;
  assertPositive(D, 'O diâmetro do elemento');
  const lambda = wavelength(fMHz);
  const autoRod = input.rodDiameterM === undefined;
  const autoSpacing = input.spacingM === undefined;
  const rods = autoRod ? ROD_RATIOS.map((r) => r * D) : [input.rodDiameterM!];
  const tryDesign = (d: number, S: number) =>
    designGamma({ fMHz, za, lineOhms, elementDiameterM: D, rodDiameterM: d, spacingM: S });
  const good = (g: GammaResult) =>
    g.ok &&
    g.electricalDeg >= PREFERRED_ELECTRICAL_DEG.min &&
    g.electricalDeg <= PREFERRED_ELECTRICAL_DEG.max &&
    g.rodLengthM < maxRodLengthM;

  let first: AutoGammaResult | undefined;
  for (const d of rods) {
    const minGapM = d;
    const sMin = (D + d) / 2 + minGapM;
    const sArrl = Math.max(ARRL_GAMMA_RULES.spacingLambda * lambda, sMin);
    const pick = (S: number): AutoGammaResult => ({ design: tryDesign(d, S), rodDiameterM: d, spacingM: S, minGapM, autoRod, autoSpacing });
    if (!autoSpacing) {
      const given = pick(input.spacingM!);
      first ??= given;
      if (given.design.ok) return given;
      continue;
    }
    const atArrl = pick(sArrl);
    first ??= atArrl;
    if (good(atArrl.design)) return atArrl;
    const sMax = Math.max(MAX_SPACING_LAMBDA * lambda, sArrl);
    const found = nearestGoodSpacing((S) => good(tryDesign(d, S)), sMin, sArrl, sMax);
    if (found !== null) return pick(found);
  }
  return first!;
}

/** Espaçamento mais próximo de `s0` (em escala logarítmica) que satisfaz `ok`, numa grade e depois por bisseção até a borda. */
function nearestGoodSpacing(ok: (S: number) => boolean, sMin: number, s0: number, sMax: number): number | null {
  const steps = 120;
  const grid: number[] = [];
  for (let i = 0; i <= steps; i++) grid.push(sMin * (sMax / sMin) ** (i / steps));
  let best: number | null = null;
  for (const S of grid) {
    if (!ok(S)) continue;
    if (best === null || Math.abs(Math.log(S / s0)) < Math.abs(Math.log(best / s0))) best = S;
  }
  if (best === null || best === s0) return best;
  // Bisseção entre o melhor ponto da grade (bom) e s0 (ruim), para chegar à borda da faixa boa mais perto do espaçamento do ARRL.
  let inside = best;
  let outside = s0;
  for (let i = 0; i < 40; i++) {
    const mid = Math.sqrt(inside * outside);
    if (ok(mid)) inside = mid;
    else outside = mid;
  }
  return inside;
}
