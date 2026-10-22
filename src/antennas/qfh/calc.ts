/**
 * QFH (quadrifilar helix de meia volta), para recepção de satélites.
 *
 * As medidas vêm da saída da calculadora de John Coppens (jcoppens.com), reproduzida na página
 * de IK1HGI (https://www.qsl.net/ik1hgi/qfh-2_hgi.htm, consultada em 2026-10-16) para 137,5 MHz:
 * espira de 1 comprimento de onda, 0,5 volta (torção), raio de curvatura 13 mm, condutor de 4,1 mm
 * e razão largura/altura 0,44. A calculadora não publica as equações; por isso as medidas de outras
 * frequências são obtidas por ESCALA (tudo ∝ 1/f), a partir de 137,5 MHz. Escalar é correto para a
 * geometria, mas o diâmetro do condutor e o raio de curvatura não escalam: ver `diameterSensitivity`
 * e os avisos. Uma segunda saída da mesma calculadora (rfwireless-world.com, condutor de 7 mm, raio
 * de 15 mm) mostra que a mudança do condutor altera as medidas em menos de 1 %.
 * TODO(fonte): Kilgus (1969, IEEE AP-17; 1970, Microwave Journal) e as equações da calculadora.
 */

import { assertFrequencyMHz, assertPositive, formatNumber, formatEngineering } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { RHCP, SENSE_NAME, type Sense, senseOf } from '../circular';
import { meta } from './meta';

/** Sentido de enrolamento das hélices: à direita (como uma rosca comum) ou à esquerda. */
export type Winding = 'right' | 'left';

/**
 * Enrolamento que dá cada sentido de polarização no zênite, com a espira MENOR adiantada de 90° (a maior, mais longa e indutiva, atrasa) e o
 * feixe para cima, alimentação no topo. Resultado do modelo por momentos (ver pattern-model.test.ts): enrolamento à direita dá LHCP e à
 * esquerda dá RHCP. Concorda com uma fonte secundária (patente US 10511099, via busca: "left hand twist ... right hand circularly polarized"),
 * que não foi lida na íntegra. TODO(fonte): medida com um passe de satélite.
 */
export function windingFor(sense: Sense): Winding {
  return sense === 'rhcp' ? 'left' : 'right';
}

export interface QfhParams {
  frequencyMHz: number;
  /** Sentido da polarização circular: RHCP ou LHCP (ver `circular.ts`). O enrolamento sai de `windingFor`. */
  circularSense: number;
  /** Diâmetro do condutor, em metros (só entra no modelo de padrão; as medidas são as de 4,1 mm). */
  wireDiameter: number;
  /**
   * Espaço central, em metros: abertura no meio do braço de cima de cada espira, onde liga a alimentação. Conta dentro do comprimento
   * da espira (A, E), como no dipolo; precisa ser maior que o diâmetro do condutor.
   */
  centerGap: number;
}

/** Diâmetro do condutor da saída de referência da calculadora de Coppens, em metros. */
export const REFERENCE_WIRE_DIAMETER = 0.0041;

export const defaultParams: QfhParams = { frequencyMHz: 137.5, wireDiameter: REFERENCE_WIRE_DIAMETER, circularSense: RHCP, centerGap: 0.01 };

/** Frequência de referência dos dados, MHz. */
export const REFERENCE_FREQUENCY_MHZ = 137.5;

/**
 * Saída da calculadora de Coppens a 137,5 MHz (milímetros), condutor de 4,1 mm, raio de curvatura 13 mm.
 * Fonte: https://www.qsl.net/ik1hgi/qfh-2_hgi.htm
 */
export const REFERENCE_MM = {
  wavelength: 2181.8,
  large: { wire: 2391.2, verticalSeparator: 886, height: 728.8, innerDiameter: 316.6, horizontalSeparator: 320.7 },
  small: { wire: 2272.3, verticalSeparator: 842.4, height: 693, innerDiameter: 300.8, horizontalSeparator: 304.9 },
} as const;

/**
 * Saída da mesma calculadora com condutor de 7 mm e raio de curvatura 15 mm (rfwireless-world.com,
 * https://www.rfwireless-world.com/calculators/qfh-antenna-basics, consultada em 2026-10-16), a 137,5 MHz.
 * Usada só para medir a sensibilidade ao diâmetro do condutor.
 */
