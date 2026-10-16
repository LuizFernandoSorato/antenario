/**
 * Registro de todas as antenas disponíveis na ferramenta.
 */

import * as dipole from './dipole/calc';
import { diagrams as dipoleDiagrams } from './dipole/diagram';
import dipoleGuide from './dipole/guide.md?raw';
import { meta as dipoleMeta } from './dipole/meta';
import * as groundPlane from './ground-plane/calc';
import { diagrams as groundPlaneDiagrams } from './ground-plane/diagram';
import groundPlaneGuide from './ground-plane/guide.md?raw';
import { meta as groundPlaneMeta } from './ground-plane/meta';
import * as jPole from './j-pole/calc';
import { diagrams as jPoleDiagrams } from './j-pole/diagram';
import jPoleGuide from './j-pole/guide.md?raw';
import { meta as jPoleMeta } from './j-pole/meta';
import type { Diagram } from './diagram-kit';
import type { AntennaMeta, CalcResult } from './types';

/** Antena com parâmetros genéricos (chave → valor em SI), usada pela UI. */
export interface AntennaModule {
  meta: AntennaMeta;
  defaultParams: Readonly<Record<string, number>>;
  calc: (params: Record<string, number>) => CalcResult;
  /** Diagramas SVG gerados a partir do mesmo cálculo. */
  diagrams: (params: Record<string, number>) => Diagram[];
  /** Guia de construção em Markdown. */
  guide: string;
}

function register<P extends object>(
  meta: AntennaMeta,
  defaultParams: P,
  calc: (params: P) => CalcResult,
  diagrams: (result: CalcResult, params: P) => Diagram[],
  guide: string,
): AntennaModule {
  // As chaves de `params` vêm de `meta.params`; o teste de consistência garante
  // que elas batem com as de `defaultParams`.
  const full = (params: Record<string, number>) => ({ ...defaultParams, ...params }) as P;
  return {
    meta,
    defaultParams: defaultParams as Record<string, number>,
    calc: (params) => calc(full(params)),
    diagrams: (params) => {
      const p = full(params);
      return diagrams(calc(p), p);
    },
    guide,
  };
}

export const antennas: readonly AntennaModule[] = [
  register(dipoleMeta, dipole.defaultParams, dipole.calc, dipoleDiagrams, dipoleGuide),
  register(groundPlaneMeta, groundPlane.defaultParams, groundPlane.calc, groundPlaneDiagrams, groundPlaneGuide),
  register(jPoleMeta, jPole.defaultParams, jPole.calc, jPoleDiagrams, jPoleGuide),
];

export type { Diagram } from './diagram-kit';
export type { AntennaMeta, CalcResult } from './types';
