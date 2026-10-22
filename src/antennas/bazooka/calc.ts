/**
 * Double bazooka ("bazuca"): dipolo de meia onda cuja parte central é uma meia onda ELÉTRICA de coaxial.
 *
 * Geometria (C. Turner, ZS6GM, "The Great Double Bazooka Antenna Debate", https://www.zs6stn.org.za/ResourceArticles/Download/17,
 * descrevendo o ARRL Antenna Book, 20ª ed., 2003, p. 9.6–9.7, que não foi lido: TODO(fonte)):
 * - a malha é cortada no centro e o cabo de alimentação liga às duas metades da malha; o vivo segue inteiro;
 * - em cada ponta da seção, o vivo é soldado à malha: cada metade vira um toco de λ/4 em curto, por dentro do cabo,
 *   com comprimento físico λ/4 × VF (mesma regra em Ham Radio Base: (246/f) × VF pés);
 * - fios (ou linha) nas pontas completam o comprimento do dipolo de meia onda, L = K·λ/2 (CLAUDE.md).
 *
 * K vem do diâmetro (`k-factor.ts`), mas a antena mistura dois condutores: o coaxial (grosso) e os fios das pontas (finos). O modelo
 * de K é de condutor uniforme; como condutor mais fino pede K maior, o K do FIO dá o comprimento mais longo possível (lado seguro
 * para cortar) e o do coaxial, o mais curto. A ferramenta corta pelo do fio e mostra o outro como referência.
 *
 * Banda, impedância e perda nos tocos vêm do modelo em `feed-model.ts` (MoM + tocos com perda do datasheet).
 */

import { assertFrequencyMHz, assertPositive, formatNumber } from '../../core/units';
import { physicalLength, wavelength } from '../../core/wave';
import { type CoaxCable, coaxCables } from '../../data/coax-cables';
import { attenuationDbPer100m } from '../../lines/coax';
import { K_FIELD_NOTE, kAssumption, kWarning, shorteningFactorFor } from '../k-factor';
import { type CalcResult, type CalcWarning, type Estimate, type Measurement, rangeWarning } from '../types';
import { rangeText, widthText } from '../bandwidth';
import { type BazookaModel, SPAN, bandWidthMHz, bazookaModel } from './feed-model';
import { DEFAULT_CABLE, meta } from './meta';

const BAND_SPAN_PERCENT = SPAN * 100;

export interface BazookaParams {
  frequencyMHz: number;
  /** Índice do cabo em `coaxCables`. */
  cable: number;
  /** Fator de velocidade medido; 0 = o do datasheet. */
  velocityFactor: number;
  /** Trecho sem malha no centro, em metros. */
  centerGap: number;
  /** Diâmetro do fio das pontas, em metros; define o K. */
  wireDiameter: number;
}

export const defaultParams: BazookaParams = {
  frequencyMHz: 7.1,
  cable: DEFAULT_CABLE,
  velocityFactor: 0,
  centerGap: 0.01,
  wireDiameter: 0.002,
};

/** Impedância do cabo de alimentação usada como referência da ROE (rádio de 50 Ω). */
const FEED_OHMS = 50;

/** Modelo de alimentação (cacheado em `feed-model.ts`); os diagramas usam o mesmo. */
export function modelFor(f: number, cable: CoaxCable, vf: number): BazookaModel {
  return bazookaModel({
    frequencyMHz: f,
    radiusM: cable.outerDiameterMm / 2000,
    referenceOhms: FEED_OHMS,
    cable: {
      z0: cable.impedanceOhms,
      velocityFactor: vf,
      attenuationDbPerM: (x) => {
        const a = attenuationDbPer100m(cable, x);
        return a === null ? null : a / 100;
      },
    },
  });
}

