/**
 * Turnstile: dois dipolos de meia onda cruzados a 90°, alimentados em quadratura.
 *
 * Fontes:
 *  - Princípio (dois dipolos idênticos em ângulo reto, correntes defasadas de 90°, sentido da polarização dado pelo
 *    sinal da defasagem; refletor plano a 1/4 de onda atrás dos elementos soma as ondas direta e refletida e dá +3 dB, valor que o estudo do refletor por momentos não confirma;
 *    modo normal: diagrama horizontal quase omni, desvio de ±5 %): Wikipedia, "Turnstile antenna",
 *    https://en.wikipedia.org/wiki/Turnstile_antenna (consultada em 2026-10-16), que cita Kraus, "Antennas", 2ª ed.,
 *    1988, pp. 726–729; Milligan, "Modern Antenna Design", 2ª ed., 2005, pp. 231–237; G. Brown, US 2.086.976.
 *    Os livros NÃO foram consultados diretamente.
 *  - Dipolo: comprimento K·λ/2, com K do diâmetro (`k-factor.ts`), e Z ≈ 73 Ω, como em antennas/dipole (Balanis, §4.6).
 *  - Fase por linha de 1/4 de onda: teoria de linhas de transmissão (Pozar, "Microwave Engineering", cap. 2). A mesma montagem
 *    está em K. Rothammel, "Antene" (trad. sérvia da 9ª ed. alemã), §25.2.3, p. 370: laço de λ/4 com impedância igual à
 *    resistência de cada dipolo (60 Ω para dipolos esticados, 240 Ω para dobrados), junção de ≈ 30 Ω (≈ 120 Ω com dobrados) e
 *    banda estreita por causa da linha. O livro também dá o ganho de empilhar andares (2 andares a 0,5λ: ≈ 1,2 dB).
 *
 * Derivação da alimentação (sem coeficiente empírico): com o acoplamento mútuo desprezado (os dipolos são ortogonais),
 * o dipolo A liga direto no ponto de alimentação e o dipolo B por uma linha de 1/4 de onda de impedância Zq. Para uma
 * linha de 1/4 de onda, V_in = jZq·I_L, então I_B = −j·V/Zq e I_A = V/R. A razão I_B/I_A = −j·R/Zq tem módulo 1
 * quando Zq = R: correntes iguais e a 90°. A impedância no ponto de alimentação é R ∥ (Zq²/R) = R/2 ≈ 36,5 Ω.
 * Tamanho do refletor: nenhuma fonte consultada o dá; vem do estudo por momentos de `reflector-model.ts` (tela quadrada de lado 1λ,
 * vãos de até 0,05λ), um modelo sem comparação com medida.
 * TODO(fonte): o efeito do refletor sobre R (a 1/4 de onda o valor muda) e uma regra publicada para o tamanho do refletor.
 */

