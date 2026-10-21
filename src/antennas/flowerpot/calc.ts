/**
 * Flowerpot: dipolo vertical de meia onda feito de um cabo coaxial (RG-58) dentro de um tubo de PVC.
 *
 * De cima para baixo: o vivo (com o dielétrico, sem a malha) é o braço de cima; a face externa da malha do próprio cabo é o
 * braço de baixo; uma bobina do cabo enrolada no tubo é um choke que corta a corrente na malha e termina o braço de baixo.
 * "Um dipolo alimentado de um jeito esperto" (G4NSJ, https://www.radio-workshop.co.uk/g4nsj-flowerpot-antennas/).
 *
 * Medidas: J. Bishop, VK2ZOI, "Half-Wave Flower Pot Antenna" (https://vk2zoi.com/articles/half-wave-flower-pot/), RG-58 em
 * conduíte elétrico cinza de PVC. Os fatores sobre λ/4 são calibrados no protótipo de 2 m (457 e 447 mm, ROE mínima ≈ 146 MHz,
 * lida na curva publicada) e conferem com o de 6 m (1273 e 1245 mm, ≈ 52,4 MHz) a 0,1 % (teste). Equivalem a ≈ 0,89 e 0,87 de
 * λ/4: o dielétrico do cabo, a capa e o conduíte encurtam os braços. Não há fórmula publicada por trás: TODO(fonte).
 */

import { assertFrequencyMHz, formatNumber } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type CoaxCable, findCable } from '../../data/coax-cables';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface FlowerpotParams {
  frequencyMHz: number;
  /** 1 = dentro de conduíte cinza de PVC (medidas do VK2ZOI); 2 = sem tubo. */
  housing: number;
  /** Diâmetro externo do tubo da bobina, em metros (0,025, 0,032 ou 0,05); 0 = automático. */
  formerDiameter: number;
  /** 1 = uma frequência (meia espira a menos); 2 = faixa inteira (meia espira a mais). */
  chokeBand: number;
}

export const defaultParams: FlowerpotParams = {
  frequencyMHz: 145,
  housing: 1,
  formerDiameter: 0,
  chokeBand: 2,
};

/** Protótipo de 2 m do VK2ZOI: frequência da ROE mínima (lida na curva) e medidas dos braços. */
const VK2ZOI_REF_MHZ = 146;
const VK2ZOI_TOP_M = 0.457;
const VK2ZOI_BOTTOM_M = 0.447;
const QUARTER_REF = wavelength(VK2ZOI_REF_MHZ) / 4;
/** Fatores sobre λ/4 (≈ 0,890 e 0,871). */
const TOP_FACTOR = VK2ZOI_TOP_M / QUARTER_REF;
const BOTTOM_FACTOR = VK2ZOI_BOTTOM_M / QUARTER_REF;
/** Sem tubo, "provavelmente 2 %, talvez 3 % mais compridos" (VK2ZOI). Usamos o menor: corta-se com sobra de qualquer jeito. */
const OPEN_AIR_STRETCH = 1.02;

/** O VK2ZOI usa RG-58 com malha trançada (cabo de folha metálica quebra nas curvas da bobina). */
const CABLE: CoaxCable = findCable('belden-8259')!;

/** Ressonância da bobina: 5 a 6 % abaixo da operação (VK2ZOI). Usamos o meio, 5,5 %. */
const CHOKE_BELOW = 0.055;

/**
 * Tabela do VK2ZOI: ressonância própria (MHz) de bobinas de RG-58 em conduíte de PVC, por número de espiras e diâmetro do tubo.
 * `null` = sem medida.
 */
const CHOKE_TABLE: readonly { turns: number; srf: Readonly<Record<'0.025' | '0.032' | '0.05', number | null>> }[] = [
  { turns: 4, srf: { '0.025': null, '0.032': 160, '0.05': null } },
  { turns: 5, srf: { '0.025': 150, '0.032': 136, '0.05': 85 } },
  { turns: 8, srf: { '0.025': 142, '0.032': 106, '0.05': 65 } },
  { turns: 9, srf: { '0.025': 135, '0.032': 100, '0.05': 60 } },
  { turns: 10, srf: { '0.025': 129, '0.032': 95, '0.05': 57 } },
  { turns: 12, srf: { '0.025': 117, '0.032': 84, '0.05': 52 } },
  { turns: 15, srf: { '0.025': 105, '0.032': 75, '0.05': 47 } },
];
const FORMERS = [0.025, 0.032, 0.05] as const;

export interface ChokeDesign {
  /** Diâmetro externo do tubo, em metros. */
  formerM: number;
  /** Espiras, arredondadas para meia espira. */
  turns: number;
  /** Espiras pela interpolação da tabela, antes de arredondar. */
  exactTurns: number;
  targetSrfMHz: number;
}

