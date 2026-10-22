import { describe, expect, it } from 'vitest';
import { dipoleShorteningFactor } from '../../core/dipole-resonance';
import { wavelength } from '../../core/wave';
import { AVAILABLE_ELEMENT_COUNTS, calc, chooseMethod, defaultParams, elementPositionsLambda, findDesign } from './calc';
import { cutList } from './cutlist';
import {
  boomCorrection as dl6wuBoomCorrection,
  directorLengths as dl6wuDirectorLengths,
  reflectorLength as dl6wuReflectorLength,
} from './dl6wu';
import { NBS_DESIGNS, boomCorrection, directorLengths, reflectorLength } from './nbs688';

// Referências: NBS Technical Note 688 (Viezbicke, 1976).
// - Tabela 1 (p. 7): comprimentos dos parasitas em d/λ = 0,0085, espaçamento e ganho.
// - Exemplo 1 (pp. 16-17): Yagi de 0,8λ em 50,1 MHz, d/λ = 0,0042, boom D/λ = 0,0085.
// - Exemplo 2 (pp. 19-20): Yagi de 4,2λ em 827 MHz, d/λ = 0,013, boom D/λ = 0,035.
// As curvas da Fig. 9 foram digitalizadas; os exemplos validam essa leitura. O próprio NBS pede
// tolerância de corte de 0,003λ; aceitamos 0,004λ na validação (incerteza de leitura da figura
// somada à do relatório, cujos exemplos foram feitos com compasso sobre o gráfico).

const TOL = 0.004;

function design(length: number) {
  return NBS_DESIGNS.find((d) => d.lengthLambda === length)!;
}

describe('NBS TN 688: Tabela 1', { timeout: 60_000 }, () => {
  it('em d/λ = 0,0085 os diretores e o refletor reproduzem a Tabela 1', () => {
    for (const d of NBS_DESIGNS) {
      directorLengths(d, 0.0085).forEach((l, i) => expect(l).toBeCloseTo(d.directors[i]!, 3));
      expect(reflectorLength(d, 0.0085)).toBeCloseTo(d.reflector, 12);
    }
  });

  it('comprimento total = 0,2λ + diretores × espaçamento (confere com o título de cada coluna)', () => {
    for (const d of NBS_DESIGNS) {
      expect(0.2 + d.directorCount * d.spacing).toBeCloseTo(d.lengthLambda, 1);
      expect(d.directors.length).toBe(d.directorCount);
    }
  });

  it('ganhos da tabela: 7,1 / 9,2 / 10,2 / 12,25 / 13,4 / 14,2 dB', () => {
    expect(NBS_DESIGNS.map((d) => d.gainDbd)).toEqual([7.1, 9.2, 10.2, 12.25, 13.4, 14.2]);
  });
});

describe('NBS TN 688: exemplo 1 (0,8λ, d/λ = 0,0042)', { timeout: 60_000 }, () => {
  const published = [0.442, 0.438, 0.442]; // D1 = D3, D2 (sem compensação de boom)
  it('diretores sem compensação', () => {
    directorLengths(design(0.8), 0.0042).forEach((l, i) => expect(Math.abs(l - published[i]!)).toBeLessThan(TOL));
  });
  it('refletor sem compensação: 0,485λ', () => {
    expect(Math.abs(reflectorLength(design(0.8), 0.0042) - 0.485)).toBeLessThan(0.002);
  });
  it('correção de boom D/λ = 0,0085: 0,005λ', () => {
    expect(boomCorrection(0.0085)).toBeCloseTo(0.005, 12);
  });
});

describe('NBS TN 688: exemplo 2 (4,2λ, d/λ = 0,013)', { timeout: 60_000 }, () => {
  // D1 = D2, D3, D4, D5, D6, D7, D8…D13 (sem compensação de boom)
  const published = [0.414, 0.414, 0.409, 0.395, 0.391, 0.385, 0.381, 0.377, 0.377, 0.377, 0.377, 0.377, 0.377];
  it('diretores sem compensação', () => {
    const got = directorLengths(design(4.2), 0.013);
    got.forEach((l, i) => expect(Math.abs(l - published[i]!)).toBeLessThan(TOL));
  });
  it('refletor sem compensação: 0,473λ', () => {
    expect(Math.abs(reflectorLength(design(4.2), 0.013) - 0.473)).toBeLessThan(0.002);
  });
  it('correção de boom D/λ = 0,035: 0,026λ', () => {
    expect(boomCorrection(0.035)).toBeCloseTo(0.026, 12);
  });
});

