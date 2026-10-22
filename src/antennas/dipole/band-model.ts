/**
 * Impedância do dipolo reto ressonante em função da frequência, pelo método dos momentos (core/mom.ts), no espaço livre.
 *
 * O comprimento é o que ressoa (X = 0) na frequência de projeto com o diâmetro dado: é a antena já ajustada, como o guia manda
 * fazer. Serve à banda de ROE do dipolo e das antenas feitas de dipolos (ground plane pela teoria das imagens, turnstile).
 *
 * Opcionalmente com um refletor paralelo ao dipolo (o dipolo é reajustado para ressoar com ele):
 *  - plano: plano condutor infinito, pela teoria das imagens (dipolo imagem a 2× a distância, com corrente invertida; Balanis,
 *    Antenna Theory, 4ª ed., §4.7);
 *  - tubo: um tubo parasita do comprimento dado.
 *
 * Validação (teste): com fio AWG #12 em 3,75 MHz a faixa de ROE < 2:1 em 50 Ω sai ≈ 156 kHz; L. B. Cebik, W4RNL, "80-Meter
 * Dipoles and Inverted-Vs" (NEC-4, sobre solo médio; espelho https://antenna2.github.io/cebik/content/wire/80dp.pdf) diz que,
 * mesmo casado, o dipolo de 80 m cobre "only about 150-200 kHz".
 */

import { type Complex, complex } from '../../core/complex';
import { DIPOLE_K_MAX_DIAMETER_LAMBDA, DIPOLE_K_MIN_DIAMETER_LAMBDA, segmentsFor } from '../../core/dipole-resonance';
import { type Source, type Vec3, type Wire, solveWires } from '../../core/mom';
import { wavelength } from '../../core/wave';

/** Até 30 trechos: a banda muda < 0,5 % em relação a 80 trechos (conferido no 80 m, 2 m e 70 cm). Fios grossos pedem menos. */
const MAX_SEGMENTS = 30;

export type DipoleReflector =
  | { kind: 'plane'; distanceM: number }
  | { kind: 'tube'; distanceM: number; lengthM: number; diameterM: number };

export interface DipoleBandModel {
  /** Comprimento ressonante, em λ da frequência de projeto. */
  lengthLambda: number;
  /** Diâmetro usado no modelo, em λ (limitado à faixa do modelo do K). */
  diameterLambda: number;
  /** true quando o diâmetro foi limitado à faixa do modelo. */
  clamped: boolean;
  /** Impedância de entrada na frequência f (MHz). */
  impedanceAt: (fMHz: number) => Complex;
}

function line(lengthM: number, segments: number, x: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) pts.push([x, 0, (i / segments - 0.5) * lengthM]);
  return pts;
}

function impedance(lengthM: number, radiusM: number, fMHz: number, segments: number, reflector: DipoleReflector | undefined): Complex {
  const wires: Wire[] = [{ points: line(lengthM, segments, 0), radius: radiusM }];
  const sources: Source[] = [{ wire: 0, node: segments / 2, volts: { re: 1, im: 0 } }];
  if (reflector?.kind === 'plane') {
    wires.push({ points: line(lengthM, segments, -2 * reflector.distanceM), radius: radiusM });
    sources.push({ wire: 1, node: segments / 2, volts: { re: -1, im: 0 } });
  } else if (reflector?.kind === 'tube') {
    const n = Math.max(4, 2 * Math.round((segments * reflector.lengthM) / lengthM / 2));
    wires.push({ points: line(reflector.lengthM, n, -reflector.distanceM), radius: reflector.diameterM / 2 });
  }
  const z = solveWires(wires, fMHz, sources).inputImpedance(0);
  return complex(z.re, z.im);
}

const cache = new Map<string, DipoleBandModel>();

/** Dipolo reto de condutor com diâmetro `diameterM` (m), ressonante em `frequencyMHz`. */
export function dipoleBandModel(frequencyMHz: number, diameterM: number, reflector?: DipoleReflector): DipoleBandModel {
  const key = JSON.stringify([frequencyMHz, diameterM, reflector ?? null]);
  const hit = cache.get(key);
  if (hit) return hit;

  const lambda = wavelength(frequencyMHz);
  const raw = diameterM / lambda;
  const diameterLambda = Math.min(Math.max(raw, DIPOLE_K_MIN_DIAMETER_LAMBDA), DIPOLE_K_MAX_DIAMETER_LAMBDA);
  const segments = Math.min(MAX_SEGMENTS, segmentsFor(diameterLambda));
  const radiusM = (diameterLambda * lambda) / 2;

  // Secante sobre a reatância, como em core/dipole-resonance.ts.
  const x = (l: number) => impedance(l * lambda, radiusM, frequencyMHz, segments, reflector).im;
  let l0 = 0.46;
  let l1 = 0.49;
  let x0 = x(l0);
  let x1 = x(l1);
  for (let it = 0; it < 30 && Math.abs(x1) > 1e-3 && x1 !== x0; it++) {
    const l2 = l1 - (x1 * (l1 - l0)) / (x1 - x0);
    l0 = l1;
    x0 = x1;
    l1 = Math.min(0.55, Math.max(0.4, l2));
    x1 = x(l1);
  }
  const lengthM = l1 * lambda;

  const zCache = new Map<number, Complex>();
  const model: DipoleBandModel = {
    lengthLambda: l1,
    diameterLambda,
    clamped: diameterLambda !== raw,
    impedanceAt: (f) => {
      let z = zCache.get(f);
      if (!z) {
        z = impedance(lengthM, radiusM, f, segments, reflector);
        zCache.set(f, z);
      }
      return z;
    },
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, model);
  return model;
}

/** Varredura de ±15 % em passos de 1 %, interpolada para 601 pontos (mesma do V invertido). */
export const DIPOLE_SWEEP = { span: 0.15, coarseSteps: 30, fineSteps: 600 } as const;
