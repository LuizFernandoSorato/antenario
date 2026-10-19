/**
 * Padrões de irradiação de dipolos finos (funções puras, sem DOM).
 *
 * Modelo: dipolo infinitamente fino com corrente senoidal, de comprimento total l, no espaço livre.
 * Campo distante normalizado (Balanis, Antenna Theory, 4ª ed., §4.2, eq. 4-58):
 *
 *   F(θ) = [cos((kl/2)·cos θ) − cos(kl/2)] / sin θ,   θ medido a partir do eixo do fio.
 *
 * Para l = λ/2 isto vira cos((π/2)·cos θ) / sin θ (Balanis, eq. 4-84): D₀ ≈ 1,643 (2,15 dBi) e
 * largura de meia potência de 78° no plano que contém o fio.
 *
 * Monopolo de comprimento h sobre plano condutor perfeito e infinito: pela teoria das imagens
 * (Balanis §4.7) o padrão no semiespaço de cima é o de um dipolo de comprimento 2h, e a diretividade
 * é o dobro (potência radiada só em metade do espaço).
 */

import { assertPositive } from './units';

/** Campo normalizado (máximo = 1) do dipolo de comprimento total `lengthLambda` (em λ), ângulo θ do eixo. */
export function dipoleField(thetaRad: number, lengthLambda: number): number {
  assertPositive(lengthLambda, 'O comprimento do dipolo');
  const s = Math.sin(thetaRad);
  // Nos polos do eixo (θ = 0, π) o campo é zero; evita 0/0.
  if (Math.abs(s) < 1e-9) return 0;
  const half = Math.PI * lengthLambda; // k·l/2, com k = 2π/λ
  const f = (Math.cos(half * Math.cos(thetaRad)) - Math.cos(half)) / s;
  return Math.abs(f) / maxDipoleField(lengthLambda);
}

const maxCache = new Map<number, number>();

/** Máximo de |F(θ)| (varredura fina; com cache, pois o campo é avaliado muitas vezes por gráfico). */
function maxDipoleField(lengthLambda: number): number {
  const cached = maxCache.get(lengthLambda);
  if (cached !== undefined) return cached;
  const half = Math.PI * lengthLambda;
  let max = 0;
  const steps = 3600;
  for (let i = 1; i < steps; i++) {
    const t = (Math.PI * i) / steps;
    const f = Math.abs((Math.cos(half * Math.cos(t)) - Math.cos(half)) / Math.sin(t));
    if (f > max) max = f;
  }
  maxCache.set(lengthLambda, max);
  return max;
}

/** Diretividade (razão, não dB) do dipolo de comprimento total `lengthLambda`, por integração numérica. */
export function dipoleDirectivity(lengthLambda: number): number {
  const steps = 3600;
  let integral = 0;
  for (let i = 0; i < steps; i++) {
    const t = (Math.PI * (i + 0.5)) / steps;
    const f = dipoleField(t, lengthLambda);
    integral += f * f * Math.sin(t) * (Math.PI / steps);
  }
  // D = 4π·Umax / P_rad, com Umax ∝ 1 e P_rad ∝ 2π·∫F² sinθ dθ.
  return 2 / integral;
}

/** Diretividade do monopolo de comprimento `heightLambda` sobre plano perfeito (dobro do dipolo de 2h). */
export function monopoleDirectivity(heightLambda: number): number {
  return 2 * dipoleDirectivity(2 * heightLambda);
}

/** Campo do monopolo em elevação `elevRad` (0 = horizonte, π/2 = zênite); zero abaixo do plano. */
export function monopoleField(elevRad: number, heightLambda: number): number {
  if (elevRad < 0) return 0;
  return dipoleField(Math.PI / 2 - elevRad, 2 * heightLambda);
}

/** Converte campo normalizado em dB (potência), limitado a `floorDb` para o gráfico. */
export function fieldToDb(field: number, floorDb = -40): number {
  if (field <= 0) return floorDb;
  return Math.max(floorDb, 20 * Math.log10(field));
}

/**
 * Largura de meia potência (graus) de uma função de campo normalizada `field(ângulo)` com máximo
 * em `peakRad`, varrendo para os dois lados até o campo cair a 1/√2.
 */
