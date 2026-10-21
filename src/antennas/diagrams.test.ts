import { describe, expect, it } from 'vitest';
import { formatLength, lengthResolutionForFrequency } from '../core/units';
import { dimension } from './diagram-kit';
import { antennas } from './index';

// Os diagramas são gerados a partir do cálculo: cada cota do resultado precisa
// aparecer no desenho com o mesmo valor exibido na tabela, e o SVG precisa ser
// bem formado (sem NaN, ids únicos na página, tags balanceadas).

function tagBalance(svg: string): Record<string, number> {
  const balance: Record<string, number> = {};
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = m;
    if (selfClosing) continue;
    balance[name!] = (balance[name!] ?? 0) + (closing ? -1 : 1);
  }
  return balance;
}

const scenarios: Record<string, Record<string, number>[]> = {
  dipole: [{}, { centerGap: 0.01 }, { frequencyMHz: 7.1 }],
  bazooka: [{}, { centerGap: 0.01 }, { frequencyMHz: 145, cable: 4 }, { frequencyMHz: 3.65, velocityFactor: 0.78 }, { frequencyMHz: 1.9, cable: 5 }],
  'inverted-v': [{}, { apexAngleDeg: 180 }, { apexAngleDeg: 90, centerGap: 0.02, apexHeight: 20 }, { frequencyMHz: 3.65, apexHeight: 15 }, { frequencyMHz: 145, apexHeight: 30 }, { apexAngleDeg: 60, apexHeight: 30 }],
  flowerpot: [{}, { frequencyMHz: 52.4 }, { frequencyMHz: 435 }, { housing: 2, chokeBand: 1 }, { frequencyMHz: 52.4, formerDiameter: 0.025 }],
  'ground-plane': [{}, { droopAngleDeg: 0 }, { droopAngleDeg: 80 }, { radialCount: 3 }, { radialCount: 8 }],
  adsb: [{}, { droopAngleDeg: 0 }, { radialCount: 3 }],
  'j-pole': [{}, { frequencyMHz: 435 }, { frequencyMHz: 52 }],
  yagi: [{ method: 2, elementCount: 11 }, { method: 2, elementCount: 14, boomDiameter: 0 }, { method: 2, elementCount: 20, frequencyMHz: 435 }, { method: 2, elementCount: 24 }, {}, { elementCount: 3 }, { elementCount: 6, frequencyMHz: 435 }, { elementCount: 17 }, { elementCount: 15, boomDiameter: 0 }],
  'cross-yagi': [{}, { circularSense: 2 }, { yagiImpedance: 50 }, { method: 2, elementCount: 12, frequencyMHz: 137.5 }],
  moxon: [{}, { centerGap: 0.01 }, { frequencyMHz: 7.15, conductorDiameter: 0.00205 }, { frequencyMHz: 28.5, conductorDiameter: 0.0254 }, { frequencyMHz: 435, conductorDiameter: 0.003 }],
  'cubic-quad': [{}, { directorCount: 0 }, { directorCount: 4, spacingLambda: 0.15 }, { frequencyMHz: 28.5 }],
  discone: [{}, { frequencyMHz: 470 }, { designImpedance: 75, rodCount: 16 }, { frequencyMHz: 2000 }],
  'magnetic-loop': [{}, { frequencyMHz: 14.2, loopDiameter: 0.6 }, { frequencyMHz: 3.6, loopDiameter: 2, tubeDiameter: 0.0254 }],
  'coax-collinear': [{}, { sections: 2 }, { sections: 8, velocityFactor: 0.82 }, { frequencyMHz: 145 }],
  turnstile: [{}, { reflectorKind: 2 }, { circularSense: 2 }, { reflector: 0, circularSense: 2 }, { frequencyMHz: 435, velocityFactor: 0.82 }],
  qfh: [{}, { circularSense: 2 }, { frequencyMHz: 1575 }, { frequencyMHz: 400 }],
  helical: [{}, { circularSense: 2 }, { turns: 4 }, { turns: 20, circumferenceRatio: 1.2 }, { frequencyMHz: 1575 }],
};

