/**
 * Aritmética de números complexos, usada para impedâncias Z = R + jX (ohms).
 *
 * Os valores são imutáveis: toda operação devolve um novo objeto.
 */

export interface Complex {
  /** Parte real (resistência R, em ohms, quando representa impedância). */
  readonly re: number;
  /** Parte imaginária (reatância X, em ohms, quando representa impedância). */
  readonly im: number;
}

export function complex(re: number, im = 0): Complex {
  return { re, im };
}

export const ZERO: Complex = complex(0, 0);
export const ONE: Complex = complex(1, 0);
export const J: Complex = complex(0, 1);

/** Converte número real em complexo; complexos passam inalterados. */
export function toComplex(z: number | Complex): Complex {
  return typeof z === 'number' ? complex(z, 0) : z;
}

export function add(a: Complex, b: Complex): Complex {
  return complex(a.re + b.re, a.im + b.im);
}

export function sub(a: Complex, b: Complex): Complex {
  return complex(a.re - b.re, a.im - b.im);
}

export function mul(a: Complex, b: Complex): Complex {
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

export function scale(a: Complex, k: number): Complex {
  return complex(a.re * k, a.im * k);
}

export function conj(a: Complex): Complex {
  return complex(a.re, -a.im);
}

export function neg(a: Complex): Complex {
  return complex(-a.re, -a.im);
}

/** Divisão a/b. Lança RangeError se b = 0. */
export function div(a: Complex, b: Complex): Complex {
  const den = b.re * b.re + b.im * b.im;
  if (den === 0) {
    throw new RangeError('Divisão por zero complexo.');
  }
  return complex((a.re * b.re + a.im * b.im) / den, (a.im * b.re - a.re * b.im) / den);
}

/** 1/a (ex.: impedância → admitância). */
export function reciprocal(a: Complex): Complex {
  return div(ONE, a);
}

/** Módulo |a|. */
export function abs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

/** Argumento (fase) em radianos, no intervalo (−π, π]. */
export function arg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

/** Cria um complexo a partir de módulo e fase (radianos). */
export function fromPolar(magnitude: number, angleRad: number): Complex {
  return complex(magnitude * Math.cos(angleRad), magnitude * Math.sin(angleRad));
}

/**
 * Associação em paralelo de duas impedâncias: a·b / (a + b).
 * Lança RangeError se a + b = 0 (ressonância paralela ideal, impedância infinita).
 */
export function parallel(a: Complex, b: Complex): Complex {
  return div(mul(a, b), add(a, b));
}

/** Exponencial complexa e^z. */
export function exp(z: Complex): Complex {
  return fromPolar(Math.exp(z.re), z.im);
}

/**
 * Tangente hiperbólica complexa:
 * tanh(x + jy) = (sinh 2x + j·sin 2y) / (cosh 2x + cos 2y).
 * Lança RangeError no polo (x = 0 e cos 2y = −1), onde o valor é infinito.
 */
export function tanh(z: Complex): Complex {
  const den = Math.cosh(2 * z.re) + Math.cos(2 * z.im);
  if (den === 0) {
    throw new RangeError('tanh complexa infinita (polo).');
  }
  return complex(Math.sinh(2 * z.re) / den, Math.sin(2 * z.im) / den);
}

/** Compara dois complexos com tolerância absoluta. */
export function approxEqual(a: Complex, b: Complex, tolerance = 1e-12): boolean {
  return Math.abs(a.re - b.re) <= tolerance && Math.abs(a.im - b.im) <= tolerance;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Representação textual "R ± jX" (para depuração e logs; a UI formata à parte). */
export function toString(a: Complex, decimals = 2): string {
  const sign = a.im < 0 ? '−' : '+';
  return `${a.re.toFixed(decimals)} ${sign} j${Math.abs(a.im).toFixed(decimals)}`;
}
