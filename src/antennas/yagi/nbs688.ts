/**
 * Dados e método do NBS Technical Note 688 (P. P. Viezbicke, "Yagi Antenna Design",
 * dezembro de 1976, https://doi.org/10.6028/NBS.TN.688).
 *
 * O método é gráfico: a Tabela 1 dá os comprimentos otimizados dos elementos parasitas para
 * elementos de d/λ = 0,0085; a Fig. 9 dá como esses comprimentos mudam com d/λ; a Fig. 10 dá o
 * acréscimo para compensar o boom condutor. Aqui as figuras foram DIGITALIZADAS da cópia
 * escaneada do relatório, então carregam incerteza de leitura (≈ 0,002λ), menor que a
 * tolerância de corte de 0,003λ que o próprio relatório pede. Os dois exemplos resolvidos do
 * relatório (seção 4) são usados nos testes como validação.
 */

/** Um projeto da Tabela 1 do NBS TN 688 (medido a 400 MHz, d/λ = 0,0085, refletor a 0,2λ). */
export interface NbsDesign {
  /** Comprimento total do Yagi, em λ (refletor ao último diretor). */
  lengthLambda: number;
  directorCount: number;
  /** Comprimento do refletor, em λ. */
  reflector: number;
  /** Comprimento de cada diretor, em λ, do 1º ao último. */
  directors: readonly number[];
  /** Espaçamento entre diretores (e do excitado ao 1º diretor), em λ. */
  spacing: number;
  /** Ganho medido em relação a um dipolo de meia onda, em dB. */
  gainDbd: number;
  /** Curva da Fig. 9 correspondente. */
  curve: 'A' | 'B' | 'C' | 'D';
  note?: string;
}

/**
 * Tabela 1 do NBS TN 688, transcrita da página 7 do relatório.
 *
 * Atenção ao Yagi de 0,4λ: a Tabela 1 traz 0,424λ para o diretor, o mesmo valor do Yagi de
 * 4,2λ, mas a curva A da Fig. 9 dá ≈ 0,443λ em d/λ = 0,0085. Os dois não concordam;
 * usamos o valor da curva A (mais plausível para um único diretor) e avisamos o usuário.
 * TODO(fonte): conferir esse valor numa segunda referência.
 */
export const NBS_DESIGNS: readonly NbsDesign[] = [
  {
    lengthLambda: 0.4,
    directorCount: 1,
    reflector: 0.482,
    directors: [0.4431],
    spacing: 0.2,
    gainDbd: 7.1,
    curve: 'A',
    note:
      'A Tabela 1 do NBS traz 0,424λ para o diretor deste projeto, mas a curva A da Fig. 9 dá 0,443λ. ' +
      'Usamos o valor da curva. TODO(fonte): conferir numa segunda referência.',
  },
  { lengthLambda: 0.8, directorCount: 3, reflector: 0.482, directors: [0.428, 0.424, 0.428], spacing: 0.2, gainDbd: 9.2, curve: 'C' },
  { lengthLambda: 1.2, directorCount: 4, reflector: 0.482, directors: [0.428, 0.42, 0.42, 0.428], spacing: 0.25, gainDbd: 10.2, curve: 'C' },
  {
    lengthLambda: 2.2,
    directorCount: 10,
    reflector: 0.482,
    directors: [0.432, 0.415, 0.407, 0.398, 0.39, 0.39, 0.39, 0.39, 0.398, 0.407],
    spacing: 0.2,
    gainDbd: 12.25,
    curve: 'B',
  },
  {
    lengthLambda: 3.2,
    directorCount: 15,
    reflector: 0.482,
    directors: [0.428, 0.42, 0.407, 0.398, 0.394, 0.39, 0.386, 0.386, 0.386, 0.386, 0.386, 0.386, 0.386, 0.386, 0.386],
    spacing: 0.2,
    gainDbd: 13.4,
    curve: 'C',
  },
  {
    lengthLambda: 4.2,
    directorCount: 13,
    reflector: 0.475,
    directors: [0.424, 0.424, 0.42, 0.407, 0.403, 0.398, 0.394, 0.39, 0.39, 0.39, 0.39, 0.39, 0.39],
    spacing: 0.308,
    gainDbd: 14.2,
    curve: 'D',
  },
];

