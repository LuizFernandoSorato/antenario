/**
 * Registro de todas as antenas disponíveis na ferramenta.
 */

// ADS-B desativada: é o ground plane em 1090 MHz (basta usar o ground plane com essa frequência).
// Os arquivos em ./adsb continuam no repositório; para reativar, descomente aqui e a linha em `antennas`.
// import * as adsb from './adsb/calc';
// import { cutList as adsbCutList } from './adsb/cutlist';
// import { diagrams as adsbDiagrams } from './adsb/diagram';
// import adsbGuide from './adsb/guide.md?raw';
// import { meta as adsbMeta } from './adsb/meta';
import * as turnstile from './turnstile/calc';
import { cutList as turnstileCutList } from './turnstile/cutlist';
import { diagrams as turnstileDiagrams } from './turnstile/diagram';
import turnstileGuide from './turnstile/guide.md?raw';
import { meta as turnstileMeta } from './turnstile/meta';
import * as crossYagi from './cross-yagi/calc';
import { cutList as crossYagiCutList } from './cross-yagi/cutlist';
import { diagrams as crossYagiDiagrams } from './cross-yagi/diagram';
import crossYagiGuide from './cross-yagi/guide.md?raw';
import { meta as crossYagiMeta } from './cross-yagi/meta';
import * as qfh from './qfh/calc';
import { cutList as qfhCutList } from './qfh/cutlist';
import { diagrams as qfhDiagrams } from './qfh/diagram';
import qfhGuide from './qfh/guide.md?raw';
import { meta as qfhMeta } from './qfh/meta';
import * as coaxCollinear from './coax-collinear/calc';
import { cutList as coaxCollinearCutList } from './coax-collinear/cutlist';
import { diagrams as coaxCollinearDiagrams } from './coax-collinear/diagram';
import coaxCollinearGuide from './coax-collinear/guide.md?raw';
import { meta as coaxCollinearMeta } from './coax-collinear/meta';
import * as cubicQuad from './cubic-quad/calc';
import { cutList as cubicQuadCutList } from './cubic-quad/cutlist';
import { diagrams as cubicQuadDiagrams } from './cubic-quad/diagram';
import cubicQuadGuide from './cubic-quad/guide.md?raw';
import { meta as cubicQuadMeta } from './cubic-quad/meta';
import * as discone from './discone/calc';
import { cutList as disconeCutList } from './discone/cutlist';
import { diagrams as disconeDiagrams } from './discone/diagram';
import disconeGuide from './discone/guide.md?raw';
import { meta as disconeMeta } from './discone/meta';
import * as bazooka from './bazooka/calc';
import { cutList as bazookaCutList } from './bazooka/cutlist';
import { diagrams as bazookaDiagrams } from './bazooka/diagram';
import bazookaGuide from './bazooka/guide.md?raw';
import { meta as bazookaMeta } from './bazooka/meta';
import * as invertedV from './inverted-v/calc';
import { cutList as invertedVCutList } from './inverted-v/cutlist';
import { diagrams as invertedVDiagrams } from './inverted-v/diagram';
import invertedVGuide from './inverted-v/guide.md?raw';
import { meta as invertedVMeta } from './inverted-v/meta';
import * as flowerpot from './flowerpot/calc';
import { cutList as flowerpotCutList } from './flowerpot/cutlist';
import { diagrams as flowerpotDiagrams } from './flowerpot/diagram';
import flowerpotGuide from './flowerpot/guide.md?raw';
import { meta as flowerpotMeta } from './flowerpot/meta';
import * as dipole from './dipole/calc';
import { cutList as dipoleCutList } from './dipole/cutlist';
import { diagrams as dipoleDiagrams } from './dipole/diagram';
import dipoleGuide from './dipole/guide.md?raw';
import { meta as dipoleMeta } from './dipole/meta';
import * as groundPlane from './ground-plane/calc';
import { cutList as groundPlaneCutList } from './ground-plane/cutlist';
import { diagrams as groundPlaneDiagrams } from './ground-plane/diagram';
import groundPlaneGuide from './ground-plane/guide.md?raw';
import { meta as groundPlaneMeta } from './ground-plane/meta';
import * as helical from './helical/calc';
import { cutList as helicalCutList } from './helical/cutlist';
import { diagrams as helicalDiagrams } from './helical/diagram';
import helicalGuide from './helical/guide.md?raw';
import { meta as helicalMeta } from './helical/meta';
import * as jPole from './j-pole/calc';
import { cutList as jPoleCutList } from './j-pole/cutlist';
import { diagrams as jPoleDiagrams } from './j-pole/diagram';
import jPoleGuide from './j-pole/guide.md?raw';
import { meta as jPoleMeta } from './j-pole/meta';
import * as magneticLoop from './magnetic-loop/calc';
import { cutList as magneticLoopCutList } from './magnetic-loop/cutlist';
import { diagrams as magneticLoopDiagrams } from './magnetic-loop/diagram';
import magneticLoopGuide from './magnetic-loop/guide.md?raw';
import { meta as magneticLoopMeta } from './magnetic-loop/meta';
import * as moxon from './moxon/calc';
import { cutList as moxonCutList } from './moxon/cutlist';
import { diagrams as moxonDiagrams } from './moxon/diagram';
import moxonGuide from './moxon/guide.md?raw';
import { meta as moxonMeta } from './moxon/meta';
import * as yagi from './yagi/calc';
import { cutList as yagiCutList } from './yagi/cutlist';
import { diagrams as yagiDiagrams } from './yagi/diagram';
import yagiGuide from './yagi/guide.md?raw';
import { meta as yagiMeta } from './yagi/meta';
import type { Diagram } from './diagram-kit';
import type { AntennaMeta, CalcResult, CutItem } from './types';