export function calc(params: BazookaParams): CalcResult {
  const { frequencyMHz: f, cable: cableIndex, velocityFactor: vfInput, centerGap: gap, wireDiameter: wd } = params;
  assertFrequencyMHz(f);
  assertPositive(wd, 'O diâmetro do fio das pontas');
  const cable = Number.isInteger(cableIndex) ? coaxCables[cableIndex] : undefined;
  if (!cable) throw new RangeError(`Cabo inválido (índice ${cableIndex}).`);
  if (!Number.isFinite(vfInput) || vfInput < 0 || vfInput > 1) {
    throw new RangeError(`O fator de velocidade medido deve estar entre 0 e 1 (recebido: ${vfInput}).`);
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError(`O corte da malha deve ser ≥ 0 (recebido: ${gap}).`);
  }
  const vf = vfInput > 0 ? vfInput : cable.velocityFactor;

  const lambda = wavelength(f);
  const sf = shorteningFactorFor(wd, f);
  const sfCoax = shorteningFactorFor(cable.outerDiameterMm / 1000, f);
  const total = physicalLength(0.5, f, sf.k);
  const stub = physicalLength(0.25, f, vf);
  const coax = 2 * stub + gap;
  if (coax >= total) {
    throw new RangeError(
      `A seção de coaxial (${formatNumber(coax, 3)} m) ficou maior que a antena (${formatNumber(total, 3)} m): ` +
        `o fator de velocidade do cabo (${formatNumber(vf, 3)}) precisa ser menor que K (${formatNumber(sf.k, 3)}).`,
    );
  }
  const endWire = (total - coax) / 2;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Comprimento total', meters: total, description: 'De ponta a ponta: fio + seção de coaxial + fio.' },
    { label: 'B', name: 'Seção de coaxial', meters: coax, description: 'De um curto (vivo soldado na malha) ao outro, incluindo o corte da malha no centro.' },
    { label: 'C', name: 'Cada toco (1/4 de onda × VF)', meters: stub, description: 'Do corte da malha no centro até o curto na ponta. São dois iguais.' },
    { label: 'D', name: 'Cada fio da ponta', meters: endWire, description: 'Do curto na ponta do coaxial até a ponta da antena. É aqui que se ajusta.' },
  ];
  if (gap > 0) {
    measurements.push({ label: 'E', name: 'Corte da malha', meters: gap, description: 'Trecho sem malha no centro (o vivo e o dielétrico continuam).' });
  }

  const model = modelFor(f, cable, vf);
  const b2 = model.band2.bazooka;
  const d2 = model.band2.dipole;
  const unit: 'kHz' | 'MHz' = b2 && bandWidthMHz(b2) >= 1 ? 'MHz' : 'kHz';
  const ratio = b2 && d2 ? bandWidthMHz(b2) / bandWidthMHz(d2) : null;
  const lossPercent = (1 - 10 ** (-model.stubLossDb / 10)) * 100;
  const att = attenuationDbPer100m(cable, f);

  const modelSource =
    'Modelo desta ferramenta: método dos momentos (dipolo no espaço livre) em paralelo com os dois tocos com a perda do datasheet ' +
    '(Pozar §2.7). Comparação: ARRL Antenna Book, 20ª ed. (2003), p. 9.6–9.7, e F5AD, citados por ZS6GM.';

  const bandwidth: Estimate | null = b2
    ? {
        typical: bandWidthMHz(b2) * (unit === 'kHz' ? 1000 : 1),
        unit,
        // Antena ajustada para ressoar em f, no espaço livre; a altura e o solo mudam a resistência e, com ela, a banda.
        note:
          `ROE < 2:1 em 50 Ω ${rangeText(b2, BAND_SPAN_PERCENT)}; < 1,5:1 em ${widthText(model.band15.bazooka)}. ` +
          (ratio ? `${formatNumber(ratio, 2)}× a banda do dipolo de mesmo diâmetro. ` : '') +
          'Ajustada para ressoar, no espaço livre.',
        source: 'Momentos (dipolo) em paralelo com os tocos com a perda do datasheet (Pozar §2.7); compare: ARRL (2003) e F5AD, via ZS6GM',
      }
    : null;

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  const clampWarning = kWarning(sf, 'o fio das pontas');
  if (clampWarning) warnings.push(clampWarning);
  warnings.push({
    level: 'info',
    message:
      `${K_FIELD_NOTE} Aqui o K é o do fio das pontas (${formatNumber(sf.k, 4)}). Com tudo no diâmetro do ${cable.name}, K seria ` +
      `${formatNumber(sfCoax.k, 4)} (A = ${formatNumber(physicalLength(0.5, f, sfCoax.k), 2)} m): a antena real fica entre os dois, e a ` +
      'diferença sai no ajuste dos fios D.',
  });
  if (!model.lossKnown) {
    warnings.push({
      level: 'warning',
      message:
        `A tabela de atenuação do ${cable.name} não cobre ${formatNumber(f, 3)} MHz (ou parte da varredura em volta). ` +
        'Os tocos foram calculados sem perdas: a banda real fica um pouco maior e a perda nos tocos não pôde ser estimada.',
    });
  }
  if (vfInput === 0 && (cable.id === 'belden-8259' || cable.id === 'belden-8240')) {
    warnings.push({
      level: 'info',
      message:
        'RG-58 genérico pode ter dielétrico de espuma (VF ≈ 0,78) em vez de polietileno sólido (0,66). Confira o seu cabo: ' +
        'se o VF for outro, os tocos mudam de tamanho.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'Os tocos (C) são cortados na medida e não se mexem depois: o ajuste da ressonância é feito nos fios das pontas (D), ' +
        'como num dipolo comum. Por isso o VF REAL do cabo importa: com o VF errado, os tocos não ficam com 1/4 de onda.',
    },
    {
      level: 'info',
      message:
        'Mesmo com os tocos, use um choke (balun de corrente 1:1) no ponto de alimentação. A ideia de que a bazooka dispensa ' +
        'o balun não se confirma (F5AD e ZS6GM): ela é simétrica como qualquer dipolo, e o coaxial de alimentação não é.',
    },
    {
      level: 'info',
      message:
        'Comparada a um dipolo de fio, a bazooka não ganha nada em ganho ou padrão (ARRL Antenna Book) e alarga pouco a banda; ' +
        'parte do alargamento vem da própria perda nos tocos (W2DU). É mais pesada e tem mais emendas para vedar.',
    },
    {
      level: 'danger',
      message:
        'Transmissão: as pontas dos fios (D) ficam em tensão alta de RF. Mantenha-as fora do alcance de pessoas e use isoladores ' +
        `adequados. Os tocos dissipam ≈ ${formatNumber(lossPercent, 1)} % da potência na frequência de projeto (modelo); vede bem ` +
        'os curtos das pontas, porque água dentro do coaxial aumenta essa perda.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 4)} m`, source: 'λ = 299,792458 / f(MHz)' },
      kAssumption(sf, 'pelo fio das pontas'),
      { name: 'Fio das pontas', value: `${formatNumber(wd * 1000, 2)} mm` },
      { name: 'Cabo', value: `${cable.name}, ${formatNumber(cable.impedanceOhms, 0)} Ω, Ø ${formatNumber(cable.outerDiameterMm, 2)} mm`, source: cable.source.document },
      {
        name: 'Fator de velocidade (VF)',
        value: formatNumber(vf, 3),
        source: vfInput > 0 ? 'Medido pelo usuário' : `Datasheet do ${cable.name}`,
      },
      { name: 'Toco', value: 'λ/4 × VF, em curto na ponta (vivo soldado na malha)', source: 'ZS6GM (ARRL Antenna Book); Ham Radio Base' },
      {
        name: 'Atenuação do cabo na frequência',
        value: att === null ? 'fora da tabela (toco sem perdas no modelo)' : `${formatNumber(att, 2)} dB/100 m`,
        source: `Datasheet do ${cable.name}, interpolado`,
      },
      {
        name: 'Modelo da banda',
        value:
          `Dipolo ajustado para ressoar em ${formatNumber(f, 3)} MHz (no modelo: ${formatNumber(model.resonantLengthLambda, 3)}λ), ` +
          'com o fio todo do diâmetro externo do coaxial, no espaço livre; ROE em relação a 50 Ω',
        source: 'core/mom.ts e lines/transmission-line.ts',
      },
    ],
    expected: {
      impedance: {
        typical: model.zBazooka.re,
        unit: 'Ω',
        note:
          `Na ressonância, os tocos de 1/4 de onda quase não aparecem (impedância alta) e a entrada fica perto da do dipolo ` +
          `(${formatNumber(model.zDipole.re, 1)} Ω no modelo). Com coaxial de 50 Ω, ROE ≈ 1,4:1. Muda com a altura acima do solo.`,
        source: 'Balanis, Antenna Theory, 4ª ed., §4.6 (dipolo); ' + modelSource,
      },
      gain: {
        typical: 2.15 - model.stubLossDb,
        unit: 'dBi',
        note:
          `Ganho do dipolo de meia onda (2,15 dBi) menos a perda nos tocos (${formatNumber(model.stubLossDb, 2)} dB na frequência ` +
          `de projeto, até ${formatNumber(model.stubLossMaxDb, 2)} dB na borda da faixa de 2:1). No espaço livre; perdas no fio desprezadas.`,
        source: 'Balanis §4.6; ARRL Antenna Book (2003), citado por ZS6GM: sem ganho sobre o dipolo de fio; ' + modelSource,
      },
      bandwidth,
    },
    warnings,
  };
}