/** d/λ dos elementos da Tabela 1 (diâmetro de 0,63 cm a 400 MHz, p. 2 do relatório). */
export const NBS_TABLE_D_OVER_LAMBDA = 0.0085;
/** Distância do refletor ao elemento excitado, em λ (Tabela 1 e Fig. 1). */
export const NBS_REFLECTOR_SPACING = 0.2;
/** Para referir o ganho a uma fonte isotrópica, somar 2,16 dB (p. 1 do relatório, "Method of measurement"). */
export const NBS_DBD_TO_DBI = 2.16;
/** Tolerância de corte pedida pelo relatório, em λ (seção 4). */
export const NBS_CUT_TOLERANCE_LAMBDA = 0.003;
/** Faixa de d/λ coberta pelos gráficos digitalizados (eixo da Fig. 9 até ≈ 0,04). */
export const NBS_D_OVER_LAMBDA_RANGE = { min: 0.0012, max: 0.04 } as const;

type Curve = readonly (readonly [number, number])[];

/**
 * Forma comum das curvas de diretores da Fig. 9 (curva E, 1,25λ), digitalizada: pares
 * (d/λ, comprimento em λ). As curvas A–E são aproximadamente paralelas; esta forma reproduz os
 * dois exemplos do relatório (diretor de 4,2λ em d/λ = 0,013 e de 0,8λ em d/λ = 0,0042).
 */
const DIRECTOR_CURVE_E: Curve = [
  [0.0012, 0.446],
  [0.0015, 0.4448],
  [0.002, 0.4431],
  [0.003, 0.4383],
  [0.004, 0.4343],
  [0.006, 0.4276],
  [0.0085, 0.4201],
  [0.01, 0.4167],
  [0.013, 0.4098],
  [0.017, 0.403],
  [0.022, 0.3963],
  [0.034, 0.3891],
  [0.04, 0.3841],
];

/**
 * Variação do comprimento do refletor com d/λ (Fig. 9, curvas de refletor), relativa a
 * d/λ = 0,0085: pares (d/λ, acréscimo em λ). Pontos lidos na figura; o de 0,0042 é do exemplo 1
 * do relatório (0,485λ contra 0,482λ) e o de 0,013 (interpolado) confere com o exemplo 2.
 * TODO(fonte): os pontos de 0,034 e 0,04 foram lidos com menos precisão.
 */
const REFLECTOR_SHIFT: Curve = [
  [0.0012, 0.0085],
  [0.0021, 0.0065],
  [0.0042, 0.003],
  [0.0085, 0],
  [0.0174, -0.0039],
  [0.034, -0.0055],
  [0.04, -0.0065],
];

/** Interpola linearmente em log10(d/λ); fora do intervalo, prolonga o segmento da ponta. */
function interpolateLog(points: Curve, d: number): number {
  const lx = Math.log10(d);
  let i = 1;
  while (i < points.length - 1 && Math.log10(points[i]![0]) < lx) i++;
  const [x0, y0] = points[i - 1]!;
  const [x1, y1] = points[i]!;
  const t = (lx - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0));
  return y0 + t * (y1 - y0);
}

/** d/λ em que a curva (decrescente) atinge o comprimento `v`; prolonga o segmento da ponta. */
function inverseLog(points: Curve, v: number): number {
  let i = 1;
  while (i < points.length - 1 && points[i]![1] > v) i++;
  const [x0, y0] = points[i - 1]!;
  const [x1, y1] = points[i]!;
  const t = (v - y0) / (y1 - y0);
  return 10 ** (Math.log10(x0) + t * (Math.log10(x1) - Math.log10(x0)));
}

/** Escalas da figura digitalizada, para medir arcos como o relatório faz com compasso. */
const PX_PER_DECADE = 1134;
const PX_PER_UNIT_LENGTH = 11180;