export const REFERENCE_7MM = {
  large: { wire: 2397.4, height: 731.8, innerDiameter: 315, horizontalSeparator: 322 },
  small: { wire: 2278.3, height: 695.8, innerDiameter: 299.1, horizontalSeparator: 306.1 },
} as const;

/** Variação relativa de cada medida ao passar o condutor de 4,1 mm para 7 mm (a 137,5 MHz). */
export function diameterSensitivity(): Record<string, number> {
  const rel = (a: number, b: number) => (a - b) / b;
  return {
    'L1': rel(REFERENCE_7MM.large.wire, REFERENCE_MM.large.wire),
    'H1': rel(REFERENCE_7MM.large.height, REFERENCE_MM.large.height),
    'Di1': rel(REFERENCE_7MM.large.innerDiameter, REFERENCE_MM.large.innerDiameter),
    'D1': rel(REFERENCE_7MM.large.horizontalSeparator, REFERENCE_MM.large.horizontalSeparator),
    'L2': rel(REFERENCE_7MM.small.wire, REFERENCE_MM.small.wire),
    'H2': rel(REFERENCE_7MM.small.height, REFERENCE_MM.small.height),
    'Di2': rel(REFERENCE_7MM.small.innerDiameter, REFERENCE_MM.small.innerDiameter),
    'D2': rel(REFERENCE_7MM.small.horizontalSeparator, REFERENCE_MM.small.horizontalSeparator),
  };
}

/**
 * Os separadores horizontais são a saída da calculadora. Conferido (sem fonte escrita): o horizontal é o diâmetro entre os centros do fio e o
 * vertical é o comprimento do braço helicoidal √(H² + (π·r)²), com r = (diâmetro interno + diâmetro do fio)/2.
 */
const SEPARATOR_NOTE =
  'Valor da calculadora de Coppens. Confere com o diâmetro entre os centros do fio (diâmetro interno + 4,1 mm): ver pattern-model.test.ts.';

/** Escala uma medida de referência (mm, a 137,5 MHz) para a frequência dada, em metros. */
export function scaleFromReference(mm: number, fMHz: number): number {
  return (mm / 1000) * (REFERENCE_FREQUENCY_MHZ / fMHz);
}