describe('Yagi: calc', { timeout: 60_000 }, () => {
  it('comprimentos em metros = λ × (comprimento em λ + correção do boom)', () => {
    const p = { ...defaultParams, frequencyMHz: 145, elementDiameter: 0.006, boomDiameter: 0.02 };
    const r = calc(p);
    const lambda = wavelength(145);
    const extra = boomCorrection(0.02 / lambda);
    const expected = directorLengths(design(0.8), 0.006 / lambda).map((l) => (l + extra) * lambda);
    expected.forEach((m, i) => {
      expect(r.measurements.find((x) => x.label === `D${i + 1}`)!.meters).toBeCloseTo(m, 12);
    });
    expect(r.measurements.find((x) => x.label === 'S')!.meters).toBeCloseTo(0.2 * lambda, 12);
    expect(r.measurements.find((x) => x.label === 'L')!.meters).toBeCloseTo(0.8 * lambda, 12);
  });

  it('boom isolante (0) não soma correção', () => {
    const lambda = wavelength(145);
    const r = calc({ ...defaultParams, boomDiameter: 0 });
    const expected = reflectorLength(design(0.8), 0.006 / lambda) * lambda;
    expect(r.measurements.find((x) => x.label === 'R')!.meters).toBeCloseTo(expected, 12);
  });

  it('ganho em dBi = dBd da tabela + 2,16', () => {
    expect(calc(defaultParams).expected.gain.typical).toBeCloseTo(9.2 + 2.16, 12);
    expect(calc({ ...defaultParams, method: 1, elementCount: 15 }).expected.gain.typical).toBeCloseTo(14.2 + 2.16, 12);
  });

  it('número de elementos e posições', () => {
    for (const d of NBS_DESIGNS) {
      const r = calc({ ...defaultParams, method: 1, elementCount: d.directorCount + 2 });
      expect(r.measurements.filter((m) => /^D\d+$/.test(m.label))).toHaveLength(d.directorCount);
      const pos = elementPositionsLambda(d.directorCount, d.spacing);
      expect(pos).toHaveLength(d.directorCount + 2);
      expect(pos[pos.length - 1]!).toBeCloseTo(d.lengthLambda, 1);
    }
  });

  it('o refletor é o maior elemento parasita e os diretores são mais curtos que o excitado', () => {
    const r = calc(defaultParams);
    const m = (l: string) => r.measurements.find((x) => x.label === l)!.meters;
    expect(m('R')).toBeGreaterThan(m('DE'));
    for (const l of ['D1', 'D2', 'D3']) expect(m(l)).toBeLessThan(m('DE'));
  });

  it('aceita só os números de elementos dos projetos do NBS (3, 5, 6, 12, 15, 17)', () => {
    expect(AVAILABLE_ELEMENT_COUNTS).toEqual([3, 5, 6, 12, 15, 17]);
    for (const n of [2, 4, 7, 16, 5.5]) {
      expect(() => findDesign(n)).toThrow(RangeError);
      expect(() => calc({ ...defaultParams, method: 1, elementCount: n })).toThrow(RangeError);
    }
  });

  it('o boom calculado é (0,2 + diretores × S)·λ da Tabela 1', () => {
    const lambda = wavelength(145);
    for (const d of NBS_DESIGNS) {
      const r = calc({ ...defaultParams, method: 1, elementCount: d.directorCount + 2 });
      const boom = r.measurements.find((m) => m.label === 'L')!.meters;
      expect(boom).toBeCloseTo((0.2 + d.directorCount * d.spacing) * lambda, 9);
      // O NBS dá o comprimento total do projeto (0,4λ ... 4,2λ); aceita ±0,05λ (arredondamento da tabela).
      expect(Math.abs(boom / lambda - d.lengthLambda)).toBeLessThan(0.1);
    }
  });

  it('avisa sobre o Yagi de 0,4λ (inconsistência da fonte) e sobre d/λ fora do gráfico', () => {
    expect(calc({ ...defaultParams, elementCount: 3 }).warnings.some((w) => w.message.includes('0,424'))).toBe(true);
    expect(calc({ ...defaultParams, elementDiameter: 0.0001 }).warnings.some((w) => w.message.includes('fora da faixa dos gráficos'))).toBe(true);
    expect(calc(defaultParams).warnings.some((w) => w.message.includes('fora da faixa dos gráficos'))).toBe(false);
  });

  it('entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, elementDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, boomDiameter: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, elementDiameter: 0 })).toThrow(RangeError);
  });

  it('banda de ROE < 2:1 pelo Q do modelo: estreita no Yagi curto, mais larga no longo; o boom não muda a banda', () => {
    // Valores do modelo (band-model.test.ts confere o Q contra a varredura): 5 elementos em 145 MHz ≈ 2,5 MHz (1,7 %).
    const short = calc(defaultParams).expected.bandwidth!;
    expect(short.unit).toBe('MHz');
    expect(short.typical!).toBeGreaterThan(2);
    expect(short.typical!).toBeLessThan(3);
    expect(short.note).toMatch(/casamento ideal/);
    expect(short.source).toMatch(/Yaghjian/);
    const long = calc({ ...defaultParams, elementCount: 11 }).expected.bandwidth!;
    expect(long.typical!).toBeGreaterThan(short.typical!);
    expect(long.note).toMatch(/conservadora/);
    expect(calc({ ...defaultParams, boomDiameter: 0 }).expected.bandwidth!.typical).toBeCloseTo(short.typical!, 9);
  });
});

