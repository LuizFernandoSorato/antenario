import { describe, expect, it } from 'vitest';
import { DIPOLE_K_MAX_DIAMETER_LAMBDA, DIPOLE_K_MIN_DIAMETER_LAMBDA, dipoleShorteningFactor } from '../core/dipole-resonance';
import { kAssumption, kWarning, shorteningFactorFor } from './k-factor';

// O helper só escolhe o diâmetro em λ e limita à faixa do modelo; o modelo é conferido em core/dipole-resonance.test.ts.

const C = 299.792458;

describe('K pelo diâmetro (helper das antenas)', () => {
  it('dentro da faixa: K do modelo, sem aviso', () => {
    const sf = shorteningFactorFor(0.002, 145);
    expect(sf.diameterLambda).toBeCloseTo(0.002 / (C / 145), 15);
    expect(sf.k).toBe(dipoleShorteningFactor(sf.diameterLambda));
    expect(sf.clamped).toBeNull();
    expect(kWarning(sf)).toBeNull();
    expect(kAssumption(sf, 'do radiador').name).toBe('Fator de encurtamento do radiador (K)');
  });

  it('mais grosso que o limite: K do limite (menor K possível no modelo = medida comprida) e aviso', () => {
    const sf = shorteningFactorFor(0.02, 435);
    expect(sf.clamped).toBe('thick');
    expect(sf.k).toBe(dipoleShorteningFactor(DIPOLE_K_MAX_DIAMETER_LAMBDA));
    expect(kWarning(sf, 'o tubo')!.level).toBe('warning');
    expect(kWarning(sf, 'o tubo')!.message).toMatch(/^O tubo tem/);
    expect(kAssumption(sf).value).toMatch(/limite do modelo/);
  });

  it('mais fino que o limite: K do limite e aviso informativo', () => {
    const sf = shorteningFactorFor(1e-6, 1.8);
    expect(sf.diameterLambda).toBeLessThan(DIPOLE_K_MIN_DIAMETER_LAMBDA);
    expect(sf.clamped).toBe('thin');
    expect(sf.k).toBe(dipoleShorteningFactor(DIPOLE_K_MIN_DIAMETER_LAMBDA));
    expect(kWarning(sf)!.level).toBe('info');
  });
});
