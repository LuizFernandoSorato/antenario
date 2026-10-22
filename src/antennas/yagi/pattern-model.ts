/**
 * Modelo eletromagnético do Yagi para o padrão de irradiação: método dos momentos (`core/mom.ts`) sobre os elementos
 * calculados (NBS ou DL6WU). Não há fórmula fechada para o padrão de um Yagi: ele depende das correntes induzidas
 * em cada elemento parasita, e é isso que o solver calcula.
 *
 * Geometria: elementos ao longo de x, boom ao longo de z, frente (diretores) em +z. Plano E = x–z, plano H = y–z.
 * Premissas: elementos cilíndricos de fio fino (raio = d/2), no espaço livre, SEM boom, excitado com gap delta no centro; os
 * parasitas são fios contínuos sem carga. Como o modelo não tem boom, usa os comprimentos dos elementos SEM a correção do boom
 * (o NBS soma essa correção só para compensar o efeito do boom metálico; ver `isolatedElements`).
 */

import type { MomSolution } from '../../core/mom';
import type { CalcResult } from '../types';
import { DL6WU_MAX_ELEMENTS } from './dl6wu-calc';
import { type YagiParams, designCalc } from './calc';
import { solveElements, yagiElements } from './elements';

export { yagiElements } from './elements';

export interface YagiModelInput {
  frequencyMHz: number;
  /** Diâmetro dos elementos, em metros. */
  elementDiameter: number;
}

/** Número de elementos acima do qual o padrão por momentos deixa de ser calculado (custo O(N³) no navegador). É o limite da própria Yagi. */
export const MAX_MODEL_ELEMENTS = DL6WU_MAX_ELEMENTS;

/** Resolve o Yagi por momentos. O elemento excitado recebe 1 V; devolve a solução e a geometria usada. */
export function solveYagi(result: CalcResult, input: YagiModelInput): MomSolution {
  const elements = yagiElements(result);
  if (elements.length > MAX_MODEL_ELEMENTS) {
    throw new RangeError(`O padrão por momentos só é calculado até ${MAX_MODEL_ELEMENTS} elementos (recebido: ${elements.length}).`);
  }
  return solveElements(elements, input.elementDiameter, input.frequencyMHz);
}

/**
 * Resultado do cálculo da Yagi com boom isolante (sem a correção do boom condutor): são os comprimentos dos elementos soltos no
 * espaço, que é o que o modelo por momentos representa. Com boom metálico real, o elemento corrigido se comporta como este elemento solto.
 */
export function isolatedElements(params: YagiParams): CalcResult {
  return designCalc({ ...params, boomDiameter: 0 });
}