export function halfPowerBeamwidthDeg(field: (angleRad: number) => number, peakRad: number): number {
  const target = Math.SQRT1_2;
  const step = (0.01 * Math.PI) / 180;
  const edge = (dir: number): number => {
    let a = peakRad;
    for (let i = 0; i < 18000; i++) {
      const next = a + dir * step;
      if (field(next) < target) return a + (dir * step * (field(a) - target)) / Math.max(1e-12, field(a) - field(next));
      a = next;
    }
    return NaN;
  };
  return ((edge(1) - edge(-1)) * 180) / Math.PI;
}

/**
 * Dois dipolos cruzados a 90° (um em x, outro em y), de comprimento total `lengthLambda`, alimentados em
 * quadratura (turnstile). Densidade de potência relativa na direção de cossenos diretores (ux, uy, uz), com o
 * eixo z perpendicular ao plano dos dipolos.
 *
 * Derivação: o campo de um dipolo é E = g(u)·(ê − u·r̂), com u = cos do ângulo entre r̂ e o eixo do dipolo e
 * g(u) = [cos(kl/2·u) − cos(kl/2)]/(1 − u²) (Balanis §4.2, já dividido por sin ψ). Somando os dois campos com
 * defasagem de 90°, o termo cruzado é imaginário e some na potência, que fica
 *   P = g(ux)²·(1 − ux²) + g(uy)²·(1 − uy²).
 * Acoplamento mútuo desprezado (os dipolos são ortogonais).
 *
 * Refletor (`reflector`): plano condutor perfeito e infinito a λ/4 atrás dos dipolos. Pela teoria das imagens
 * (Balanis §4.7–4.8), o fator de arranjo para dipolos paralelos ao plano é 2·sin(k·d·cos θ), com d = λ/4,
 * e não há irradiação atrás do plano (uz < 0).
 */
export function crossedDipolePower(ux: number, uy: number, uz: number, lengthLambda: number, reflector: boolean): number {
  assertPositive(lengthLambda, 'O comprimento do dipolo');
  const half = Math.PI * lengthLambda;
  const g = (u: number): number => {
    const d = 1 - u * u;
    return Math.abs(d) < 1e-9 ? 0 : (Math.cos(half * u) - Math.cos(half)) / d;
  };
  let p = g(ux) ** 2 * (1 - ux * ux) + g(uy) ** 2 * (1 - uy * uy);
  if (reflector) p = uz < 0 ? 0 : p * Math.sin((Math.PI / 2) * uz) ** 2;
  return p;
}

const crossedMaxCache = new Map<string, number>();

function crossedMax(lengthLambda: number, reflector: boolean): number {
  const key = `${lengthLambda}|${reflector}`;
  const cached = crossedMaxCache.get(key);
  if (cached !== undefined) return cached;
  let max = 0;
  for (let i = 0; i <= 90; i++) {
    const theta = ((Math.PI / 2) * i) / 90;
    for (let j = 0; j <= 45; j++) {
      const phi = ((Math.PI / 2) * j) / 45;
      const p = crossedDipolePower(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta), lengthLambda, reflector);
      if (p > max) max = p;
    }
  }
  crossedMaxCache.set(key, max);
  return max;
}

/** Campo normalizado (máximo = 1) dos dipolos cruzados em quadratura, na direção (ux, uy, uz). */
export function crossedDipoleField(ux: number, uy: number, uz: number, lengthLambda: number, reflector: boolean): number {
  return Math.sqrt(crossedDipolePower(ux, uy, uz, lengthLambda, reflector) / crossedMax(lengthLambda, reflector));
}

/** Diretividade (razão) dos dipolos cruzados, por integração numérica na esfera. */
export function crossedDipoleDirectivity(lengthLambda: number, reflector: boolean): number {
  const nTheta = 360;
  const nPhi = 180;
  let integral = 0;
  for (let i = 0; i < nTheta; i++) {
    const theta = (Math.PI * (i + 0.5)) / nTheta;
    let row = 0;
    for (let j = 0; j < nPhi; j++) {
      const phi = (2 * Math.PI * (j + 0.5)) / nPhi;
      row += crossedDipolePower(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta), lengthLambda, reflector);
    }
    integral += row * (2 * Math.PI / nPhi) * Math.sin(theta) * (Math.PI / nTheta);
  }
  return (4 * Math.PI * crossedMax(lengthLambda, reflector)) / integral;
}

/**
 * Loop pequena (circunferência ≪ λ): campo normalizado |sin θ|, com θ medido a partir do EIXO da espira (perpendicular ao plano
 * dela). É o dual de um dipolo curto: máximo no plano da espira, nulo no eixo. Diretividade 1,5 (1,76 dBi).
 * Fonte: Balanis, Antenna Theory, §5.2 (loop pequena, uniform current); confirmado em notas de curso (Univ. of Kentucky EE522,
 * consultadas em 2026-10-19). Vale para circunferência < ≈ λ/10.
 */
