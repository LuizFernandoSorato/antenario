import { describe, expect, it } from 'vitest';
import {
  J,
  abs,
  add,
  approxEqual,
  arg,
  complex,
  conj,
  degToRad,
  div,
  fromPolar,
  mul,
  parallel,
  radToDeg,
  reciprocal,
  sub,
  toComplex,
  toString,
} from './complex';

const TOL = 1e-12;

describe('aritmética complexa', () => {
  const a = complex(3, 4);
  const b = complex(1, -2);

  it('soma e subtração', () => {
    expect(add(a, b)).toEqual(complex(4, 2));
    expect(sub(a, b)).toEqual(complex(2, 6));
  });

  it('multiplicação: (3+4j)(1−2j) = 11 − 2j', () => {
    expect(mul(a, b)).toEqual(complex(11, -2));
  });

  it('j² = −1', () => {
    expect(mul(J, J)).toEqual(complex(-1, 0));
  });

  it('divisão: (3+4j)/(1−2j) = −1 + 2j', () => {
    expect(approxEqual(div(a, b), complex(-1, 2), TOL)).toBe(true);
  });

  it('divisão por zero lança erro', () => {
    expect(() => div(a, complex(0, 0))).toThrow(RangeError);
  });

  it('módulo, fase e conjugado', () => {
    expect(abs(a)).toBe(5);
    expect(arg(J)).toBeCloseTo(Math.PI / 2, 12);
    expect(conj(a)).toEqual(complex(3, -4));
  });

  it('forma polar ida e volta', () => {
    const z = fromPolar(2, degToRad(30));
    expect(z.re).toBeCloseTo(Math.sqrt(3), 12);
    expect(z.im).toBeCloseTo(1, 12);
    expect(radToDeg(arg(z))).toBeCloseTo(30, 10);
  });

  it('admitância de 50 Ω = 0,02 S', () => {
    expect(approxEqual(reciprocal(complex(50)), complex(0.02), TOL)).toBe(true);
  });

  it('toComplex', () => {
    expect(toComplex(50)).toEqual(complex(50, 0));
    expect(toComplex(a)).toBe(a);
  });

  it('toString', () => {
    expect(toString(complex(50, -25))).toBe('50.00 − j25.00');
  });
});

describe('impedâncias em paralelo', () => {
  it('dois resistores de 100 Ω → 50 Ω', () => {
    expect(approxEqual(parallel(complex(100), complex(100)), complex(50), TOL)).toBe(true);
  });

  it('R = 50 Ω ∥ X = +j50 Ω → 25 + j25 Ω', () => {
    // (50 · j50)/(50 + j50) = j2500/(50+j50) = 25 + j25
    expect(approxEqual(parallel(complex(50), complex(0, 50)), complex(25, 25), TOL)).toBe(true);
  });

  it('L e C ideais ressonantes em paralelo (+jX ∥ −jX) → erro (Z infinita)', () => {
    expect(() => parallel(complex(0, 100), complex(0, -100))).toThrow(RangeError);
  });
});