/** Antena com parâmetros genéricos (chave → valor em SI), usada pela UI. */
export interface AntennaModule {
  meta: AntennaMeta;
  defaultParams: Readonly<Record<string, number>>;
  calc: (params: Record<string, number>) => CalcResult;
  /** Diagramas SVG gerados a partir do mesmo cálculo. */
  diagrams: (params: Record<string, number>) => Diagram[];
  /** Peças a cortar (folha de corte). */
  cutList: (params: Record<string, number>) => CutItem[];
  /** Guia de construção em Markdown. */
  guide: string;
}

function register<P extends object>(
  meta: AntennaMeta,
  defaultParams: P,
  calc: (params: P) => CalcResult,
  diagrams: (result: CalcResult, params: P) => Diagram[],
  cutList: (params: P) => CutItem[],
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
    cutList: (params) => cutList(full(params)),
    guide,
  };
}

export const antennas: readonly AntennaModule[] = [
  register(dipoleMeta, dipole.defaultParams, dipole.calc, dipoleDiagrams, dipoleCutList, dipoleGuide),
  register(bazookaMeta, bazooka.defaultParams, bazooka.calc, bazookaDiagrams, bazookaCutList, bazookaGuide),
  register(invertedVMeta, invertedV.defaultParams, invertedV.calc, invertedVDiagrams, invertedVCutList, invertedVGuide),
  register(groundPlaneMeta, groundPlane.defaultParams, groundPlane.calc, groundPlaneDiagrams, groundPlaneCutList, groundPlaneGuide),
  register(jPoleMeta, jPole.defaultParams, jPole.calc, jPoleDiagrams, jPoleCutList, jPoleGuide),
  register(flowerpotMeta, flowerpot.defaultParams, flowerpot.calc, flowerpotDiagrams, flowerpotCutList, flowerpotGuide),
  register(helicalMeta, helical.defaultParams, helical.calc, helicalDiagrams, helicalCutList, helicalGuide),
  register(yagiMeta, yagi.defaultParams, yagi.calc, yagiDiagrams, yagiCutList, yagiGuide),
  register(crossYagiMeta, crossYagi.defaultParams, crossYagi.calc, crossYagiDiagrams, crossYagiCutList, crossYagiGuide),
  register(moxonMeta, moxon.defaultParams, moxon.calc, moxonDiagrams, moxonCutList, moxonGuide),
  register(cubicQuadMeta, cubicQuad.defaultParams, cubicQuad.calc, cubicQuadDiagrams, cubicQuadCutList, cubicQuadGuide),
  register(disconeMeta, discone.defaultParams, discone.calc, disconeDiagrams, disconeCutList, disconeGuide),
  register(magneticLoopMeta, magneticLoop.defaultParams, magneticLoop.calc, magneticLoopDiagrams, magneticLoopCutList, magneticLoopGuide),
  register(coaxCollinearMeta, coaxCollinear.defaultParams, coaxCollinear.calc, coaxCollinearDiagrams, coaxCollinearCutList, coaxCollinearGuide),
  register(turnstileMeta, turnstile.defaultParams, turnstile.calc, turnstileDiagrams, turnstileCutList, turnstileGuide),
  // register(adsbMeta, adsb.defaultParams, adsb.calc, adsbDiagrams, adsbCutList, adsbGuide),
  register(qfhMeta, qfh.defaultParams, qfh.calc, qfhDiagrams, qfhCutList, qfhGuide),
];

export type { Diagram } from './diagram-kit';
export type { AntennaMeta, CalcResult, CutItem } from './types';
