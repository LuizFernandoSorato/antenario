import type { Diagram } from '../diagram-kit';
import { diagrams as groundPlaneDiagrams } from '../ground-plane/diagram';
import type { CalcResult } from '../types';
import type { AdsbParams } from './calc';

export function diagrams(result: CalcResult, params: AdsbParams): Diagram[] {
  return groundPlaneDiagrams(result, params);
}
