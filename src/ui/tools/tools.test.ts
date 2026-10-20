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

describe('diagramas e dicas das ferramentas', () => {
  for (const tool of tools) {
    it(`${tool.id}: tem guia e diagramas SVG bem formados, sem TODO nem NaN`, () => {
      expect(tool.guide?.trim().length ?? 0).toBeGreaterThan(200);
      expect(tool.guide).not.toMatch(/TODO/);
      const out = tool.run(defaults(tool));
      expect(out.diagrams?.length ?? 0).toBeGreaterThan(0);
      const ids = out.diagrams!.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of out.diagrams!) {
        expect(d.svg.startsWith('<svg')).toBe(true);
        expect(d.svg.endsWith('</svg>')).toBe(true);
        expect(d.svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(d.caption.length).toBeGreaterThan(20);
      }
    });
  }

  it('transformador de 1/4 de onda: o desenho dos dois cabos mostra o comprimento de cada um', () => {
    const tool = tools.find((t) => t.id === 'quarter-wave')!;
    const out = tool.run(defaults(tool));
    const pair = out.diagrams!.find((d) => d.id === 'qw-pair')!;
    expect(pair.svg).toMatch(/cada cabo = \d/);
  });

  it('rede L: um diagrama por solução', () => {
    const tool = tools.find((t) => t.id === 'l-network')!;
    const out = tool.run(defaults(tool));
    expect(out.diagrams!.length).toBe(out.sections.length);
  });
});
