import { describe, expect, it } from 'vitest';
import { assertWellFormed, svgTexts } from '../test-utils';
import { calc, defaultParams } from './calc';
import { diagram, layout } from './diagram';

describe('dipolo: diagrama', () => {
  it('SVG bem formado e com todas as cotas do cálculo', () => {
    const params = { ...defaultParams, frequencyMHz: 145, centerGap: 0.01 };
    const svg = diagram(params);
    assertWellFormed(svg);
    const texts = svgTexts(svg).join(' | ');
    for (const m of calc(params).measurements) {
      expect(texts).toContain(`${m.label} =`);
    }
    // 145 MHz usa mm: A = 982 mm.
    expect(texts).toContain('A = 982 mm');
  });

  it('desenha em escala: razão braço/total igual à razão B/A', () => {
    const params = { ...defaultParams, frequencyMHz: 145, centerGap: 0.1 };
    const l = layout(params);
    const m = Object.fromEntries(calc(params).measurements.map((x) => [x.label, x.meters]));
    expect(l.gapExaggerated).toBe(false);
    expect(l.armPx / l.totalPx).toBeCloseTo(m['B']! / m['A']!, 10);
    expect(l.gapPx / l.totalPx).toBeCloseTo(m['C']! / m['A']!, 10);
  });

  it('espaço central minúsculo é exagerado e avisado no desenho', () => {
    const params = { ...defaultParams, frequencyMHz: 14.2, centerGap: 0.01 };
    const l = layout(params);
    expect(l.gapExaggerated).toBe(true);
    expect(svgTexts(diagram(params)).join(' ')).toContain('fora de escala');
  });

  it('sem espaço central não há cota C', () => {
    const texts = svgTexts(diagram({ ...defaultParams, centerGap: 0 })).join(' ');
    expect(texts).not.toContain('C =');
  });

  it('escapa texto e usa unidades por faixa (HF em metros)', () => {
    const texts = svgTexts(diagram({ ...defaultParams, frequencyMHz: 7.1 })).join(' ');
    expect(texts).toMatch(/A = 20,06 m/);
  });
});
