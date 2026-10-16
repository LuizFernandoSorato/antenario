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
  'ground-plane': [{}, { droopAngleDeg: 0 }, { droopAngleDeg: 80 }, { radialCount: 3 }, { radialCount: 8 }],
  'j-pole': [{}, { frequencyMHz: 435 }, { frequencyMHz: 52 }],
  yagi: [{}, { designLength: 0.4 }, { designLength: 1.2, frequencyMHz: 435 }, { designLength: 3.2 }, { designLength: 4.2, boomDiameter: 0 }],
  'cubic-quad': [{}, { directorCount: 0 }, { directorCount: 4, spacingLambda: 0.15 }, { frequencyMHz: 28.5 }],
  discone: [{}, { frequencyMHz: 470 }, { designImpedance: 75, rodCount: 16 }, { frequencyMHz: 2000 }],
  'magnetic-loop': [{}, { frequencyMHz: 14.2, loopDiameter: 0.6 }, { frequencyMHz: 3.6, loopDiameter: 2, tubeDiameter: 0.0254 }],
  'coax-collinear': [{}, { sections: 2 }, { sections: 8, velocityFactor: 0.82 }, { frequencyMHz: 145 }],
  turnstile: [{}, { reflector: 0 }, { frequencyMHz: 435, velocityFactor: 0.82 }],
  qfh: [{}, { frequencyMHz: 1575 }, { frequencyMHz: 400 }],
  helical: [{}, { turns: 4 }, { turns: 20, circumferenceRatio: 1.2 }, { frequencyMHz: 1575 }],
};

describe('diagramas das antenas', () => {
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
