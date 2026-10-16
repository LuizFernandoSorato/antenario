import { describe, expect, it } from 'vitest';
import { assertWellFormed, svgTexts } from '../test-utils';
import { calc, defaultParams } from './calc';
import { diagram, layout } from './diagram';

describe('ground plane: diagrama', () => {
  it('SVG bem formado e com todas as cotas do cálculo', () => {
    const svg = diagram(defaultParams);
    assertWellFormed(svg);
    const texts = svgTexts(svg).join(' | ');
    for (const m of calc(defaultParams).measurements) {
      expect(texts).toContain(`${m.label} =`);
    }
    expect(texts).toContain('45°');
    expect(texts).toContain('4 radiais');
  });

  it('desenha em escala: radiador e radial na razão A/B, e radial na inclinação certa', () => {
    const params = { ...defaultParams, shorteningFactor: 0.9, radialFactor: 1, droopAngleDeg: 30 };
    const l = layout(params);
    const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters]));
    expect(l.radiatorPx / l.radialPx).toBeCloseTo(m['A']! / m['B']!, 10);
    expect(l.radialPx).toBeCloseTo(Math.hypot(l.reachPx, l.dropPx), 10);
    expect(Math.atan2(l.dropPx, l.reachPx)).toBeCloseTo((30 * Math.PI) / 180, 10);
    expect(l.reachPx / l.radialPx).toBeCloseTo(m['C']! / m['B']!, 10);
  });

  it('cabe no quadro em vários casos (nenhuma coordenada fora do viewBox)', () => {
    for (const angle of [0, 20, 45, 80]) {
      for (const f of [28, 145, 435, 1296]) {
        const l = layout({ ...defaultParams, frequencyMHz: f, droopAngleDeg: angle });
        expect(l.topY).toBeGreaterThanOrEqual(0);
        expect(l.bottomY).toBeLessThanOrEqual(l.height);
        expect(l.feedX - l.reachPx).toBeGreaterThanOrEqual(0);
        expect(l.feedX + l.reachPx).toBeLessThanOrEqual(l.width);
      }
    }
  });

  it('radiais horizontais: sem cotas C e D, sem arco de ângulo', () => {
    const svg = diagram({ ...defaultParams, droopAngleDeg: 0 });
    const texts = svgTexts(svg).join(' | ');
    expect(texts).not.toContain('D =');
    expect(texts).not.toContain('C =');
    expect(svg).not.toContain('dg-angle');
  });
});
