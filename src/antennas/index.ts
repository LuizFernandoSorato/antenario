/**
 * Registro de todas as antenas disponíveis na ferramenta.
 */

import * as dipole from './dipole/calc';
import { cutList as dipoleCutList } from './dipole/cutlist';
import { diagram as dipoleDiagram } from './dipole/diagram';
import dipoleGuide from './dipole/guide.md?raw';
import { meta as dipoleMeta } from './dipole/meta';
import * as groundPlane from './ground-plane/calc';
import { cutList as groundPlaneCutList } from './ground-plane/cutlist';
import { diagram as groundPlaneDiagram } from './ground-plane/diagram';
import groundPlaneGuide from './ground-plane/guide.md?raw';
import { meta as groundPlaneMeta } from './ground-plane/meta';
import * as jPole from './j-pole/calc';
import { cutList as jPoleCutList } from './j-pole/cutlist';
import { diagram as jPoleDiagram } from './j-pole/diagram';
import jPoleGuide from './j-pole/guide.md?raw';
import { meta as jPoleMeta } from './j-pole/meta';
import type { AntennaMeta, CalcResult, CutItem } from './types';

/** Antena com parâmetros genéricos (chave → valor em SI), usada pela UI. */
export interface AntennaModule {
  meta: AntennaMeta;
  defaultParams: Readonly<Record<string, number>>;
  calc: (params: Record<string, number>) => CalcResult;
  /** Diagrama SVG em escala, com as cotas. */
  diagram: (params: Record<string, number>) => string;
  /** Peças a cortar (folha de corte). */
  cutList: (params: Record<string, number>) => CutItem[];
  /** Guia de construção em Markdown. */
  guide: string;
}

interface Parts<P extends object> {
  meta: AntennaMeta;
  defaultParams: P;
  calc: (params: P) => CalcResult;
  diagram: (params: P) => string;
  cutList: (params: P) => CutItem[];
  guide: string;
}

function register<P extends object>(parts: Parts<P>): AntennaModule {
  // As chaves de `params` vêm de `meta.params`; o teste de consistência garante
  // que elas batem com as de `defaultParams`.
  const withDefaults = (params: Record<string, number>): P => ({ ...parts.defaultParams, ...params });
  return {
    meta: parts.meta,
    defaultParams: parts.defaultParams as Record<string, number>,
    calc: (params) => parts.calc(withDefaults(params)),
    diagram: (params) => parts.diagram(withDefaults(params)),
    cutList: (params) => parts.cutList(withDefaults(params)),
    guide: parts.guide,
  };
}

export const antennas: readonly AntennaModule[] = [
  register({
    meta: dipoleMeta,
    defaultParams: dipole.defaultParams,
    calc: dipole.calc,
    diagram: dipoleDiagram,
    cutList: dipoleCutList,
    guide: dipoleGuide,
  }),
  register({
    meta: groundPlaneMeta,
    defaultParams: groundPlane.defaultParams,
    calc: groundPlane.calc,
    diagram: groundPlaneDiagram,
    cutList: groundPlaneCutList,
    guide: groundPlaneGuide,
  }),
  register({
    meta: jPoleMeta,
    defaultParams: jPole.defaultParams,
    calc: jPole.calc,
    diagram: jPoleDiagram,
    cutList: jPoleCutList,
    guide: jPoleGuide,
  }),
];

export type { AntennaMeta, CalcResult, CutItem } from './types';
