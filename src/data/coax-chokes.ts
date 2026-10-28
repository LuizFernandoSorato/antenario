/**
 * Chokes de corrente (baluns 1:1) feitos enrolando o próprio cabo coaxial, e receitas de chokes de ferrite.
 *
 * Fonte: ARRL Antenna Book, 19ª ed., cap. 26 ("Coupling the Line to the Antenna"), p. 26-21 e 26-22:
 * - Tabela 3, "Effective Choke (Current) Baluns": comprimento de cabo e número de espiras, enrolado "como um rolo de corda" e
 *   preso com fita isolante, perto da antena. As bobinas "were designed to have a high impedance at the indicated frequencies,
 *   as measured with an impedance meter"; "Lengths are not highly critical". Valores copiados como publicados, em pés; a
 *   conversão para metros é feita em código (1 pé = 0,3048 m).
 * - Texto: "This construction technique is not effective with twin lead"; nos modelos do mesmo capítulo, uma reatância de modo
 *   comum de +j1000 Ω no ponto de alimentação eliminou a corrente no cabo.
 * - Ferrite (só receitas, sem modelo de impedância): balun W2DU e toroide 1:1 para todo o HF (ver `FERRITE_RECIPES`).
 *
 * Não há modelo da impedância dessas bobinas aqui: a tabela é medida, e fora das frequências dela não se interpola.
 */

/** Cabo da coluna "uma banda" da Tabela 3. */
export type ChokeCableFamily = 'rg213' | 'rg58';

export interface SingleBandChoke {
  /** Frequência da tabela (MHz). */
  fMHz: number;
  /** Comprimento de cabo, em pés, como publicado. */
  lengthFt: number;
  /** Número de espiras: mínimo e máximo (iguais quando a tabela dá um só valor). */
  turns: readonly [number, number];
}

export const CHOKE_SOURCE = 'ARRL Antenna Book, 19ª ed., p. 26-21, Tabela 3 ("Effective Choke (Current) Baluns")';

/** Coluna "Single Band (very effective)" da Tabela 3. */
export const SINGLE_BAND_CHOKES: Readonly<Record<ChokeCableFamily, readonly SingleBandChoke[]>> = {
  rg213: [
    { fMHz: 3.5, lengthFt: 22, turns: [8, 8] },
    { fMHz: 7, lengthFt: 22, turns: [10, 10] },
    { fMHz: 10, lengthFt: 12, turns: [10, 10] },
    { fMHz: 14, lengthFt: 10, turns: [4, 4] },
    { fMHz: 21, lengthFt: 8, turns: [6, 8] },
    { fMHz: 28, lengthFt: 6, turns: [6, 8] },
  ],
  rg58: [
    { fMHz: 3.5, lengthFt: 20, turns: [6, 8] },
    { fMHz: 7, lengthFt: 15, turns: [6, 6] },
    { fMHz: 10, lengthFt: 10, turns: [7, 7] },
    { fMHz: 14, lengthFt: 8, turns: [8, 8] },
    { fMHz: 21, lengthFt: 6, turns: [8, 8] },
    { fMHz: 28, lengthFt: 4, turns: [6, 8] },
  ],
};

export const CHOKE_CABLE_LABELS: Readonly<Record<ChokeCableFamily, string>> = {
  rg213: 'RG-213 ou RG-8',
  rg58: 'RG-58',
};

export interface MultiBandChoke {
  lowMHz: number;
  highMHz: number;
  lengthFt: number;
  turns: readonly [number, number];
}

/** Coluna "Multiple Band" da Tabela 3, para RG-8, 58, 59, 8X e 213. */
export const MULTI_BAND_CHOKES: readonly MultiBandChoke[] = [
  { lowMHz: 3.5, highMHz: 30, lengthFt: 10, turns: [7, 7] },
  { lowMHz: 3.5, highMHz: 10, lengthFt: 18, turns: [9, 10] },
  { lowMHz: 14, highMHz: 30, lengthFt: 8, turns: [6, 7] },
];

export interface FerriteRecipe {
  name: string;
  recipe: string;
  range: string;
}

/** Receitas de ferrite do mesmo capítulo (p. 26-22), sem cálculo. */
export const FERRITE_RECIPES: readonly FerriteRecipe[] = [
  {
    name: 'Balun W2DU (contas de ferrite)',
    recipe: '50 contas Amidon FB-73-2401 sobre 30 cm de RG-58A (ocupam 24 cm); com RG-8 ou RG-213, 12 contas FB-77-1024',
    range: 'Material 73 (ou 77) de 1,8 a 30 MHz; material 43 de 30 a 250 MHz',
  },
  {
    name: 'Toroide 1:1',
    recipe: '12 espiras de fio #10 em núcleo de 2,4" (Amidon FT240-43, µ = 850)',
    range: 'Todo o HF; funciona melhor com antenas de menos de ≈ 100 Ω',
  },
];

const FOOT_M = 0.3048;

export function feetToMeters(ft: number): number {
  return ft * FOOT_M;
}

/** Diâmetro médio da bobina (m) que resulta de enrolar `lengthM` de cabo em `turns` espiras: L / (π·N). */
export function coilDiameterM(lengthM: number, turns: number): number {
  return lengthM / (Math.PI * turns);
}

/** Linha da tabela de uma banda; `undefined` se a frequência não está na Tabela 3 (não se interpola). */
export function singleBandChoke(family: ChokeCableFamily, fMHz: number): SingleBandChoke | undefined {
  return SINGLE_BAND_CHOKES[family].find((c) => c.fMHz === fMHz);
}
