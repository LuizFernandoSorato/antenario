import { describe, expect, it } from 'vitest';
import { type Complex, add, complex, reciprocal } from '../core/complex';
import { wavelength } from '../core/wave';
import { inputImpedance, openStubImpedance, shortedStubImpedance } from '../lines/transmission-line';
import { type StubTermination, designSingleStub } from './single-stub';

// Referências:
// - Pozar, Microwave Engineering, 4ª ed., §5.2 (fórmulas fechadas).
// - Conferência independente: monta o circuito com a linha real (inputImpedance + stub)
//   e verifica que a admitância total no ponto do stub é Y0 = 1/Z0.

const F = 145;
const VF = 0.66;

function admittanceAfterStub(
  zl: Complex,
  z0: number,
  termination: StubTermination,
  distanceM: number,
  stubM: number,
): Complex {
  const yLine = reciprocal(inputImpedance(zl, { z0, lengthM: distanceM, velocityFactor: VF }, F));
  const stubSection = { z0, lengthM: stubM, velocityFactor: VF };
  const zStub = termination === 'short' ? shortedStubImpedance(stubSection, F) : openStubImpedance(stubSection, F);
  return add(yLine, reciprocal(zStub));
}

describe('designSingleStub', () => {
  const loads = [complex(60, -80), complex(25), complex(150, 75), complex(50, 40), complex(10, 5)];

  for (const termination of ['short', 'open'] as const) {
    it(`stub em ${termination === 'short' ? 'curto' : 'aberto'}: duas soluções, ambas casam`, () => {
      for (const zl of loads) {
        const sols = designSingleStub({
          zLoad: zl,
          z0: 50,
          fMHz: F,
          lineVelocityFactor: VF,
          stubVelocityFactor: VF,
          termination,
        });
        expect(sols.length).toBeGreaterThanOrEqual(1);
        for (const s of sols) {
          expect(s.distanceWavelengths).toBeGreaterThanOrEqual(0);
          expect(s.distanceWavelengths).toBeLessThan(0.5);
          expect(s.stubWavelengths).toBeGreaterThanOrEqual(0);
          expect(s.stubWavelengths).toBeLessThan(0.5);
          const y = admittanceAfterStub(zl, 50, termination, s.distanceM, s.stubM);
          expect(y.re).toBeCloseTo(1 / 50, 9);
          expect(y.im).toBeCloseTo(0, 9);
        }
      }
    });
  }

  it('metros = fração de λ × λ0 × VF', () => {
    const [s] = designSingleStub({
      zLoad: complex(60, -80),
      z0: 50,
      fMHz: F,
      lineVelocityFactor: VF,
      stubVelocityFactor: 0.82,
      termination: 'short',
    });
    expect(s!.distanceM).toBeCloseTo(s!.distanceWavelengths * wavelength(F) * VF, 12);
    expect(s!.stubM).toBeCloseTo(s!.stubWavelengths * wavelength(F) * 0.82, 12);
  });

  it('carga casada: stub em curto de λ/4 (não faz nada)', () => {
    const [s] = designSingleStub({
      zLoad: 50,
      z0: 50,
      fMHz: F,
      lineVelocityFactor: VF,
      stubVelocityFactor: VF,
      termination: 'short',
    });
    expect(s!.distanceWavelengths).toBeCloseTo(0, 12);
    expect(s!.stubWavelengths).toBeCloseTo(0.25, 12);
  });

  it('rejeita reatância pura', () => {
    expect(() =>
      designSingleStub({
        zLoad: complex(0, 30),
        z0: 50,
        fMHz: F,
        lineVelocityFactor: VF,
        stubVelocityFactor: VF,
        termination: 'short',
      }),
    ).toThrow(RangeError);
  });
});
