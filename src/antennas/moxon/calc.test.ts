import { describe, expect, it } from 'vitest';
import { cutList } from './cutlist';
import { calc, defaultParams } from './calc';
import { meta } from './meta';

// Referências:
// - Equações do Cebik (moxon-model.ts), com as dimensões em λ multiplicadas por λ = 299,792458/f.
// - Exemplo de 146 MHz com vareta de 1/8" (Cebik, "Designing Moxon Rectangles by Equation and by Model"): conferimos as cotas
//   contra o programa em BASIC do próprio artigo, que usa λ = 11802,71/f polegadas (a mesma constante em outra unidade).
// - Folga crítica: no 2 m a variação da folga tem de ficar abaixo de 1/4" (Cebik, "Building a 2-Meter Moxon"), ≈ 0,0031 λ.
// Tolerância: 1e-9 m nas contas exatas.

function measure(result: ReturnType<typeof calc>, label: string): number {
  const m = result.measurements.find((x) => x.label === label);
  if (!m) throw new Error(`Cota ${label} não encontrada`);
  return m.meters;
}

const INCH = 0.0254;

// Cada combinação de parâmetros roda o modelo por momentos (~1 s): limite maior que o padrão.
describe('Moxon: calc', { timeout: 60_000 }, () => {
  it('146 MHz, vareta de 1/8": cotas iguais às do programa do Cebik', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 146, conductorDiameter: 0.125 * INCH });
    const wli = 11802.71 / 146; // λ em polegadas, como no programa
    const d1 = Math.log10(0.125 / wli);
    const a = -0.0008571428571 * d1 ** 2 - 0.009571428571 * d1 + 0.3398571429;
    const c = 0.001809523381 * d1 ** 2 + 0.01780952381 * d1 + 0.05164285714;
    // O programa usa 11802,71 pol·MHz; o valor exato é 299,792458 m / 0,0254 = 11802,853: diferença relativa de 1,2e-5.
    expect(Math.abs(measure(r, 'A') - a * wli * INCH) / measure(r, 'A')).toBeLessThan(5e-5);
    expect(Math.abs(measure(r, 'C') - c * wli * INCH) / measure(r, 'C')).toBeLessThan(5e-5);
  });

  it('E = B + C + D; fios esticados: metade do excitado F = (A + 2B)/2 e refletor G = A + 2D', () => {
    const r = calc({ ...defaultParams, centerGap: 0 });
    expect(measure(r, 'E')).toBeCloseTo(measure(r, 'B') + measure(r, 'C') + measure(r, 'D'), 9);
    expect(measure(r, 'F')).toBeCloseTo((measure(r, 'A') + 2 * measure(r, 'B')) / 2, 9);
    expect(measure(r, 'G')).toBeCloseTo(measure(r, 'A') + 2 * measure(r, 'D'), 9);
  });

  it('espaço central do excitado: cota H, descontada das metades F', () => {
    const r = calc({ ...defaultParams, centerGap: 0.01 });
    expect(measure(r, 'H')).toBeCloseTo(0.01, 12);
    const half = cutList({ ...defaultParams, centerGap: 0.01 }).find((i) => i.label === 'F')!;
    expect(half.quantity).toBe(2);
    expect(half.meters).toBeCloseTo((measure(r, 'A') + 2 * measure(r, 'B') - 0.01) / 2, 9);
    expect(defaultParams.centerGap).toBe(0.01);
    expect(calc({ ...defaultParams, centerGap: 0 }).measurements.some((m) => m.label === 'H')).toBe(false);
  });

  it('valores esperados do modelo: ≈ 50 Ω, ≈ 6 dBi e banda de 2:1 em MHz no 2 m', () => {
    const r = calc(defaultParams);
    expect(r.expected.impedance.typical).toBeGreaterThan(45);
    expect(r.expected.impedance.typical).toBeLessThan(58);
    expect(r.expected.gain.typical).toBeGreaterThan(5.8);
    expect(r.expected.gain.typical).toBeLessThan(6.2);
    expect(r.expected.bandwidth!.unit).toBe('MHz');
    expect(r.expected.bandwidth!.typical).toBeGreaterThan(4);
  });

  it('avisos: folga crítica com a tolerância em mm, tensão nas pontas, choke; fora das equações', () => {
    const r = calc({ ...defaultParams, frequencyMHz: 146 });
    const gap = r.warnings.find((w) => /folga/.test(w.message) && /crítica/.test(w.message))!;
    expect(gap).toBeDefined();
    // 1/4" a 146 MHz escala para 0,0031 λ: no próprio 2 m, ≈ 6 mm.
    expect(gap.message).toContain('6 mm');
    expect(r.warnings.some((w) => w.level === 'danger' && /tensão/.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /choke/.test(w.message))).toBe(true);
    expect(r.warnings.some((w) => /equações/.test(w.message) && /1e-5|10⁻⁵/.test(w.message))).toBe(false);
    // Fio de 0,5 mm em 7 MHz: 1,2e-5 λ (dentro); tubo de 30 mm em 145 MHz: 1,45e-2 λ (fora).
    const fat = calc({ ...defaultParams, conductorDiameter: 0.03 });
    expect(fat.warnings.some((w) => /equações/.test(w.message))).toBe(true);
  });

  it('avisa quando fora da faixa de uso prático', () => {
    const r = calc({ ...defaultParams, frequencyMHz: meta.typicalRangeMHz.max * 2 });
    expect(r.warnings.some((w) => /fora da faixa/.test(w.message))).toBe(true);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => calc({ ...defaultParams, frequencyMHz: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, conductorDiameter: 0 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: -1 })).toThrow(RangeError);
    expect(() => calc({ ...defaultParams, centerGap: 1 })).toThrow(RangeError);
  });
});

describe('Moxon: folha de corte', { timeout: 60_000 }, () => {
  it('excitado em duas metades e refletor inteiro, na medida', () => {
    const items = cutList(defaultParams);
    const r = calc(defaultParams);
    expect(items.find((i) => i.label === 'F')!.meters).toBeCloseTo(measure(r, 'F'), 9);
    expect(items.find((i) => i.label === 'G')!.meters).toBeCloseTo(measure(r, 'G'), 9);
    expect(items.every((i) => !i.adjustable)).toBe(true);
  });
});