export function smallLoopField(thetaFromAxisRad: number): number {
  return Math.abs(Math.sin(thetaFromAxisRad));
}

/**
 * Fator de arranjo normalizado (máximo = 1) de N elementos iguais em linha, com corrente de mesma amplitude e defasagem
 * progressiva β entre elementos: |sin(Nψ/2) / (N sin(ψ/2))|, com ψ a diferença de fase total entre elementos vizinhos.
 * Fonte: Balanis, Antenna Theory, §6.4 (arranjo uniforme).
 */
export function uniformArrayFactor(count: number, psiRad: number): number {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`O número de elementos deve ser um inteiro ≥ 1 (recebido: ${count}).`);
  const half = psiRad / 2;
  if (Math.abs(Math.sin(half)) < 1e-9) return 1;
  return Math.abs(Math.sin(count * half) / (count * Math.sin(half)));
}

/**
 * Arranjo colinear de `count` dipolos de comprimento `elementLengthLambda`, em fase, com espaçamento centro a centro
 * `spacingLambda` (em λ), ao longo do eixo (θ a partir do eixo): multiplicação de padrões, elemento × fator de arranjo
 * com ψ = 2π·d·cos θ (Balanis §6.4: elementos em linha). Máximo no plano perpendicular ao eixo (θ = 90°).
 */
export function collinearField(thetaFromAxisRad: number, count: number, spacingLambda: number, elementLengthLambda = 0.5): number {
  assertPositive(spacingLambda, 'O espaçamento do arranjo');
  return dipoleField(thetaFromAxisRad, elementLengthLambda) * uniformArrayFactor(count, 2 * Math.PI * spacingLambda * Math.cos(thetaFromAxisRad));
}

/**
 * Hélice de modo axial com `turns` voltas e passo `pitchLambda` (S/λ), sobre plano de terra: campo normalizado (máximo = 1 no eixo)
 * em função do ângulo θ a partir do eixo, no hemisfério da frente (θ ≤ 90°; zero atrás, plano de terra ideal).
 *
 *   E(θ) = sin(π/2N) · cos θ · sin(Nψ/2) / sin(ψ/2),   ψ = k₀ (S cos θ − L₀/p)
 *
 * Fator de arranjo de N fontes isotrópicas espaçadas de S (cada volta) vezes o padrão cos θ de uma volta (Kraus). Para a velocidade de
 * fase relativa p usa-se a condição de Hansen–Woodyard de diretividade aumentada, L₀/p = S + λ(2N+1)/(2N), que as medidas de Kraus
 * seguem e que a corrente da hélice acompanha na maior parte do comprimento (Stutzman e Thiele, via tese da Virginia Tech sobre
 * hélices axiais, e Kraus, "Antennas", 2ª ed., 1988; os livros NÃO foram consultados diretamente). Como a fase só importa módulo
 * 2π, ψ = 2π(S/λ)(cos θ − 1) − π/N. Aproximação: ver o aviso na legenda do gráfico.
 */
export function helixAxialField(thetaFromAxisRad: number, turns: number, pitchLambda: number): number {
  if (!Number.isInteger(turns) || turns < 1) throw new RangeError(`O número de voltas deve ser um inteiro ≥ 1 (recebido: ${turns}).`);
  assertPositive(pitchLambda, 'O passo da hélice');
  const c = Math.cos(thetaFromAxisRad);
  if (c <= 0) return 0;
  const psi = 2 * Math.PI * pitchLambda * (c - 1) - Math.PI / turns;
  const axis = uniformArrayFactor(turns, -Math.PI / turns); // valor em θ = 0 (máximo do arranjo Hansen–Woodyard)
  return (c * uniformArrayFactor(turns, psi)) / axis;
}

/** Diretividade (razão) de um padrão com simetria de revolução em torno do eixo: D = 2 / ∫₀^π F(θ)² sin θ dθ. */
export function revolutionDirectivity(field: (thetaRad: number) => number): number {
  const steps = 7200;
  let integral = 0;
  for (let i = 0; i < steps; i++) {
    const t = (Math.PI * (i + 0.5)) / steps;
    const f = field(t);
    integral += f * f * Math.sin(t) * (Math.PI / steps);
  }
  return 2 / integral;
}
