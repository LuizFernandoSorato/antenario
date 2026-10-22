/**
 * Banda de ROE da Yagi pelo Q da impedância do excitado (core/q-bandwidth.ts, Yaghjian e Best), com o modelo por momentos dos
 * elementos soltos (elements.ts, sem boom, espaço livre).
 *
 * Por que o Q e não uma varredura: a varredura completa pede umas 30 soluções e passa de 5 s numa Yagi de 40 elementos (a tela
 * recalcula a cada tecla); o Q pede 3. O Q já inclui a sintonia do excitado por uma reatância em série ideal, então não importa
 * se o DE calculado ressoa ou não no conjunto. A banda prevista é a da antena casada em f0 com uma rede ideal (sem perdas e sem banda
 * própria): gamma, hairpin e dipolo dobrado a estreitam um pouco. O teste confere o Q contra a varredura do modelo sintonizado.
 */

import { type Complex, complex } from '../../core/complex';
import { Q_DELTA, impedanceQ } from '../../core/q-bandwidth';
import { type YagiElement, solveElements } from './elements';

export interface QModel {
  /** Impedância do excitado em f0, sem casamento. */
  z0: Complex;
  q: number;
  /** Diretividade (razão) na frente (+z) em f0, da mesma solução de z0. */
  directivity: number;
}

const cache = new Map<string, QModel>();

export function impedanceAt(elements: readonly YagiElement[], diameterM: number, f0MHz: number, fMHz: number): Complex {
  const z = solveElements(elements, diameterM, fMHz, f0MHz).inputImpedance(0);
  return complex(z.re, z.im);
}

export function yagiQ(elements: readonly YagiElement[], diameterM: number, f0MHz: number): QModel {
  const key = JSON.stringify([elements, diameterM, f0MHz]);
  const hit = cache.get(key);
  if (hit) return hit;
  const at = (x: number) => impedanceAt(elements, diameterM, f0MHz, f0MHz * x);
  const center = solveElements(elements, diameterM, f0MHz);
  const zc = center.inputImpedance(0);
  const z0 = complex(zc.re, zc.im);
  const model = {
    z0,
    q: impedanceQ(at(1 - Q_DELTA), z0, at(1 + Q_DELTA), f0MHz, f0MHz * Q_DELTA),
    directivity: center.directivity([0, 0, 1]),
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, model);
  return model;
}