/** Espiras pela interpolação linear da tabela (a ressonância cai com o número de espiras); `null` fora da tabela. */
function interpolateTurns(former: (typeof FORMERS)[number], srf: number): number | null {
  const rows = CHOKE_TABLE.flatMap((r) => {
    const v = r.srf[String(former) as '0.025' | '0.032' | '0.05'];
    return v === null ? [] : [{ turns: r.turns, srf: v }];
  });
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    if (srf <= a.srf && srf >= b.srf) return a.turns + ((a.srf - srf) * (b.turns - a.turns)) / (a.srf - b.srf);
  }
  return null;
}

/**
 * Bobina do choke pela tabela do VK2ZOI. `formerM` = 0 escolhe o menor tubo cuja tabela cobre a ressonância alvo.
 * Arredondamento (VK2ZOI): para uma frequência, a meia espira de baixo (ressonância mais perto da operação); para a faixa
 * toda, a de cima.
 */
export function chokeTurns(fMHz: number, formerM: number, band: 'narrow' | 'wide'): ChokeDesign | null {
  const target = fMHz * (1 - CHOKE_BELOW);
  const candidates = formerM === 0 ? FORMERS : FORMERS.filter((x) => x === formerM);
  for (const former of candidates) {
    const exact = interpolateTurns(former, target);
    if (exact === null) continue;
    const turns = band === 'narrow' ? Math.floor(exact * 2 + 1e-9) / 2 : Math.ceil(exact * 2 - 1e-9) / 2;
    return { formerM: former, turns, exactTurns: exact, targetSrfMHz: target };
  }
  return null;
}

