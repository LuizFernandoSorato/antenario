/**
 * Polarização circular: sentido (direita ou esquerda) e razão axial de um campo transversal (funções puras, sem DOM).
 *
 * Convenção (IEEE Std 145, a usual em antenas): polarização circular à DIREITA (RHCP) é aquela em que o vetor E gira no sentido
 * horário visto olhando NA DIREÇÃO de propagação (regra da mão direita: polegar na propagação, dedos no sentido da rotação).
 * A dependência de tempo é e^{jωt}, a mesma do solver de momentos (`mom.ts`). Para uma onda que viaja em +z, com os eixos x e y vistos
 * de +z para a origem: E = x̂ − jŷ (Ey atrasado 90° em relação a Ex) dá Re[E·e^{jωt}] = x̂·cos ωt + ŷ·sin ωt, que gira de x para y,
 * anti-horário visto de +z e horário visto olhando para +z: RHCP. Ey adiantado 90° é LHCP.
 */

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface CircularSense {
  /** Componente circular dominante. */
  sense: 'rhcp' | 'lhcp';
  /** Amplitude da componente RHCP e da LHCP (mesma escala de entrada). */
  rhcp: number;
  lhcp: number;
  /** Razão axial, dB: 0 = circular perfeita; cresce para elíptica e é enorme para linear. */
  axialRatioDb: number;
}

/**
 * Sentido e razão axial de E = Ex·x̂ + Ey·ŷ (fasores complexos, onda em +z). As componentes circulares são
 * RHCP = (Ex + jEy)/√2 e LHCP = (Ex − jEy)/√2 (projeções em x̂ − jŷ e x̂ + jŷ).
 */
export function circularSense(ex: ComplexNumber, ey: ComplexNumber): CircularSense {
  const rhcp = Math.hypot(ex.re - ey.im, ex.im + ey.re) / Math.SQRT2;
  const lhcp = Math.hypot(ex.re + ey.im, ex.im - ey.re) / Math.SQRT2;
  const diff = Math.abs(rhcp - lhcp);
  const axialRatioDb = diff === 0 ? Infinity : 20 * Math.log10((rhcp + lhcp) / diff);
  return { sense: rhcp >= lhcp ? 'rhcp' : 'lhcp', rhcp, lhcp, axialRatioDb };
}