export function calc(params: QfhParams): CalcResult {
  const { frequencyMHz: f, wireDiameter: wd, centerGap: gap } = params;
  const sense = senseOf(params.circularSense);
  const winding = windingFor(sense);
  assertFrequencyMHz(f);
  assertPositive(wd, 'O diâmetro do condutor');
  const s = (mm: number) => scaleFromReference(mm, f);
  const { large, small } = REFERENCE_MM;
  const lambda = wavelength(f);
  // Os braços de cima das duas espiras se cruzam no centro (a 90°, na mesma altura): a ponta de um braço fica a gap/2 do eixo, e o braço
  // da outra espira ocupa d/2 para cada lado do eixo dela. Com gap ≤ d, as pontas encostam na outra espira (geometria; regra pedida pelo usuário).
  if (!Number.isFinite(gap) || !(gap > wd)) {
    throw new RangeError(
      `O espaço central (${formatNumber(gap * 1000, 1)} mm) precisa ser maior que o diâmetro do condutor (${formatNumber(wd * 1000, 1)} mm): ` +
        'os braços de cima das duas espiras se cruzam no centro e encostariam um no outro.',
    );
  }
  if (gap >= s(small.horizontalSeparator)) {
    throw new RangeError('O espaço central é maior que o braço de cima da espira menor (separador horizontal H).');
  }

  const measurements: Measurement[] = [
    { label: 'A', name: 'Espira maior: comprimento da espira', meters: s(large.wire), description: 'Comprimento total da espira maior, incluindo o espaço central K.' },
    { label: 'B', name: 'Espira maior: altura', meters: s(large.height), description: 'Altura da hélice da espira maior.' },
    { label: 'C', name: 'Espira maior: diâmetro interno', meters: s(large.innerDiameter), description: 'Diâmetro interno do cilindro da espira maior.' },
    { label: 'D', name: 'Espira maior: separador horizontal', meters: s(large.horizontalSeparator), description: SEPARATOR_NOTE },
    { label: 'E', name: 'Espira menor: comprimento da espira', meters: s(small.wire), description: 'Comprimento total da espira menor, incluindo o espaço central K.' },
    { label: 'F', name: 'Espira menor: altura', meters: s(small.height), description: 'Altura da hélice da espira menor.' },
    { label: 'G', name: 'Espira menor: diâmetro interno', meters: s(small.innerDiameter), description: 'Diâmetro interno do cilindro da espira menor.' },
    { label: 'H', name: 'Espira menor: separador horizontal', meters: s(small.horizontalSeparator), description: SEPARATOR_NOTE },
    { label: 'I', name: 'Espira maior: fio a cortar', meters: s(large.wire) - gap, description: 'A menos o espaço central K: a espira fica aberta no meio do braço de cima.' },
    { label: 'J', name: 'Espira menor: fio a cortar', meters: s(small.wire) - gap, description: 'E menos o espaço central K: a espira fica aberta no meio do braço de cima.' },
    { label: 'K', name: 'Espaço central (alimentação no topo)', meters: gap, description: 'Abertura no meio do braço de cima de cada espira, onde liga a alimentação; já conta dentro de A e de E.' },
  ];

  const sens = diameterSensitivity();
  const worst = Math.max(...Object.values(sens).map((v) => Math.abs(v)));
  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (Math.abs(wd - REFERENCE_WIRE_DIAMETER) > 0.0001) {
    warnings.push({
      level: 'info',
      message:
        `Condutor de ${formatNumber(wd * 1000, 1)} mm: as medidas continuam as da referência (4,1 mm). Só o padrão de irradiação usa o seu diâmetro. ` +
        'Entre 4,1 mm e 7 mm a calculadora de Coppens muda as medidas em menos de 1 %; fora dessa faixa não há dado.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'Estas medidas são as da calculadora de Coppens a 137,5 MHz, ESCALADAS pela frequência. A calculadora não publica ' +
        'as equações; o diâmetro do condutor e o raio de curvatura não escalam com a frequência. Entre condutores de 4,1 mm e ' +
        `7 mm a 137,5 MHz as medidas variam no máximo ${formatNumber(worst * 100, 1)} %. Longe de 137,5 MHz (por exemplo GPS), ` +
        // TODO(fonte): equações do Kilgus.
        'o erro por não escalar o condutor pode ser maior. Meça a ROE e ajuste.',
    },
    {
      level: 'warning',
      message:
        'As duas espiras têm comprimentos diferentes de propósito: uma é um pouco mais longa e a outra mais curta, e as ' +
        'duas reatâncias (indutiva e capacitiva) criam o defasamento de 90° que dá a polarização circular. Corte cada ' +
        'espira no seu comprimento; não as faça iguais.',
    },
    {
      level: 'info',
      message:
        `Para ${SENSE_NAME[sense]}, enrole as hélices ${winding === 'left' ? 'À ESQUERDA' : 'À DIREITA'}: veja o método de montagem. ` +
        'Satélites meteorológicos de 137 MHz usam polarização circular à direita (RHCP). Confirme o sentido para o satélite que você quer receber.',
    },
    {
      level: 'info',
      message:
        'Esta ferramenta trata a QFH como antena de recepção. Não há dados aqui de potência, tensões e casamento para transmitir.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Frequência de referência dos dados', value: `${formatNumber(REFERENCE_FREQUENCY_MHZ, 1)} MHz`, source: 'Coppens, via IK1HGI' },
      { name: 'Escala aplicada', value: `× ${formatNumber(REFERENCE_FREQUENCY_MHZ / f, 4)} (tudo ∝ 1/f)` },
      { name: 'Hélice', value: '2 espiras (maior e menor), 0,5 volta de torção, 1 λ de comprimento de espira', source: 'Coppens, via IK1HGI' },
      { name: 'Condutor de referência', value: '4,1 mm, raio de curvatura 13 mm, razão largura/altura 0,44', source: 'Coppens, via IK1HGI' },
      { name: 'Sentido da polarização', value: `${SENSE_NAME[sense]}: hélices enroladas ${winding === 'left' ? 'à esquerda' : 'à direita'}`, source: 'Modelo por momentos (feixe para cima, espira menor adiantada); patente US 10511099 concorda (fonte secundária)' },
      { name: 'Diâmetro do condutor informado', value: `${formatNumber(wd * 1000, 2)} mm (só no padrão de irradiação)` },
      {
        name: 'Espaço central',
        value: `${formatNumber(gap * 1000, 1)} mm, dentro do comprimento de cada espira (fio a cortar = espira − espaço)`,
        source: 'Convenção da ferramenta (comprimento de ponta a ponta, como no dipolo); o padrão de irradiação não modela a abertura',
      },
      { name: 'Sensibilidade ao condutor (4,1 → 7 mm)', value: `até ${formatNumber(worst * 100, 1)} % nas medidas`, source: 'Coppens, via rfwireless-world.com' },
      { name: 'Comprimento de onda de referência', value: `${formatEngineering(REFERENCE_MM.wavelength / 1000, 'm')} (a 137,5 MHz, c = 3×10⁸ m/s)`, source: 'Coppens: usa c = 3×10⁸ m/s' },
    ],
    expected: {
      impedance: {
        typical: 50,
        unit: 'Ω',
        note: 'Projeto para alimentar com coaxial de 50 Ω, segundo as fontes de montagem. Meça a ROE e ajuste o comprimento das espiras.',
        // TODO(fonte): Kilgus.
        source: 'IK1HGI (montagem)',
      },
      gain: {
        unit: 'dBi',
        // TODO(fonte): fonte pendente para o texto abaixo.
        note: 'Diagrama quase hemisférico de polarização circular. Não há valor de ganho com fonte aqui.',
        // TODO(fonte): fonte pendente para o texto abaixo.
        source: 'Sem fonte citada',
      },
      // TODO(fonte): sem medida. O modelo por momentos com as espiras em paralelo no topo (autofaseada) dá a melhor quadratura em
      // ≈ 0,98·f (correntes 2,7:1 em f) e não foi conferido; não é usado (2026-10-22).
      bandwidth: null,
    },
    warnings,
    assembly: assemblyFor(sense, winding),
  };
}

