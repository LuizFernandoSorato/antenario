import { describe, expect, it } from 'vitest';
import { antennas } from '../../antennas';
import { tools } from './index';
import type { ToolValues } from './types';

// Testes da "cola" de UI das ferramentas (sem DOM): cada ferramenta roda com os
// valores padrão, gera seções e cita premissas. A física já é testada em
// src/lines e src/matching.

function defaults(tool: (typeof tools)[number]): ToolValues {
  return Object.fromEntries(tool.fields.map((f) => [f.key, f.defaultValue]));
}

describe('ferramentas', () => {
  it('ids únicos, sem colidir com os ids das antenas (rota pelo hash)', () => {
    const ids = [...tools.map((t) => t.id), ...antennas.map((a) => a.meta.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const tool of tools) {
    describe(tool.id, () => {
      it('padrão de cada seleção existe entre as opções', () => {
        for (const f of tool.fields) {
          if (f.kind === 'select') {
            expect(f.options.map((o) => o.value)).toContain(f.defaultValue);
          }
        }
      });

      it('roda com os valores padrão e mostra resultado e premissas', () => {
        const out = tool.run(defaults(tool));
        expect(out.sections.length).toBeGreaterThan(0);
        for (const s of out.sections) expect(s.rows.length).toBeGreaterThan(0);
        expect(out.assumptions.length).toBeGreaterThan(0);
      });
    });
  }

  it('perdas no cabo: RG-213, 145 MHz, 20 m mostra perda em dB', () => {
    const tool = tools.find((t) => t.id === 'cable-loss')!;
    const out = tool.run(defaults(tool));
    const total = out.sections[0]!.rows.find((r) => r.label === 'Perda total')!;
    expect(total.value).toMatch(/^\d+,\d{2} dB$/);
  });

  it('rede L: carga padrão gera ao menos uma solução com componentes', () => {
    const tool = tools.find((t) => t.id === 'l-network')!;
    const out = tool.run(defaults(tool));
    expect(out.sections.some((s) => s.rows.some((r) => /Indutor|Capacitor/.test(r.value)))).toBe(true);
  });
});