describe('Yagi: lista de corte', { timeout: 60_000 }, () => {
  it('refletor, diretores e excitado; só o excitado é ajustável', () => {
    const items = cutList({ ...defaultParams, drivenGap: 0 });
    expect(items.map((i) => i.label)).toEqual(['R', 'D1', 'D2', 'D3', 'DE']);
    expect(items.filter((i) => i.adjustable).map((i) => i.label)).toEqual(['DE']);
  });
});

describe('Yagi: método DL6WU (qualquer número de elementos)', { timeout: 60_000 }, () => {
  const lambda = wavelength(432);
  const base = { ...defaultParams, frequencyMHz: 432, method: 2, elementDiameter: 0.006, boomDiameter: 0 };
  const m = (r: ReturnType<typeof calc>, label: string) => r.measurements.find((x) => x.label === label)!.meters;

  it('aceita qualquer número de elementos de 3 a 40 (limite da ferramenta) e rejeita o resto', () => {
    for (const n of [3, 4, 7, 11, 13, 19, 40]) {
      expect(() => calc({ ...base, elementCount: n })).not.toThrow();
    }
    for (const n of [2, 41, 60, 102, 8.5]) expect(() => calc({ ...base, elementCount: n })).toThrow(RangeError);
  });

  it('o boom é a soma dos espaçamentos da tabela do DL6WU (0,2λ + Σ S)', () => {
    // 11 elementos = 9 diretores: 0,2 + 0,075 + 0,18 + 0,215 + 0,25 + 0,28 + 0,3 + 0,315 + 0,33 + 0,345 = 2,49λ
    expect(m(calc({ ...base, elementCount: 11 }), 'L') / lambda).toBeCloseTo(2.49, 9);
    // 16 elementos = 14 diretores: 4,415λ; cada diretor extra soma 0,4λ
    expect(m(calc({ ...base, elementCount: 16 }), 'L') / lambda).toBeCloseTo(4.415, 9);
    expect(m(calc({ ...base, elementCount: 18 }), 'L') / lambda).toBeCloseTo(4.415 + 0.8, 9);
  });

  it('posições P1…Pn crescem e a última é o boom', () => {
    const r = calc({ ...base, elementCount: 12 });
    const p = r.measurements.filter((x) => /^P[0-9]+$/.test(x.label));
    expect(p).toHaveLength(10);
    p.forEach((x, i) => i > 0 && expect(x.meters).toBeGreaterThan(p[i - 1]!.meters));
    expect(p[9]!.meters).toBe(m(r, 'L'));
    expect(m(r, 'E')).toBeCloseTo(0.2 * lambda, 12);
  });

  it('comprimentos em metros = λ × (equação do DL6WU + correção do boom)', () => {
    const d = 0.006 / lambda;
    const r = calc({ ...base, elementCount: 11, boomDiameter: 0.02 });
    const extra = dl6wuBoomCorrection(0.02 / lambda);
    dl6wuDirectorLengths(9, d).forEach((l, i) => expect(m(r, `D${i + 1}`)).toBeCloseTo((l + extra) * lambda, 12));
    expect(m(r, 'R')).toBeCloseTo((dl6wuReflectorLength(d) + extra) * lambda, 12);
    expect(m(r, 'DE')).toBeCloseTo(0.5 * dipoleShorteningFactor(d) * lambda, 12);
  });

  it('o ganho estimado cresce com o boom, só dentro da faixa 2,2–39λ', () => {
    const g = (n: number) => calc({ ...base, elementCount: n }).expected.gain;
    expect(g(11).typical).toBeCloseTo(9.2 + 3.39 * Math.log(2.49) + 2.15, 9);
    expect(g(20).typical!).toBeGreaterThan(g(11).typical!);
    // 10 elementos: boom de 2,145λ, abaixo de 2,2λ: sem ganho e com aviso
    expect(g(10).typical).toBeUndefined();
    expect(calc({ ...base, elementCount: 10 }).warnings.some((w) => w.message.includes('fora da faixa do método DL6WU'))).toBe(true);
    expect(calc({ ...base, elementCount: 11 }).warnings.some((w) => w.message.includes('fora da faixa do método DL6WU'))).toBe(false);
  });

  it('método automático: NBS para 3, 5 e 6 elementos; DL6WU para o resto (4, 7 a 40)', () => {
    for (const n of [3, 5, 6]) expect(chooseMethod(n)).toBe(1);
    for (const n of [4, 7, 8, 9, 10, 11, 12, 15, 17, 40]) expect(chooseMethod(n)).toBe(2);
    // O resultado automático é o do método escolhido, com o aviso de qual foi usado.
    for (const n of [3, 5, 6, 4, 9, 12, 17]) {
      const auto = calc({ ...defaultParams, elementCount: n });
      const manual = calc({ ...defaultParams, method: chooseMethod(n), elementCount: n });
      expect(auto.measurements).toEqual(manual.measurements);
      expect(auto.warnings.slice(1)).toEqual(manual.warnings);
      expect(auto.warnings[0]!.message).toContain(chooseMethod(n) === 1 ? 'NBS' : 'DL6WU');
    }
    // Sem o método explícito, qualquer inteiro de 3 a 40 calcula.
    for (const n of [3, 4, 5, 6, 7, 10, 11, 14, 15, 17, 30, 40]) expect(() => calc({ ...defaultParams, elementCount: n })).not.toThrow();
  });

  it('método NBS continua recusando quantidades sem projeto, e o método é validado', () => {
    expect(() => calc({ ...defaultParams, method: 1, elementCount: 11 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, method: 3 })).toThrow(RangeError);
    expect(() => calc({ ...base, elementDiameter: 0.0001, elementCount: 11 })).toThrow(RangeError); // d/λ < 0,001
  });

  it('lista de corte e diagrama funcionam com o DL6WU', () => {
    const items = cutList({ ...base, elementCount: 11, drivenGap: 0 });
    expect(items.map((i) => i.label)).toEqual(['R', ...Array.from({ length: 9 }, (_, i) => `D${i + 1}`), 'DE']);
  });
});

