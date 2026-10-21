import { describe, expect, it } from 'vitest';
import { findCable } from '../../data/coax-cables';
import { attenuationDbPer100m } from '../../lines/coax';
import { type BazookaModelInput, bandWidthMHz, bazookaModel } from './feed-model';

// Referências (todas sobre a double bazooka "comum", tocos em série):
// - ARRL Antenna Book, 20ª ed. (2003), p. 9.6–9.7, citado por C. Turner, ZS6GM ("The Great Double Bazooka Antenna Debate"):
//   faixa de ROE < 2:1 só 1,14 vez a de um dipolo simples com o mesmo cabo, e nenhuma melhora de ganho ou de padrão.
//   O livro não foi lido: o caso (banda, cabo, altura) por trás do 1,14 não é conhecido. TODO(fonte).
// - A. Ducros, F5AD (citado pelo mesmo artigo): ≈ 7,5 % a mais de banda de 2:1 e perda extra de 0,1 a 0,5 dB, quase toda nos tocos.
// - W. Maxwell, W2DU (citado pelo mesmo artigo): o ganho de banda vem das perdas dos tocos. Cap. 18 de Reflections II, não lido.
// O modelo desta ferramenta não é uma medida: os testes conferem que ele cai na faixa dessas fontes.

function input(cableId: string, fMHz: number, extra: Partial<BazookaModelInput> = {}): BazookaModelInput {
  const c = findCable(cableId)!;
  return {
    frequencyMHz: fMHz,
    radiusM: c.outerDiameterMm / 2000,
    referenceOhms: 50,
    cable: {
      z0: c.impedanceOhms,
      velocityFactor: c.velocityFactor,
      attenuationDbPerM: (f) => {
        const a = attenuationDbPer100m(c, f);
        return a === null ? null : a / 100;
      },
    },
    ...extra,
  };
}

const ratio = (m: ReturnType<typeof bazookaModel>) => bandWidthMHz(m.band2.bazooka!) / bandWidthMHz(m.band2.dipole!);

describe('double bazooka: modelo de alimentação', () => {
  it('o dipolo do modelo ressoa na frequência de projeto, com R ≈ 72 Ω (dipolo fino, Balanis §4.6) e comprimento ≈ 0,48λ', () => {
    const m = bazookaModel(input('belden-8259', 7.1));
    expect(Math.abs(m.zDipole.im)).toBeLessThan(0.5);
    expect(m.zDipole.re).toBeGreaterThan(68);
    expect(m.zDipole.re).toBeLessThan(76);
    expect(m.resonantLengthLambda).toBeGreaterThan(0.47);
    expect(m.resonantLengthLambda).toBeLessThan(0.49);
  });

  it('na ressonância os tocos de λ/4 são quase circuito aberto: Z da bazooka fica a poucos % da do dipolo', () => {
    const m = bazookaModel(input('belden-8259', 7.1));
    expect(Math.abs(m.zBazooka.im)).toBeLessThan(0.5);
    expect(m.zBazooka.re / m.zDipole.re).toBeGreaterThan(0.95);
    expect(m.zBazooka.re).toBeLessThan(m.zDipole.re);
  });

  it('banda de 2:1 entre 1,0 e 1,15 vez a do dipolo comum (ARRL: 1,14; F5AD: ≈ 1,075), em HF e VHF', () => {
    for (const [id, f] of [
      ['belden-8259', 3.65],
      ['belden-8259', 7.1],
      ['belden-9258', 27.2],
      ['belden-8267', 145],
    ] as const) {
      const r = ratio(bazookaModel(input(id, f)));
      expect(r).toBeGreaterThan(1);
      expect(r).toBeLessThan(1.15);
    }
  });

  it('perda nos tocos com RG-58 em 80 e 40 m na faixa de 0,1 a 0,5 dB (F5AD)', () => {
    for (const f of [3.65, 7.1]) {
      const m = bazookaModel(input('belden-8259', f));
      expect(m.stubLossDb).toBeGreaterThanOrEqual(0.1 * 0.95);
      expect(m.stubLossMaxDb).toBeLessThan(0.5);
      expect(m.stubLossMaxDb).toBeGreaterThanOrEqual(m.stubLossDb);
    }
  });

  it('cabo de menos perda (RG-213) perde menos nos tocos e alarga menos a banda: parte do alargamento é perda (W2DU)', () => {
    const rg58 = bazookaModel(input('belden-8259', 7.1));
    const rg213 = bazookaModel(input('belden-8267', 7.1));
    expect(rg213.stubLossDb).toBeLessThan(rg58.stubLossDb);
    const lossless = bazookaModel({ ...input('belden-8259', 7.1), cable: { ...input('belden-8259', 7.1).cable, attenuationDbPerM: () => 0 } });
    expect(lossless.stubLossDb).toBeCloseTo(0, 6);
    expect(ratio(lossless)).toBeGreaterThan(1);
    expect(ratio(lossless)).toBeLessThan(ratio(rg58));
  });

  it('convergência: 30 trechos e 60 trechos dão bandas a menos de 1 % uma da outra', () => {
    const a = bazookaModel(input('belden-8259', 7.1));
    const b = bazookaModel(input('belden-8259', 7.1, { segments: 60 }));
    expect(Math.abs(bandWidthMHz(a.band2.bazooka!) / bandWidthMHz(b.band2.bazooka!) - 1)).toBeLessThan(0.01);
    expect(Math.abs(bandWidthMHz(a.band2.dipole!) / bandWidthMHz(b.band2.dipole!) - 1)).toBeLessThan(0.01);
  });

  it('a faixa de 2:1 contém a de 1,5:1 e a frequência de projeto; varredura com ROE ≥ 1', () => {
    const m = bazookaModel(input('belden-8259', 7.1));
    const b2 = m.band2.bazooka!;
    const b15 = m.band15.bazooka!;
    expect(b2.open).toBe(false);
    expect(b2.lowMHz).toBeLessThan(b15.lowMHz);
    expect(b2.highMHz).toBeGreaterThan(b15.highMHz);
    expect(b15.lowMHz).toBeLessThan(7.1);
    expect(b15.highMHz).toBeGreaterThan(7.1);
    for (const p of m.sweep) {
      expect(p.swrBazooka).toBeGreaterThanOrEqual(1);
      expect(p.swrDipole).toBeGreaterThanOrEqual(1);
    }
  });

  it('sem tabela de atenuação na frequência, trata o toco sem perdas e avisa (lossKnown = false)', () => {
    const m = bazookaModel({ ...input('belden-8259', 7.1), cable: { ...input('belden-8259', 7.1).cable, attenuationDbPerM: () => null } });
    expect(m.lossKnown).toBe(false);
    expect(m.stubLossDb).toBeCloseTo(0, 6);
  });
});
