import { describe, expect, it } from 'vitest';
import { assertWellFormed, svgTexts } from '../test-utils';
import { calc, defaultParams } from './calc';
import { diagram, layout } from './diagram';

describe('J-pole: diagrama', () => {
  it('SVG bem formado e com todas as cotas do cálculo', () => {
    const svg = diagram(defaultParams);
    assertWellFormed(svg);
    const texts = svgTexts(svg).join(' | ');
    for (const m of calc(defaultParams).measurements) {
      expect(texts).toContain(`${m.label} =`);
    }
  });

  it('desenha em escala vertical: A, B e C na mesma razão das medidas', () => {
    const l = layout(defaultParams);
    const m = Object.fromEntries(calc(defaultParams).measurements.map((x) => [x.label, x.meters]));
    expect(l.longPx / l.radiatorPx).toBeCloseTo(m['A']! / m['B']!, 10);
    expect(l.shortPx / l.radiatorPx).toBeCloseTo(m['C']! / m['B']!, 10);
    expect(l.longPx).toBeCloseTo(l.radiatorPx + l.shortPx, 10);
  });

  it('espaçamento real é muito menor que a altura: é exagerado e avisado', () => {
    const l = layout(defaultParams);
    expect(l.spacingExaggerated).toBe(true);
    expect(svgTexts(diagram(defaultParams)).join(' ')).toContain('fora de escala');
  });

  it('espaçamento grande o bastante é desenhado em escala', () => {
    const params = { ...defaultParams, spacing: 0.4, conductorDiameter: 0.0127 };
    const l = layout(params);
    const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters]));
    expect(l.spacingExaggerated).toBe(false);
    expect(l.spacingPx / l.radiatorPx).toBeCloseTo(m['D']! / m['B']!, 10);
  });

  it('não marca posição numérica do ponto de alimentação (TODO(fonte))', () => {
    const texts = svgTexts(diagram(defaultParams)).join(' ');
    expect(texts).toMatch(/não calculad/);
  });

  it('cabe no quadro em várias frequências', () => {
    for (const f of [50, 145, 435]) {
      const l = layout({ ...defaultParams, frequencyMHz: f });
      expect(l.topY).toBeGreaterThanOrEqual(0);
      expect(l.baseY).toBeLessThanOrEqual(l.height);
    }
  });
});
