import { describe, expect, it } from 'vitest';
import { MAX_NOTE_LENGTH, MAX_SOURCE_LENGTH } from './bandwidth';
import { antennas } from './index';

// Teste de consistência: a UI monta o formulário a partir de meta.params, então
// cada campo precisa existir em defaultParams com o mesmo valor (em SI).

// Antenas com método dos momentos (Moxon, discone, QFH, Yagi) podem passar dos 5 s padrão com a suíte toda em paralelo.
describe('registro de antenas', { timeout: 60_000 }, () => {
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

      it('campos booleanos e de escolha: boolean vale 0 ou 1 e choice tem opções com o padrão entre elas', () => {
        for (const p of antenna.meta.params) {
          if (p.kind === 'boolean') expect([0, 1]).toContain(p.defaultValue);
          if (p.kind === 'choice') {
            expect(p.options!.length).toBeGreaterThanOrEqual(2);
            expect(p.options!.map((o) => o.value)).toContain(p.defaultValue);
            expect(new Set(p.options!.map((o) => o.value)).size).toBe(p.options!.length);
          } else {
            expect(p.options).toBeUndefined();
          }
        }
      });

      it('campo dependente (enabledBy) aponta para uma caixa de seleção que vem antes dele', () => {
        const params = antenna.meta.params;
        params.forEach((p, i) => {
          if (p.enabledBy === undefined) return;
          const owner = params.findIndex((q) => q.key === p.enabledBy);
          expect(owner).toBeGreaterThanOrEqual(0);
          expect(owner).toBeLessThan(i);
          expect(params[owner]!.kind).toBe('boolean');
          expect(params[owner]!.enabledBy).toBeUndefined();
        });
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

      it('nota e fonte da banda cabem no cartão (os três cartões ficam lado a lado)', () => {
        const { bandwidth } = antenna.calc({}).expected;
        if (!bandwidth) return;
        expect(bandwidth.note.length).toBeLessThanOrEqual(MAX_NOTE_LENGTH);
        expect(bandwidth.source.length).toBeLessThanOrEqual(MAX_SOURCE_LENGTH);
      });

      it('guia segue o modelo de 9 seções do CLAUDE.md', () => {
        const headings = [...antenna.guide.matchAll(/^## (\d+)\. (.+)$/gm)].map((m) => Number(m[1]));
        expect(headings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });

      it('guia cita cada cota do cálculo (A, B, C…) em negrito', () => {
        for (const m of antenna.calc({}).measurements) {
          expect(antenna.guide).toContain(`**${m.label}**`);
        }
      });

      it('lista de corte só usa cotas que existem no cálculo e medidas iguais às dele', () => {
        const byLabel = new Map(antenna.calc({}).measurements.map((m) => [m.label, m.meters]));
        const items = antenna.cutList({});
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(byLabel.get(item.label)).toBe(item.meters);
          expect(item.quantity).toBeGreaterThanOrEqual(1);
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
