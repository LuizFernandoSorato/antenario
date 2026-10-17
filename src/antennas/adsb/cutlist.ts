import { cutList as groundPlaneCutList } from '../ground-plane/cutlist';
import type { CutItem } from '../types';
import type { AdsbParams } from './calc';

export function cutList(params: AdsbParams): CutItem[] {
  return groundPlaneCutList(params);
}
