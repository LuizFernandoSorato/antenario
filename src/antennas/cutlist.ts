/**
 * Folha de corte: sobra para ajuste e total de material.
 */

import type { CutItem } from './types';

/**
 * Sobra padrão para peças ajustáveis, em %. Valor de bancada, sem fonte física:
 * é só um ponto de partida que os guias recomendam (cortar comprido e encurtar medindo
 * a ROE). O construtor escolhe o valor que preferir na tela.
 */
export const DEFAULT_MARGIN_PERCENT = 5;

/** Comprimento a cortar: nominal + sobra (só para peças ajustáveis). */
export function cutLength(item: CutItem, marginPercent: number): number {
  if (!Number.isFinite(marginPercent) || marginPercent < 0) {
    throw new RangeError(`A sobra deve ser ≥ 0 % (recebido: ${marginPercent}).`);
  }
  return item.adjustable ? item.meters * (1 + marginPercent / 100) : item.meters;
}

/** Total de material a comprar (m), somando todas as peças com a sobra. */
export function totalMaterial(items: readonly CutItem[], marginPercent: number): number {
  return items.reduce((sum, item) => sum + item.quantity * cutLength(item, marginPercent), 0);
}
