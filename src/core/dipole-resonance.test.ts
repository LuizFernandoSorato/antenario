import { describe, expect, it } from 'vitest';
import { DIPOLE_K_MAX_DIAMETER_LAMBDA, DIPOLE_K_MIN_DIAMETER_LAMBDA, dipoleShorteningFactor } from './dipole-resonance';

// Referências:
// - L. B. Cebik, W4RNL, "80-Meter Dipoles and Inverted-Vs: A Graphical Scrapbook" (NEC-4, espaço livre, condutor perfeito):
//   dipolo reto de fio AWG #12 (2,053 mm) ressoa com 127,7 pés em 3,75 MHz. Espelho:
//   https://antenna2.github.io/cebik/content/wire/80dp.pdf. Tolerância: 0,3 % (o NEC-4 e o nosso kernel diferem um pouco).
// - Curva K × λ/2d do ARRL Antenna Book, lida e ajustada pelo projeto webantenna (vkopitsa/webantenna, docs/ANTENNAS.md, MIT):
//   K = 1 − 0,225/ln(λ/2d). FONTE SECUNDÁRIA (o livro não foi consultado): só conferimos a tendência e a ordem de grandeza.
//   O modelo fica abaixo do ajuste deles, de 0,1 % (fio fino) a 1,1 % (λ/2d = 100).

const FT = 0.3048;
const webantennaFit = (dLambda: number) => 1 - 0.225 / Math.log(1 / (2 * dLambda));
const GRID = [1e-6, 1e-5, 1e-4, 1e-3, 3e-3, 5e-3];

describe('fator K do dipolo pelo diâmetro (método dos momentos)', () => {
  it('confere com o NEC-4 do Cebik: AWG #12 em 3,75 MHz, 127,7 pés (0,3 %)', () => {
    const lambda = 299.792458 / 3.75;
    const k = dipoleShorteningFactor(0.0020525 / lambda);
    const cebik = (127.7 * FT) / (lambda / 2);
    expect(Math.abs(k - cebik) / cebik).toBeLessThan(0.003);
  });

  it('diminui com o diâmetro e fica perto do ajuste da curva do ARRL (webantenna) e abaixo dele', () => {
    let previous = 1;
    for (const d of GRID) {
      const k = dipoleShorteningFactor(d);
      expect(k).toBeLessThan(previous);
      previous = k;
      const fit = webantennaFit(d);
      expect(k).toBeLessThan(fit);
      expect(fit - k).toBeLessThan(0.012);
    }
  });

  it('o valor típico de 0,95 (regra 468/f) cai no meio da faixa: K entre 0,93 e 0,99', () => {
    for (const d of GRID) {
      const k = dipoleShorteningFactor(d);
      expect(k).toBeGreaterThan(0.93);
      expect(k).toBeLessThan(0.99);
    }
  });

  it('convergência: 40 e 80 trechos diferem ≤ 0,15 % em toda a faixa', () => {
    for (const d of GRID) {
      const k40 = dipoleShorteningFactor(d);
      const k80 = dipoleShorteningFactor(d, 80);
      expect(Math.abs(k40 - k80) / k80).toBeLessThan(0.0015);
    }
  });

  it('recusa diâmetros fora da faixa conferida', () => {
    expect(() => dipoleShorteningFactor(DIPOLE_K_MIN_DIAMETER_LAMBDA / 2)).toThrow(RangeError);
    expect(() => dipoleShorteningFactor(DIPOLE_K_MAX_DIAMETER_LAMBDA * 1.01)).toThrow(RangeError);
    expect(() => dipoleShorteningFactor(Number.NaN)).toThrow(RangeError);
  });
});
