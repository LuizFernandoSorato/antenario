import { describe, expect, it } from 'vitest';
import {
  MESH_OPENING_LAMBDA,
  REFLECTOR_MIN_SIDE_LAMBDA,
  REFLECTOR_SIDE_LAMBDA,
  REFLECTOR_STUDY,
  studyReflector,
  studyTubeReflector,
  TUBE_LENGTH_LAMBDA,
  TUBE_STUDY,
} from './reflector-model';

// O estudo é um modelo por momentos, sem comparação com medida: o teste garante que a tabela guardada no código
// é a que o solver produz (tolerância 0,3 dB no ganho e 1,5 dB na F/B) e que o resultado converge com a malha.

describe('turnstile: estudo do refletor (momentos)', () => {
  it('a tabela guardada confere com o solver (0,5λ, 0,75λ e 1λ)', () => {
    for (const row of REFLECTOR_STUDY.filter((r) => r.sideLambda <= 1)) {
      const s = studyReflector(row.sideLambda);
      expect(Math.abs(s.directivityDbi - row.directivityDbi)).toBeLessThan(0.3);
      expect(Math.abs(s.frontToBackDb - row.frontToBackDb)).toBeLessThan(1.5);
      expect(Math.abs(s.at30DegDb - row.at30DegDb)).toBeLessThan(0.5);
    }
  }, 60000);

  it('o lado recomendado (1λ) tem F/B ≥ 15 dB e o mínimo (0,75λ) também; 0,5λ não', () => {
    const f = (side: number) => REFLECTOR_STUDY.find((r) => r.sideLambda === side)!;
    expect(f(REFLECTOR_SIDE_LAMBDA).frontToBackDb).toBeGreaterThanOrEqual(15);
    expect(f(REFLECTOR_MIN_SIDE_LAMBDA).frontToBackDb).toBeGreaterThanOrEqual(15);
    expect(f(0.5).frontToBackDb).toBeLessThan(10);
  });

  it('converge com a malha: 0,0333λ dá a mesma diretividade (≤ 0,3 dB) que o espaçamento usado', () => {
    const a = studyReflector(1, 137.5, MESH_OPENING_LAMBDA);
    const b = studyReflector(1, 137.5, 1 / 30);
    expect(Math.abs(a.directivityDbi - b.directivityDbi)).toBeLessThan(0.3);
    expect(Math.abs(a.frontToBackDb - b.frontToBackDb)).toBeLessThan(3);
  }, 60000);

  it('o resultado independe da frequência (a geometria escala com λ)', () => {
    const a = studyReflector(0.75, 137.5);
    const b = studyReflector(0.75, 437);
    expect(Math.abs(a.directivityDbi - b.directivityDbi)).toBeLessThan(0.1);
    expect(Math.abs(a.frontToBackDb - b.frontToBackDb)).toBeLessThan(0.5);
  }, 60000);
});

describe('turnstile: refletor de um tubo por dipolo (momentos)', () => {
  it('a tabela dos tubos confere com o solver e o melhor comprimento é 0,5λ', () => {
    for (const row of TUBE_STUDY) {
      const s = studyTubeReflector(row.sideLambda, 1, 0);
      expect(Math.abs(s.directivityDbi - row.directivityDbi)).toBeLessThan(0.3);
      expect(Math.abs(s.frontToBackDb - row.frontToBackDb)).toBeLessThan(1.5);
    }
    const best = TUBE_STUDY.reduce((a, b) => (b.frontToBackDb > a.frontToBackDb ? b : a));
    expect(best.sideLambda).toBe(TUBE_LENGTH_LAMBDA);
  }, 60000);

  it('com tubo curto (0,45λ) ele deixa de refletir (F/B ≈ 0) e a tela é bem melhor que o tubo', () => {
    const short = TUBE_STUDY.find((r) => r.sideLambda === 0.45)!;
    expect(short.frontToBackDb).toBeLessThan(2);
    const plate = REFLECTOR_STUDY.find((r) => r.sideLambda === 1)!;
    const tube = TUBE_STUDY.find((r) => r.sideLambda === TUBE_LENGTH_LAMBDA)!;
    expect(plate.frontToBackDb - tube.frontToBackDb).toBeGreaterThan(5);
    expect(plate.directivityDbi - tube.directivityDbi).toBeGreaterThan(1.5);
  });
});