import { type Complex, abs, complex } from '../../core/complex';
import { reflectionCoefficient, swrFromGamma } from '../../core/reflection';
import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { crossedDipoleDirectivity } from '../../core/pattern';
import { assertFactor, physicalLength, wavelength } from '../../core/wave';
import { axialText, swrBandwidthEstimate } from '../bandwidth';
import { DIPOLE_SWEEP, type DipoleReflector, dipoleBandModel } from '../dipole/band-model';
import { K_FIELD_NOTE, kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { quadratureSweep } from '../quadrature-feed';
import { type AssemblyGuide, type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { RHCP, SENSE_NAME, type Sense, senseOf } from '../circular';
import { meta } from './meta';
import {
  MESH_OPENING_LAMBDA,
  REFLECTOR_MIN_SIDE_LAMBDA,
  REFLECTOR_PLATE,
  REFLECTOR_SIDE_LAMBDA,
  REFLECTOR_STUDY,
  REFLECTOR_TUBES,
  ROD_RADIUS_LAMBDA,
  TUBE_LENGTH_LAMBDA,
  TUBE_STUDY,
} from './reflector-model';

export interface TurnstileParams {
  frequencyMHz: number;
  /** Diâmetro do condutor dos dipolos, em metros; define o K. */
  conductorDiameter: number;
  /** Espaço central de cada dipolo, em metros; conta dentro do comprimento total. */
  centerGap: number;
  /** Fator de velocidade do coaxial de fase, em (0, 1]. */
  velocityFactor: number;
  /** 1 = com refletor a 1/4 de onda; 0 = sem refletor (a tela mostra uma caixa de seleção). */
  reflector: number;
  /** Tipo de refletor (só com refletor): chapa ou tela (1), ou um tubo alinhado com cada dipolo (2). */
  reflectorKind: number;
  /** Sentido da polarização circular: RHCP ou LHCP (ver `circular.ts`). */
  circularSense: number;
}

export const defaultParams: TurnstileParams = {
  frequencyMHz: 137.5,
  conductorDiameter: 0.002,
  centerGap: 0.01,
  velocityFactor: 0.66,
  reflector: 1,
  reflectorKind: REFLECTOR_PLATE,
  circularSense: RHCP,
};

/** Resistência de radiação do dipolo fino de meia onda no espaço livre (Ω): Balanis, §4.6. */
export const DIPOLE_RESISTANCE_OHMS = 73;

export interface QuadratureFeed {
  /** Módulo da razão |I_B/I_A| (1 = correntes iguais). */
  currentRatio: number;
  /** Fase de I_B em relação a I_A (graus): −90°. */
  phaseDeg: number;
  /** Impedância no ponto de alimentação (Ω). */
  feedImpedance: Complex;
}

/**
 * Dipolo A direto e dipolo B por linha de 1/4 de onda de impedância `zLine`, ambos com resistência `r`:
 * I_B/I_A = −j·r/zLine; Z_feed = r ∥ (zLine²/r).
 */
export function quadratureFeed(r: number, zLine: number): QuadratureFeed {
  if (!(r > 0) || !(zLine > 0)) throw new RangeError('As impedâncias devem ser positivas.');
  const ratio = r / zLine;
  const zB = (zLine * zLine) / r;
  return { currentRatio: ratio, phaseDeg: -90, feedImpedance: complex((r * zB) / (r + zB), 0) };
}

export function calc(params: TurnstileParams): CalcResult {
  const { frequencyMHz: f, velocityFactor: vf, conductorDiameter: d, centerGap: gap } = params;
  assertFrequencyMHz(f);
  assertPositive(d, 'O diâmetro do condutor');
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O espaço central deve ser ≥ 0 (recebido: ${gap}).`);
  }
  // Os dois dipolos se cruzam no mesmo centro: a ponta de dentro de um braço fica a gap/2 do centro, e o braço do outro dipolo ocupa
  // d/2 para cada lado do eixo dele. Com gap ≤ d, as pontas encostam no outro dipolo (geometria; regra pedida pelo usuário).
  if (!(gap > d)) {
    throw new RangeError(
      `O espaço central (${formatNumber(gap * 1000, 1)} mm) precisa ser maior que o diâmetro do condutor (${formatNumber(d * 1000, 1)} mm): ` +
        'os braços dos dois dipolos se cruzam no centro e encostariam um no outro.',
    );
  }
  assertFactor(vf, 'O fator de velocidade');
  if (params.reflector !== 0 && params.reflector !== 1) {
    throw new RangeError('O parâmetro "com refletor" deve ser 0 ou 1.');
  }
  if (params.reflectorKind !== REFLECTOR_PLATE && params.reflectorKind !== REFLECTOR_TUBES) {
    throw new RangeError('O tipo de refletor deve ser chapa/tela ou tubos.');
  }
  const withReflector = params.reflector === 1;
  const tubes = params.reflectorKind === REFLECTOR_TUBES;
  const sense = senseOf(params.circularSense);

  const lambda = wavelength(f);
  const sf = shorteningFactorFor(d, f);
  const total = physicalLength(0.5, f, sf.k);
  if (gap >= total) {
    throw new RangeError('O espaço central é maior que o comprimento total do dipolo.');
  }
  const arm = (total - gap) / 2;
  const phasing = physicalLength(0.25, f, vf);
  const spacing = lambda / 4;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Comprimento total de cada dipolo', meters: total, description: 'Dois dipolos iguais, de ponta a ponta, incluindo o espaço central. Corte com sobra.' },
    { label: 'B', name: 'Cada braço', meters: arm, description: 'Do terminal central até a ponta. São quatro braços iguais no total.' },
    { label: 'C', name: 'Linha de fase (1/4 de onda de coaxial)', meters: phasing, description: 'Trecho de coaxial de 1/4 de onda com o VF do cabo, entre o ponto de alimentação e o segundo dipolo.' },
  ];
  if (withReflector) {
    measurements.push({ label: 'D', name: 'Distância ao refletor', meters: spacing, description: 'Do plano dos dipolos até o refletor, 1/4 de onda no ar.' });
    if (tubes) {
      measurements.push({
        label: 'G',
        name: 'Refletor: comprimento de cada tubo',
        meters: TUBE_LENGTH_LAMBDA * lambda,
        description:
          'Dois tubos de mesmo comprimento, um paralelo a cada dipolo, centrados sob ele e cruzados em camadas separadas (sem se tocar). ' +
          'Menos que ≈ 0,45λ o tubo deixa de refletir; mais que ≈ 0,55λ piora. Ajuste medindo.',
      });
    } else {
      measurements.push({
        label: 'G',
        name: 'Refletor: lado da tela quadrada',
        meters: REFLECTOR_SIDE_LAMBDA * lambda,
        description: `Tela metálica quadrada de 1λ de lado (mínimo ${formatNumber(REFLECTOR_MIN_SIDE_LAMBDA, 2)}λ = ${formatNumber(REFLECTOR_MIN_SIDE_LAMBDA * lambda * 100, 0)} cm). Centrada sob os dipolos. Também serve um disco de mesmo diâmetro.`,
      });
      measurements.push({
        label: 'H',
        name: 'Refletor: vão máximo da tela',
        meters: MESH_OPENING_LAMBDA * lambda,
        description: 'Distância máxima entre fios ou hastes da tela (centro a centro). Chapa inteira também serve; vãos maiores pioram a relação frente–costas.',
      });
    }
  }

  if (gap > 0) {
    measurements.push({ label: 'E', name: 'Espaço central de cada dipolo', meters: gap, description: 'Entre os dois braços de cada dipolo, no isolador central.' });
  }

  const feed = quadratureFeed(DIPOLE_RESISTANCE_OHMS, DIPOLE_RESISTANCE_OHMS);
  const zFeed = feed.feedImpedance.re;
  const swr50 = swrFromGamma(abs(reflectionCoefficient(feed.feedImpedance, 50)));

  // Banda: cada dipolo pelo método dos momentos, reajustado para ressoar (com o refletor, se houver), e a junção pela linha de 1/4 de
  // onda de 73 Ω (quadrature-feed.ts). Chapa/tela = plano infinito (imagem); tubos = um tubo parasita sob cada dipolo.
  const reflectorModel: DipoleReflector | undefined = !withReflector
    ? undefined
    : tubes
      ? { kind: 'tube', distanceM: spacing, lengthM: TUBE_LENGTH_LAMBDA * lambda, diameterM: 2 * ROD_RADIUS_LAMBDA * lambda }
      : { kind: 'plane', distanceM: spacing };
  const band = dipoleBandModel(f, d, reflectorModel);
  const rModel = band.impedanceAt(f).re;
  const modelFeed = quadratureFeed(rModel, DIPOLE_RESISTANCE_OHMS);
  const modelSwr50 = swrFromGamma(abs(reflectionCoefficient(modelFeed.feedImpedance, 50)));
  const quad = quadratureSweep({
    centerMHz: f,
    ...DIPOLE_SWEEP,
    impedanceAt: band.impedanceAt,
    zLine: DIPOLE_RESISTANCE_OHMS,
    referenceOhms: 50,
  });
  const spanPercent = DIPOLE_SWEEP.span * 100;
  const bandwidth = swrBandwidthEstimate(quad.swr, {
    reference: 'em 50 Ω',
    spanPercent,
    // A ROE do conjunto é mais larga que a de um dipolo: as reflexões dos dois dipolos chegam à junção com 180° de diferença e se
    // cancelam. Premissas: dipolos ajustados para ressoar (com o refletor do modelo), linha de fase sem perdas, acoplamento entre os
    // dipolos cruzados desprezado, razão axial na direção do feixe.
    note: axialText(quad.axialBand, spanPercent),
    source:
      'Momentos (conferido com Cebik); linha de 1/4 pela matriz ABCD (Pozar)' +
      (withReflector && !tubes ? '; plano por imagens (Balanis)' : '') +
      '; razão axial < 3 dB: critério usual (IntechOpen)',
  });

  // Ganho no zênite com quadratura ideal. Sem refletor: dipolos cruzados analíticos (core/pattern.ts). Com refletor: o estudo por
  // momentos de reflector-model.ts (tela do lado recomendado ou um tubo de 0,5λ por dipolo). O "+3 dB do refletor" da Wikipedia
  // (Milligan), usado antes, não confere com o estudo (≈ +5,7 dB com a tela). TODO(fonte): sem medida.
  const reflectorRow = withReflector
    ? tubes
      ? TUBE_STUDY.find((r) => r.sideLambda === TUBE_LENGTH_LAMBDA)!
      : REFLECTOR_STUDY.find((r) => r.sideLambda === REFLECTOR_SIDE_LAMBDA)!
    : null;
  const gain: Estimate = reflectorRow
    ? {
        typical: reflectorRow.directivityDbi,
        unit: 'dBic',
        note:
          `No zênite, com ${tubes ? `um tubo de ${formatNumber(TUBE_LENGTH_LAMBDA, 1)}λ sob cada dipolo` : `tela de ${formatNumber(REFLECTOR_SIDE_LAMBDA, 0)}λ de lado`} ` +
          `a λ/4, quadratura ideal e sem perdas. Relação frente–costas ≈ ${formatNumber(reflectorRow.frontToBackDb, 0)} dB.`,
        source: 'Estudo do refletor por momentos desta ferramenta (reflector-model.ts); sem medida',
      }
    : {
        typical: 10 * Math.log10(crossedDipoleDirectivity(total / lambda, false)),
        unit: 'dBic',
        note: 'No zênite (eixo da cruz), com quadratura ideal e sem perdas. Irradia igualmente para baixo; no horizonte a polarização é linear.',
        source: 'Dipolos cruzados em quadratura (Balanis §4.2), por integração numérica',
      };

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  const clampWarning = kWarning(sf);
  if (clampWarning) warnings.push(clampWarning);
  warnings.push({ level: 'info', message: K_FIELD_NOTE });
  if (vf < 0.6 || vf > 0.9) {
    warnings.push({
      level: 'warning',
      message:
        `Fator de velocidade ${formatNumber(vf, 2)} é incomum para coaxial (polietileno sólido ≈ 0,66; espuma 0,78 a 0,85). ` +
        'Confira o datasheet: o VF define a defasagem de 90°.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        `A linha de fase ideal tem impedância igual à resistência de cada dipolo (≈ ${DIPOLE_RESISTANCE_OHMS} Ω; coaxial de 75 Ω é o mais próximo). ` +
        'Assim as duas correntes têm o mesmo módulo e 90° de defasagem. Com outro cabo (50 Ω) as correntes ficam desiguais ' +
        'e a polarização deixa de ser perfeitamente circular. Um erro no VF desloca a defasagem.',
    },
    {
      level: 'warning',
      message:
        `Impedância no ponto de alimentação ≈ ${formatNumber(zFeed, 1)} Ω (dois dipolos de ${DIPOLE_RESISTANCE_OHMS} Ω em paralelo), ` +
        `ROE ≈ ${formatNumber(swr50, 2)}:1 em 50 Ω, sem refletor. ` +
        (withReflector
          // TODO(fonte): valor com o refletor.
          ? 'Com o refletor a 1/4 de onda a resistência de cada dipolo muda e este valor não vale; meça.'
          : 'Meça: o solo e os objetos próximos alteram esse valor.'),
    },
    {
      level: 'warning',
      message:
        'Os dipolos se cruzam no centro: isole um do outro (um fica levemente acima do outro, com isolador). Se os eixos não ' +
        'forem a 90° ou os braços diferirem, a polarização deixa de ser circular.',
    },
    {
      level: 'info',
      message:
        `Montagem para ${SENSE_NAME[sense]}, vista de baixo para cima (na direção do feixe): veja o método de montagem e o diagrama de polaridade. ` +
        'Satélites meteorológicos de 137 MHz usam polarização circular à direita (RHCP); confirme para o seu satélite. ' +
        (withReflector ? '' : 'Sem refletor a antena irradia também para baixo, e ali o sentido é o inverso. '),
    },
    {
      level: 'info',
      message:
        'Há outras formas de obter os 90° (divisor com defasador, ou dipolos de comprimentos diferentes, um indutivo e outro capacitivo; Kraus, via Wikipedia). ' +
        'Esta ferramenta calcula só a linha de 1/4 de onda.',
    },
    ...(withReflector
      ? [
          {
            level: 'info' as const,
            message: tubes
              ? 'Refletor de tubos (um alinhado com cada dipolo): o valor vem de um modelo por momentos desta ferramenta (sem medida). ' +
                `Com tubos de 0,5λ: ganho ≈ ${formatNumber(TUBE_STUDY[1]!.directivityDbi, 1)} dBi e relação frente–costas ≈ ${formatNumber(TUBE_STUDY[1]!.frontToBackDb, 0)} dB; ` +
                `com 0,45λ o tubo vira diretor (F/B ≈ ${formatNumber(TUBE_STUDY[0]!.frontToBackDb, 0)} dB) e com 0,55λ cai para ≈ ${formatNumber(TUBE_STUDY[3]!.frontToBackDb, 0)} dB. ` +
                `A chapa ou tela de 1λ dá ≈ ${formatNumber(REFLECTOR_STUDY[2]!.directivityDbi, 1)} dBi e ≈ ${formatNumber(REFLECTOR_STUDY[2]!.frontToBackDb, 0)} dB.`
              : 'Tamanho do refletor: não consta das fontes consultadas; o valor vem de um modelo por momentos desta ferramenta (tela de hastes, sem medida). ' +
                `No modelo, lado de 0,5λ dá relação frente–costas de ≈ ${formatNumber(REFLECTOR_STUDY[0]!.frontToBackDb, 0)} dB, 0,75λ de ≈ ${formatNumber(REFLECTOR_STUDY[1]!.frontToBackDb, 0)} dB e 1λ de ≈ ${formatNumber(REFLECTOR_STUDY[2]!.frontToBackDb, 0)} dB, ` +
                `com ganho de ≈ ${formatNumber(REFLECTOR_STUDY[2]!.directivityDbi, 1)} dBi em 1λ; acima disso não houve melhora estável. Confirme medindo.`,
          },
        ]
      : []),
    {
      level: 'danger',
      message:
        'Transmissão: as pontas dos dipolos ficam em tensão alta de RF e a linha de fase conduz corrente. Instale fora do alcance de pessoas e ' +
        'longe de rede elétrica, use choke no cabo e confira a potência máxima do coaxial. Estime a distância na ferramenta "Exposição a RF".',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      kAssumption(sf, 'dos dipolos'),
      { name: 'Diâmetro do condutor', value: `${formatNumber(d * 1000, 2)} mm` },
      { name: 'Espaço central de cada dipolo', value: `${formatNumber(gap * 1000, 1)} mm (dentro do comprimento total)`, source: 'Dado do usuário; comprimento de ponta a ponta, como no dipolo' },
      { name: 'Fator de velocidade do coaxial de fase (VF)', value: formatNumber(vf, 3), source: 'Dado do usuário; datasheet do cabo' },
      { name: 'Resistência de cada dipolo', value: `${DIPOLE_RESISTANCE_OHMS} Ω (espaço livre)`, source: 'Balanis, Antenna Theory, §4.6' },
      { name: 'Impedância da linha de fase', value: `${DIPOLE_RESISTANCE_OHMS} Ω (igual à do dipolo)`, source: 'Teoria de linhas de 1/4 de onda (Pozar)' },
      { name: 'Defasagem', value: '90° (linha de 1/4 de onda)', source: 'Wikipedia (Kraus; Brown, US 2.086.976)' },
      { name: 'Sentido da polarização', value: SENSE_NAME[sense], source: 'Dado do usuário; convenção IEEE Std 145 (ver core/polarization.ts)' },
      { name: 'Refletor', value: withReflector ? 'Plano, a 1/4 de onda atrás dos dipolos' : 'Sem refletor', source: 'Wikipedia (Milligan, 2005)' },
    ],
    expected: {
      // R ∥ (Z0²/R) fica perto de Z0/2 enquanto R não se afasta muito de Z0: o refletor muda R, mas pouco a junção. TODO(fonte): sem medida.
      impedance: {
        typical: modelFeed.feedImpedance.re,
        unit: 'Ω',
        note:
          `Cada dipolo, ajustado para ressoar, tem ≈ ${formatNumber(rModel, 0)} Ω no modelo` +
          (withReflector ? (tubes ? ' (com o tubo do refletor)' : ' (refletor como plano infinito)') : '') +
          `. A linha de 1/4 de onda de ${DIPOLE_RESISTANCE_OHMS} Ω inverte a impedância de um deles e a junção fica perto de ` +
          `${formatNumber(DIPOLE_RESISTANCE_OHMS / 2, 1)} Ω: ROE ≈ ${formatNumber(modelSwr50, 1)}:1 em 50 Ω.`,
        source:
          'Momentos desta ferramenta (dipolo conferido com Cebik); linha de 1/4 de onda (Pozar; Rothammel, §25.2.3: ≈ 30 Ω com 60 Ω)' +
          (withReflector && !tubes ? '; plano por imagens (Balanis)' : ''),
      },
      gain,
      bandwidth,
    },
    warnings,
    assembly: assemblyFor(sense),
  };
}

/** Método de montagem para o sentido pedido: qual braço vivo do dipolo atrasado fica no sentido horário ou anti-horário do vivo do direto. */
function assemblyFor(sense: Sense): AssemblyGuide {
  const right = sense === 'rhcp';
  return {
    title: `Montagem para ${SENSE_NAME[sense]}`,
    steps: [
      'Marque em cada dipolo qual braço vai ao condutor central do coaxial (braço vivo) e qual vai à malha. Os dois dipolos são idênticos.',
      'Dipolo 1 (direto): ligado direto na junção. Dipolo 2 (atrasado): ligado à junção pela linha de fase C, de 1/4 de onda.',
      `Fixe os dois dipolos cruzados a 90°, um levemente acima do outro. Olhando de BAIXO para CIMA (na direção do feixe), gire o dipolo 2 até que o braço vivo dele fique 90° no sentido ${right ? 'HORÁRIO' : 'ANTI-HORÁRIO'} do braço vivo do dipolo 1.`,
      `Visto de CIMA para baixo, é o inverso: o braço vivo do dipolo 2 fica 90° no sentido ${right ? 'ANTI-HORÁRIO' : 'HORÁRIO'} do vivo do dipolo 1.`,
      `Por quê: o campo gira do dipolo adiantado (1) para o atrasado (2); girando no sentido ${right ? 'horário' : 'anti-horário'} visto na direção do feixe, a onda é ${right ? 'RHCP' : 'LHCP'} (IEEE Std 145).`,
      `Para trocar para ${right ? 'LHCP' : 'RHCP'} sem refazer a montagem: inverta vivo e malha do dipolo 2 (ou troque qual dipolo recebe a linha C).`,
      // TODO(fonte): fonte pendente para o texto abaixo.
      'Confirme com um passe real: o sentido contrário perde muito sinal. Esta derivação não foi conferida com medida.',
    ],
  };
}

// TODO(fonte) [guide.md]: sem medida: «- **Ganho:** no zênite, ≈ 2,1 dBic sem refletor e ≈ 7,8 dBic com a tela de 1λ (modelo desta ferramenta)…»
// TODO(fonte) [guide.md]: fonte pendente: «- **Aviso importante:** esta ferramenta calcula os dipolos, a linha de fase e a distância …»
// TODO(fonte) [guide.md]: fonte pendente: «para o sentido que você escolher. Esta regra é derivada do atraso de fase, não de uma font…»