// Várias antenas (discone, QFH, Yagi, Moxon) rodam o método dos momentos para os padrões: com a suíte toda em paralelo,
// um cenário pode passar dos 5 s padrão.
describe('diagramas das antenas', { timeout: 60_000 }, () => {
  for (const antenna of antennas) {
    describe(antenna.meta.id, () => {
      for (const params of scenarios[antenna.meta.id] ?? [{}]) {
        it(`bem formado e com todas as cotas (${JSON.stringify(params)})`, () => {
          const result = antenna.calc(params);
          const diagrams = antenna.diagrams(params);
          expect(diagrams.length).toBeGreaterThan(0);
          const all = diagrams.map((d) => d.svg).join('');

          expect(all).not.toMatch(/NaN|undefined|Infinity/);
          for (const d of diagrams) {
            expect(d.svg.startsWith('<svg')).toBe(true);
            expect(d.svg).toContain(`<title id="${d.id}-title">`);
            expect(Object.values(tagBalance(d.svg)).every((v) => v === 0)).toBe(true);
            expect(d.caption.length).toBeGreaterThan(0);
          }
          // ids únicos entre os diagramas da página
          expect(new Set(diagrams.map((d) => d.id)).size).toBe(diagrams.length);

          const f = { ...antenna.defaultParams, ...params }['frequencyMHz']!;
          const res = lengthResolutionForFrequency(f);
          for (const m of result.measurements) {
            const shown = `${m.label} = ${formatLength(m.meters, res)}`;
            // A cota C do dipolo (isolador) aparece só com a letra; o valor está na tabela.
            if (antenna.meta.id === 'dipole' && m.label === 'C') {
              expect(all).toContain('>C<');
            } else if ((antenna.meta.id === 'yagi' || antenna.meta.id === 'cross-yagi') && /^P[0-9]+$/.test(m.label)) {
              // Posições do DL6WU: só na tabela de medidas (o desenho mostra os elementos nelas).
              continue;
            } else {
              expect(all).toContain(shown);
            }
          }
        });
      }

      it('guia de construção carregado', () => {
        expect(antenna.guide).toMatch(/^# /);
        expect(antenna.guide).toContain('## 4. Passo a passo');
      });
    });
  }

  it('yagi DL6WU com muitos elementos (até o limite de 40): SVG válido, sem rótulos individuais (ficam na tabela)', () => {
    const yagi = antennas.find((a) => a.meta.id === 'yagi')!;
    for (const n of [40]) {
      const svg = yagi.diagrams({ method: 2, elementCount: n })[0]!.svg;
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg).not.toContain('D1 =');
      expect(svg).toContain('L = ');
    }
  });

  it('Yagi e cross Yagi recusam mais de 40 elementos (limite do padrão por momentos)', () => {
    for (const id of ['yagi', 'cross-yagi']) {
      const a = antennas.find((x) => x.meta.id === id)!;
      expect(a.meta.params.find((p) => p.key === 'elementCount')!.max).toBe(40);
      expect(() => a.calc({ elementCount: 40 })).not.toThrow();
      for (const n of [41, 60, 102]) {
        expect(() => a.calc({ elementCount: n })).toThrow(RangeError);
        expect(() => a.diagrams({ elementCount: n })).toThrow(RangeError);
      }
    }
  });

  it('ground plane: vista de cima tem um traço por radial', () => {
    const gp = antennas.find((a) => a.meta.id === 'ground-plane')!;
    for (const n of [3, 4, 6]) {
      const top = gp.diagrams({ radialCount: n }).find((d) => d.id === 'gp-top')!;
      expect(top.svg.match(/class="dg-conductor"/g)!.length).toBe(n);
      expect(top.svg).toContain(`${n} radiais`);
    }
  });

  it('ground plane: inclinação muda a geometria (radiais horizontais não têm cota D)', () => {
    const gp = antennas.find((a) => a.meta.id === 'ground-plane')!;
    const flat = gp.diagrams({ droopAngleDeg: 0 })[0]!.svg;
    const drooped = gp.diagrams({ droopAngleDeg: 45 })[0]!.svg;
    expect(flat).not.toContain('D = ');
    expect(drooped).toContain('D = ');
    expect(flat).not.toBe(drooped);
  });
});

describe('dimension (cota)', () => {
  it('horizontal com deslocamento negativo fica acima da linha medida', () => {
    const svg = dimension('t', 0, 100, 200, 100, -40, 'A');
    expect(svg).toContain('y1="60"');
    expect(svg).toContain('marker-start="url(#t-arrow)"');
  });

  it('comprimento zero não desenha nada', () => {
    expect(dimension('t', 5, 5, 5, 5, 10, 'X')).toBe('');
  });
});
