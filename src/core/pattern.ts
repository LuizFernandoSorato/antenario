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
