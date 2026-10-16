import { describe, expect, it } from 'vitest';
import { coaxCables, findCable } from './coax-cables';

// Testes de integridade dos dados transcritos (não substituem conferir o datasheet).

describe('tabela de cabos coaxiais', () => {
  it('ids únicos', () => {
    const ids = coaxCables.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const cable of coaxCables) {
    describe(cable.name, () => {
      it('cita fonte com URL, revisão e data de consulta', () => {
        expect(cable.source.url).toMatch(/^https:\/\//);
        expect(cable.source.revision.length).toBeGreaterThan(0);
        expect(cable.source.consulted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('valores físicos plausíveis', () => {
        expect(cable.velocityFactor).toBeGreaterThan(0);
        expect(cable.velocityFactor).toBeLessThanOrEqual(1);
        expect([50, 52, 75]).toContain(cable.impedanceOhms);
      });

      it('tabela de atenuação ordenada e crescente com a frequência', () => {
        const pts = cable.attenuationDbPer100ft;
        expect(pts.length).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < pts.length; i++) {
          expect(pts[i]!.fMHz).toBeGreaterThan(pts[i - 1]!.fMHz);
          expect(pts[i]!.value).toBeGreaterThan(pts[i - 1]!.value);
        }
      });

      it('tabela de potência (se houver) ordenada e decrescente com a frequência', () => {
        const pts = cable.maxPowerW;
        if (!pts) {
          expect(cable.powerConditions).toBeNull();
          return;
        }
        for (let i = 1; i < pts.length; i++) {
          expect(pts[i]!.fMHz).toBeGreaterThan(pts[i - 1]!.fMHz);
          expect(pts[i]!.value).toBeLessThan(pts[i - 1]!.value);
        }
      });
    });
  }

  it('findCable', () => {
    expect(findCable('belden-8267')?.partNumber).toBe('8267');
    expect(findCable('nao-existe')).toBeUndefined();
  });
});
