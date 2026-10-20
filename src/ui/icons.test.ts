import { describe, expect, it } from 'vitest';
import { antennas } from '../antennas';
import { ICON_IDS, iconSvg } from './icons';
import { homeEntries } from './home-page';
import { tools } from './tools';

describe('ícones e página inicial', () => {
  it('toda antena registrada tem ícone próprio', () => {
    for (const a of antennas) expect(ICON_IDS).toContain(a.meta.id);
  });

  it('toda ferramenta tem ícone próprio (não o medidor genérico)', () => {
    for (const tool of tools) expect(ICON_IDS).toContain(tool.id);
    expect(ICON_IDS).toContain('smith');
  });

  it('ícone é SVG bem formado e acessível (decorativo)', () => {
    for (const id of ICON_IDS) {
      const svg = iconSvg(id);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('id desconhecido usa o ícone genérico', () => {
    expect(iconSvg('nao-existe')).toBe(iconSvg('generic'));
    expect(iconSvg('nao-existe', 'tool')).toBe(iconSvg('tool'));
  });

  it('a página inicial lista todas as antenas e ferramentas, com ids únicos', () => {
    const e = homeEntries(antennas, tools);
    expect(e.antennas).toHaveLength(antennas.length);
    expect(e.tools).toHaveLength(tools.length + 1); // + Carta de Smith
    const ids = [...e.antennas, ...e.tools].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