/** Comprimento de arco da curva, em pixels da figura, entre dois valores de d/λ (d0 < d1). */
function arc(points: Curve, d0: number, d1: number): number {
  const lx0 = Math.log10(d0);
  const lx1 = Math.log10(d1);
  const xs = [lx0, ...points.map(([x]) => Math.log10(x)).filter((x) => x > lx0 && x < lx1), lx1];
  let total = 0;
  for (let i = 1; i < xs.length; i++) {
    const a = xs[i - 1]!;
    const b = xs[i]!;
    const va = interpolateLog(points, 10 ** a);
    const vb = interpolateLog(points, 10 ** b);
    total += Math.hypot((b - a) * PX_PER_DECADE, (vb - va) * PX_PER_UNIT_LENGTH);
  }
  return total;
}

/** Procura por bisseção o d/λ a `pixels` de arco de `d0`, andando para d/λ maior (`+1`) ou menor (`-1`). */
function walk(points: Curve, d0: number, pixels: number, direction: 1 | -1): number {
  const far = (d: number) => (direction === 1 ? arc(points, d0, d) : arc(points, d, d0));
  let near = d0;
  let other = d0;
  for (let i = 0; far(other) < pixels; i++) {
    near = other;
    other = direction === 1 ? other * 1.5 : other / 1.5;
    if (i > 40 || other > 1 || other < 1e-5) throw new RangeError('A curva de projeto saiu da faixa de d/λ.');
  }
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(near * other);
    if (far(mid) < pixels) near = mid;
    else other = mid;
  }
  return Math.sqrt(near * other);
}

/**
 * Comprimentos dos diretores (em λ, SEM compensação de boom) para o projeto e o d/λ dados.
 *
 * Reproduz o procedimento do relatório (seção 4): a curva de projeto é a curva E deslocada para
 * passar pelo comprimento do 1º diretor da Tabela 1 em d/λ = 0,0085; os comprimentos da tabela
 * são marcados sobre a curva; a distância ao longo da curva entre o 1º diretor e cada um dos
 * outros é transposta a partir do ponto de partida do d/λ escolhido.
 */
export function directorLengths(design: NbsDesign, dOverLambda: number): number[] {
  const first = design.directors[0]!;
  const offset = first - interpolateLog(DIRECTOR_CURVE_E, NBS_TABLE_D_OVER_LAMBDA);
  const curve: Curve = DIRECTOR_CURVE_E.map(([d, v]) => [d, v + offset] as const);
  const dFirst = inverseLog(curve, first);
  return design.directors.map((tableLength, i) => {
    if (i === 0) return interpolateLog(curve, dOverLambda);
    const dTable = inverseLog(curve, tableLength);
    // Diretor menor que o 1º fica abaixo na curva (d/λ maior); maior, acima.
    const down = dTable >= dFirst;
    const pixels = down ? arc(curve, dFirst, dTable) : arc(curve, dTable, dFirst);
    return interpolateLog(curve, walk(curve, dOverLambda, pixels, down ? 1 : -1));
  });
}

/** Comprimento do refletor (λ, sem compensação de boom) para o projeto e o d/λ dados. */
export function reflectorLength(design: NbsDesign, dOverLambda: number): number {
  return (
    design.reflector +
    interpolateLog(REFLECTOR_SHIFT, dOverLambda) -
    interpolateLog(REFLECTOR_SHIFT, NBS_TABLE_D_OVER_LAMBDA)
  );
}

/**
 * Acréscimo (em λ) a cada elemento parasita para compensar o boom condutor (Fig. 10), em função
 * de D/λ do boom. A figura é uma reta; os dois pontos usados são os dos exemplos do relatório:
 * D/λ = 0,0085 → 0,005λ (exemplo 1) e D/λ = 0,035 → 0,026λ (exemplo 2). Confere com os
 * círculos da figura em outros D/λ (≈ 0,009λ em 0,0125; ≈ 0,019λ em 0,026).
 */
export function boomCorrection(boomOverLambda: number): number {
  const slope = (0.026 - 0.005) / (0.035 - 0.0085);
  return Math.max(0, 0.005 + slope * (boomOverLambda - 0.0085));
}
