import { describe, expect, it } from 'vitest';
import { complex } from '../../core/complex';
import { matchedFractionalBandwidth } from '../../core/q-bandwidth';
import { bandWidthMHz, swrSweep } from '../../core/swr-band';
import { impedanceAt, yagiQ } from './band-model';
import { defaultParams } from './calc';
import { yagiElements } from './elements';
import { isolatedElements } from './pattern-model';

// Referência: a banda prevista pelo Q (Yaghjian e Best) tem de bater com a varredura do próprio modelo, com o excitado sintonizado em f0
// por uma reatância em série ideal (capacitor se X > 0, indutor se X < 0) e a ROE medida contra a resistência em f0 (casamento ideal).
// O Q vale para uma ressonância isolada e banda estreita; tolerância: 10 % (a varredura mostra a assimetria que o Q não vê).
// Nas Yagis longas (DL6WU) a impedância tem várias ondulações em vez de uma ressonância só, e a varredura dá ROE < 2:1 numa faixa
// MAIOR que a do Q: ali o Q é conservador (o teste confere só esse sentido).

function sweptBand(elementCount: number) {
  const p = { ...defaultParams, elementCount };
  const els = yagiElements(isolatedElements(p));
  const f0 = p.frequencyMHz;
  const z0 = impedanceAt(els, p.elementDiameter, f0, f0);
  const tune = (f: number) => (z0.im > 0 ? -z0.im * (f0 / f) : -z0.im * (f / f0));
  const s = swrSweep({
    centerMHz: f0,
    span: 0.04,
    coarseSteps: 32,
    fineSteps: 800,
    impedanceAt: (f) => {
      const z = impedanceAt(els, p.elementDiameter, f0, f);
      return complex(z.re, z.im + tune(f));
    },
    referenceOhms: z0.re,
  });
  return { swept: bandWidthMHz(s.band2!) / f0, q: yagiQ(els, p.elementDiameter, f0).q };
}

describe('Yagi: banda pelo Q', { timeout: 60_000 }, () => {
  for (const n of [3, 5, 6]) {
    it(`NBS, ${n} elementos: (S − 1)/(Q·√S) a 10 % da varredura sintonizada`, () => {
      const { swept, q } = sweptBand(n);
      expect(matchedFractionalBandwidth(q, 2) / swept).toBeGreaterThan(0.9);
      expect(matchedFractionalBandwidth(q, 2) / swept).toBeLessThan(1.1);
    });
  }

  for (const n of [11, 20]) {
    it(`DL6WU, ${n} elementos: a varredura passa da faixa prevista pelo Q (estimativa conservadora)`, () => {
      const { swept, q } = sweptBand(n);
      expect(swept).toBeGreaterThan(matchedFractionalBandwidth(q, 2));
    });
  }
});
