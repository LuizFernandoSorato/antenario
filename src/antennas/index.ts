/**
 * Registro de todas as antenas disponíveis na ferramenta.
 */

import * as dipole from './dipole/calc';
import { meta as dipoleMeta } from './dipole/meta';
import * as groundPlane from './ground-plane/calc';
import { meta as groundPlaneMeta } from './ground-plane/meta';
import * as jPole from './j-pole/calc';
import { meta as jPoleMeta } from './j-pole/meta';
import type { AntennaMeta, CalcResult } from './types';

/** Antena com parâmetros genéricos (chave → valor em SI), usada pela UI. */
export interface AntennaModule {
  meta: AntennaMeta;
  defaultParams: Readonly<Record<string, number>>;
  calc: (params: Record<string, number>) => CalcResult;
}

function register<P extends object>(
  meta: AntennaMeta,
  defaultParams: P,
  calc: (params: P) => CalcResult,
): AntennaModule {
  return {
    meta,
    defaultParams: defaultParams as Record<string, number>,
    // As chaves de `params` vêm de `meta.params`; o teste de consistência garante
    // que elas batem com as de `defaultParams`.
    calc: (params) => calc({ ...defaultParams, ...params }),
  };
}

export const antennas: readonly AntennaModule[] = [
  register(dipoleMeta, dipole.defaultParams, dipole.calc),
  register(groundPlaneMeta, groundPlane.defaultParams, groundPlane.calc),
  register(jPoleMeta, jPole.defaultParams, jPole.calc),
];

export type { AntennaMeta, CalcResult } from './types';
