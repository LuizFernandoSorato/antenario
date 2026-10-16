import { describe, expect, it } from 'vitest';
import { antennas } from './index';

// Teste de consistência: a UI monta o formulário a partir de meta.params, então
// cada campo precisa existir em defaultParams com o mesmo valor (em SI).

describe('registro de antenas', () => {
  it('ids únicos', () => {
    const ids = antennas.map((a) => a.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const antenna of antennas) {
    describe(antenna.meta.id, () => {
      it('meta.params corresponde exatamente a defaultParams', () => {
        const metaKeys = antenna.meta.params.map((p) => p.key).sort();
        expect(metaKeys).toEqual(Object.keys(antenna.defaultParams).sort());
        for (const p of antenna.meta.params) {
          expect(p.defaultValue * p.toSi).toBeCloseTo(antenna.defaultParams[p.key]!, 12);
        }
      });

      it('calcula com os valores padrão e declara premissas', () => {
        const r = antenna.calc({});
        expect(r.measurements.length).toBeGreaterThan(0);
        expect(r.assumptions.length).toBeGreaterThan(0);
        for (const m of r.measurements) {
          expect(m.meters).toBeGreaterThan(0);
        }
      });

      it('toda estimativa cita a fonte', () => {
        const { impedance, gain, bandwidth } = antenna.calc({}).expected;
        for (const e of [impedance, gain, bandwidth]) {
          if (e) expect(e.source.length).toBeGreaterThan(0);
        }
      });

      it('antena de TX traz aviso de tensão alta', () => {
        if (!antenna.meta.usage.tx) return;
        const r = antenna.calc({});
        expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
      });
    });
  }
});