/** Método de montagem para o sentido pedido: sentido de enrolamento das duas hélices e como reconhecê-lo. */
function assemblyFor(sense: Sense, winding: Winding): AssemblyGuide {
  const left = winding === 'left';
  return {
    title: `Montagem para ${SENSE_NAME[sense]}: enrolamento à ${left ? 'esquerda' : 'direita'}`,
    steps: [
      `Enrole as duas espiras (a maior e a menor) À ${left ? 'ESQUERDA' : 'DIREITA'}, as duas com o MESMO sentido de enrolamento.`,
      `Como reconhecer: subindo pelo fio, ele gira no sentido ${left ? 'HORÁRIO' : 'ANTI-HORÁRIO'} visto de cima (rosca ${left ? 'à esquerda' : 'comum, à direita'}). Visto de lado, os braços da frente sobem da ${left ? 'direita para a esquerda ("\\")' : 'esquerda para a direita ("/")'}.`,
      'Alimentação no topo: o coaxial sobe pelo centro até o topo, onde ligam as duas espiras; as pontas de baixo de cada espira ficam unidas por um braço contínuo.',
      'A espira maior (mais longa, indutiva) é a que atrasa; a menor (capacitiva) é a que adianta. Não troque os comprimentos.',
      `Montar com o enrolamento oposto (à ${left ? 'direita' : 'esquerda'}) dá ${left ? 'LHCP' : 'RHCP'}: confira antes de fixar as hélices.`,
      // TODO(fonte): fonte pendente para o texto abaixo.
      'Esta regra vem do modelo por momentos e concorda com uma patente (fonte secundária, não lida na íntegra); o arranjo real de ligação das pontas não consta das fontes consultadas. Confirme com um passe real.',
    ],
  };
}

// TODO(fonte) [guide.md]: fonte pendente: «- **Ganho:** o modelo por momentos (ver as referências) dá ≈ 4,8 dBi no zênite, com −6 a −…»
// TODO(fonte) [guide.md]: consulte a página de montagem de origem.