describe('Yagi: espaço central do excitado (dentro do comprimento DE)', { timeout: 60_000 }, () => {
  const get = (r: ReturnType<typeof calc>, label: string) => r.measurements.find((x) => x.label === label)?.meters;

  for (const elementCount of [5, 7, 20]) {
    it(`${elementCount} elementos: DE não muda, DB = (DE − DG)/2 e só o excitado é afetado`, () => {
      const base = calc({ ...defaultParams, elementCount, drivenGap: 0 });
      const r = calc({ ...defaultParams, elementCount, drivenGap: 0.01 });
      expect(get(r, 'DE')).toBeCloseTo(get(base, 'DE')!, 12);
      expect(get(r, 'DG')).toBeCloseTo(0.01, 12);
      expect(get(r, 'DB')).toBeCloseTo((get(base, 'DE')! - 0.01) / 2, 12);
      for (const label of ['R', 'D1', 'L']) expect(get(r, label)).toBeCloseTo(get(base, label)!, 12);
      expect(get(base, 'DB')).toBeUndefined();
      expect(get(base, 'DG')).toBeUndefined();
    });
  }

  it('a folha de corte troca o excitado por dois braços DB', () => {
    expect(defaultParams.drivenGap).toBe(0.01);
    const sem = cutList({ ...defaultParams, drivenGap: 0 });
    expect(sem.find((c) => c.label === 'DE')).toBeDefined();
    const com = cutList({ ...defaultParams, drivenGap: 0.01 });
    expect(com.find((c) => c.label === 'DE')).toBeUndefined();
    const arm = com.find((c) => c.label === 'DB')!;
    expect(arm.quantity).toBe(2);
    expect(arm.meters).toBeCloseTo((get(calc({ ...defaultParams, drivenGap: 0 }), 'DE')! - 0.01) / 2, 12);
  });

  it('rejeita espaço negativo ou maior que o excitado', () => {
    expect(() => calc({ ...defaultParams, drivenGap: -0.001 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, drivenGap: 5 })).toThrow(RangeError);
  });
});