export function calc(params: FlowerpotParams): CalcResult {
  const { frequencyMHz: f, housing, formerDiameter, chokeBand } = params;
  assertFrequencyMHz(f);
  if (housing !== 1 && housing !== 2) throw new RangeError(`Montagem inválida (${housing}).`);
  if (formerDiameter !== 0 && !FORMERS.some((x) => x === formerDiameter)) {
    throw new RangeError(`Diâmetro do tubo da bobina fora da tabela do VK2ZOI (${formerDiameter} m).`);
  }
  if (chokeBand !== 1 && chokeBand !== 2) throw new RangeError(`Uso inválido (${chokeBand}).`);

  const lambda = wavelength(f);
  const stretch = housing === 2 ? OPEN_AIR_STRETCH : 1;
  const top = (TOP_FACTOR * lambda * stretch) / 4;
  const bottom = (BOTTOM_FACTOR * lambda * stretch) / 4;
  const choke = chokeTurns(f, formerDiameter, chokeBand === 1 ? 'narrow' : 'wide');
  const cableOd = CABLE.outerDiameterMm / 1000;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Elemento de cima', meters: top, description: 'Vivo com o dielétrico, sem capa e sem malha, do fim da malha até a ponta.' },
    { label: 'B', name: 'Elemento de baixo', meters: bottom, description: 'Coaxial inteiro, do fim da malha (ponto de alimentação) até o início da bobina.' },
    { label: 'C', name: 'Parte que irradia', meters: top + bottom, description: 'A + B: da ponta de cima até o início da bobina.' },
  ];
  if (choke) {
    measurements.push(
      {
        label: 'D',
        name: 'Coaxial na bobina',
        meters: choke.turns * Math.PI * (choke.formerM + cableOd),
        description: `Cabo gasto nas ${formatNumber(choke.turns, 1)} espiras em volta do tubo de ${formatNumber(choke.formerM * 1000, 0)} mm.`,
      },
      {
        label: 'E',
        name: 'Comprimento da bobina',
        meters: choke.turns * cableOd,
        description: 'Espiras encostadas umas nas outras: é a distância entre os dois furos do tubo.',
      },
    );
  }

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (!choke) {
    const suggestion = chokeTurns(f, 0, chokeBand === 1 ? 'narrow' : 'wide');
    warnings.push({
      level: 'warning',
      message:
        `A tabela de bobinas do VK2ZOI não cobre ${formatNumber(f, 3)} MHz ` +
        (formerDiameter !== 0 && suggestion
          ? `com tubo de ${formatNumber(formerDiameter * 1000, 0)} mm: use o de ${formatNumber(suggestion.formerM * 1000, 0)} mm (ou o automático).`
          : // TODO(fonte): bobinas de RG-58 fora de 47–160 MHz.
            '(ela vai de 47 a 160 MHz de ressonância). Faça a bobina e meça a ressonância dela com o NanoVNA: deve ficar 5 a 6 % ' +
            'abaixo da frequência de operação. Outra saída é um choke de ferrite (várias contas no cabo).'),
    });
  }
  if (housing === 2) {
    warnings.push({
      level: 'info',
      message:
        'Sem tubo, o VK2ZOI estima elementos "provavelmente 2 %, talvez 3 %" mais compridos; a ferramenta usa 2 %. ' +
        'Corte o elemento de cima com sobra e ajuste.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'As medidas são de RG-58 com malha trançada e dielétrico de polietileno sólido (VF 0,66), em conduíte elétrico cinza. ' +
        'Cabo de espuma muda o elemento de cima; cabo com folha metálica quebra nas curvas da bobina; outros tubos (de irrigação, ' +
        'com carga condutora) mudam os comprimentos. Ajuste medindo a ROE.',
    },
    {
      level: 'info',
      message:
        'O ajuste é no elemento de cima (A): corte com sobra e apare. A marca do início da bobina (fim de B) não muda depois de ' +
        'enrolada. Se o elemento de cima ficar curto, solde um pedaço de fio na ponta.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: a ponta de cima (A) fica em tensão alta de RF. Mantenha a tampa do tubo e a antena fora do alcance de pessoas. ' +
        'Dentro de casa (forro, sótão), confira a distância segura na ferramenta "Exposição a RF".',
    },
  );

  const chokeText = choke
    ? `${formatNumber(choke.turns, 1)} espiras de RG-58 em tubo de ${formatNumber(choke.formerM * 1000, 0)} mm ` +
      `(tabela: ${formatNumber(choke.exactTurns, 2)} espiras para ressoar em ${formatNumber(choke.targetSrfMHz, 1)} MHz)`
    : 'fora da tabela do VK2ZOI';

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      {
        name: 'Elementos',
        value: `cima ${formatNumber(TOP_FACTOR, 3)} × λ/4, baixo ${formatNumber(BOTTOM_FACTOR, 3)} × λ/4` + (housing === 2 ? ', + 2 % sem tubo' : ''),
        source: 'VK2ZOI, protótipo de 2 m (457 e 447 mm a 146 MHz); confere com o de 6 m',
      },
      { name: 'Cabo', value: `${CABLE.name}, Ø ${formatNumber(CABLE.outerDiameterMm, 2)} mm, VF ${formatNumber(CABLE.velocityFactor, 2)}`, source: CABLE.source.document },
      { name: 'Tubo', value: housing === 1 ? 'Conduíte elétrico cinza de PVC' : 'Sem tubo' },
      { name: 'Bobina (choke)', value: chokeText, source: 'VK2ZOI: ressonância 5 a 6 % abaixo da operação, tabela de espiras × tubo' },
    ],
    expected: {
      impedance: {
        typical: 50,
        unit: 'Ω',
        note:
          'ROE ≈ 1,0:1 em 50 Ω na ressonância, medida pelo VK2ZOI nos protótipos de 2 m e 6 m (um de cada). G4NSJ mediu ≈ 1:1 ' +
          'com a antena no ar livre e 1,4:1 dentro do sótão: objetos por perto mudam a ROE.',
        source: 'VK2ZOI (curvas de ROE medidas); G4NSJ',
      },
      gain: {
        typical: 2.15,
        unit: 'dBi',
        note:
          'Ganho de um dipolo de meia onda ideal no espaço livre. As perdas na bobina e no tubo não foram medidas ' +
          '(o VK2ZOI diz que o conduíte "parece ter pouco efeito" na eficiência).',
        source: 'Balanis, Antenna Theory, 4ª ed., §4.6',
      },
      bandwidth: {
        min: 0.027 * f,
        unit: 'MHz',
        note:
          'ROE < 1,5:1 em pelo menos 2,7 % da frequência: o protótipo de 2 m ficou abaixo de 1,2:1 de 144 a 148 MHz (toda a curva ' +
          'publicada) e o de 6 m abaixo de 1,5:1 de ≈ 51,4 a mais de 53,8 MHz. Medidas de um protótipo de cada, não um modelo.',
        source: 'VK2ZOI (curvas de ROE medidas)',
      },
    },
    warnings,
    assembly: {
      title: 'Montagem (método do VK2ZOI)',
      steps: [
        'Use um único pedaço de RG-58 que vá da antena até o rádio, sem emendas.',
        `Numa ponta, tire a capa e a malha num trecho um pouco maior que A (${formatNumber(top * 1000, 0)} mm): esse é o elemento de cima. ` +
          'Amarre uma linha de náilon na ponta.',
        `Do fim da malha, meça B (${formatNumber(bottom * 1000, 0)} mm) pelo cabo e marque: é onde começa a bobina.`,
        choke
          ? `Fure o tubo de ${formatNumber(choke.formerM * 1000, 0)} mm em dois pontos separados por E e enrole ${formatNumber(choke.turns, 1)} espiras ` +
            'encostadas, entrando pelo furo de cima com a marca e saindo pelo de baixo.'
          : 'Faça a bobina com o número de espiras que ressoe 5 a 6 % abaixo da frequência (meça com o NanoVNA).',
        'Estique o elemento de cima com a linha de náilon presa na tampa do tubo.',
        'Ponha o conector, meça a ROE e apare o elemento de cima (A) até a ROE mínima ficar na frequência desejada.',
        'Vede a ponta da malha e os furos com termorretrátil. Não tampe o fundo do tubo: a água condensada precisa sair.',
      ],
    },
  };
}
