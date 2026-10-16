/**
 * Loop magnética (espira pequena, 1 volta, circular, de cobre) sintonizada por capacitor.
 *
 * Fórmulas:
 * - Resistência de radiação: Rr = 31171·(A/λ²)², forma padrão da espira pequena de 1 volta (por exemplo
 *   em Kraus & Marhefka, *Antennas for All Applications*). O modelo AA5TB, 3,38×10⁻⁸·(f²·A)² com A em pés² e f em MHz
 *   (S. Sussman-Fort, AB2EW, "My Loop Antenna", 2013, slide 18), dá o mesmo valor com diferença < 2 %.
 * - Resistência de perda: só o efeito pelicular, Rs·S/(π·d), com Rs = √(π·f·μ0/σ) e σ = 5,8×10⁷ S/m
 *   (cobre recozido padrão IACS). O AA5TB (slide 18) usa 9,96×10⁻⁴·√f·S/d (pés e polegadas): igual a 0,2 %.
 *   A resistência de contatos e emendas é somada à perda (AA5TB, slide 19): é um dado do usuário.
 * - Indutância de um anel circular de raio R e fio de raio a: L = μ0·R·(ln(8R/a) − 2) (Grover, *Inductance
 *   Calculations*, 1946, anel circular, a ≪ R). O AA5TB (slide 18) dá o mesmo valor com diferença < 3 %.
 * - Capacitância própria da espira: 0,82·S pF, S em pés (AA5TB, slide 18).
 * - Q carregado e largura de banda: AA5TB (slide 18): Q = XL/(2·(Rr+RL)), Δf = f/Q. A banda de ROE < 2:1
 *   (ver `swr2Bandwidth`) é derivada da teoria de circuito RLC série e checada em teste contra o Γ numérico.
 * - Espira "pequena": perímetro < ≈ 0,1λ; ganho ideal em espaço livre de 1,76 dBi (Owen Duffy, calculadora de
 *   espira pequena, https://owenduffy.net).
 */

import { assertFrequencyMHz, assertPositive, formatEngineering, formatNumber, powerRatioToDb } from '../../core/units';
import { wavelength } from '../../core/wave';
import { type CalcResult, type CalcWarning, type Measurement, rangeWarning } from '../types';
import { meta } from './meta';

export interface MagneticLoopParams {
  frequencyMHz: number;
  /** Diâmetro da espira, centro a centro do tubo, em metros. */
  loopDiameter: number;
  /** Diâmetro do tubo condutor, em metros. */
  tubeDiameter: number;
  /** Resistência de contatos e emendas, em ohms. */
  contactResistance: number;
  /** Potência de transmissão, em watts. */
  powerW: number;
}

export const defaultParams: MagneticLoopParams = {
  frequencyMHz: 7.1,
  loopDiameter: 1,
  tubeDiameter: 0.022,
  contactResistance: 0,
  powerW: 10,
};

const MU0 = 4e-7 * Math.PI;
/** Condutividade do cobre recozido padrão (IACS), S/m. */
export const COPPER_CONDUCTIVITY = 5.8e7;
/** Limite de "espira pequena": perímetro/λ (Owen Duffy, calculadora de espira pequena). */
export const SMALL_LOOP_LIMIT = 0.1;
const FT_IN_METERS = 0.3048;

/** Resistência de radiação Rr = 31171·(A/λ²)² de uma espira de 1 volta (Kraus & Marhefka). */
export function radiationResistance(area: number, lambda: number): number {
  return 31171 * (area / (lambda * lambda)) ** 2;
}

/** Resistência de superfície do cobre, em Ω/quadrado: √(π·f·μ0/σ). */
export function surfaceResistance(fMHz: number): number {
  return Math.sqrt((Math.PI * fMHz * 1e6 * MU0) / COPPER_CONDUCTIVITY);
}

/** Resistência de perda pelicular: Rs·S/(π·d), S = comprimento do condutor, d = diâmetro do tubo. */
export function skinLossResistance(fMHz: number, conductorLength: number, tubeDiameter: number): number {
  return (surfaceResistance(fMHz) * conductorLength) / (Math.PI * tubeDiameter);
}

/** Indutância de um anel circular de raio R com fio de raio a (a ≪ R): μ0·R·(ln(8R/a) − 2). */
export function loopInductance(loopRadius: number, tubeRadius: number): number {
  return MU0 * loopRadius * (Math.log((8 * loopRadius) / tubeRadius) - 2);
}

/** Largura de banda de ROE < 2:1 (Hz) com a espira casada no centro: ≈ 0,707·f/Qu, Qu = XL/(Rr+RL). */
export function swr2Bandwidth(frequencyHz: number, reactance: number, totalResistance: number): number {
  return (Math.SQRT1_2 * frequencyHz * totalResistance) / reactance;
}

export function calc(params: MagneticLoopParams): CalcResult {
  const { frequencyMHz: f, loopDiameter: dLoop, tubeDiameter: dTube, contactResistance: rContact, powerW: power } = params;
  assertFrequencyMHz(f);
  assertPositive(dLoop, 'O diâmetro da espira');
  assertPositive(dTube, 'O diâmetro do tubo');
  if (!Number.isFinite(rContact) || rContact < 0) {
    throw new RangeError(`A resistência de contatos deve ser ≥ 0 (recebido: ${rContact}).`);
  }
  if (!Number.isFinite(power) || power < 0) {
    throw new RangeError(`A potência deve ser ≥ 0 (recebido: ${power}).`);
  }
  if (dTube >= dLoop) {
    throw new RangeError('O diâmetro do tubo deve ser bem menor que o da espira.');
  }

  const lambda = wavelength(f);
  const radius = dLoop / 2;
  const circumference = Math.PI * dLoop;
  const area = Math.PI * radius * radius;
  const rr = radiationResistance(area, lambda);
  const rSkin = skinLossResistance(f, circumference, dTube);
  const rLoss = rSkin + rContact;
  const rTotal = rr + rLoss;
  const efficiency = rr / rTotal;
  const inductance = loopInductance(radius, dTube / 2);
  const omega = 2 * Math.PI * f * 1e6;
  const xl = omega * inductance;
  const cTotal = 1 / (omega * omega * inductance);
  const cSelf = 0.82e-12 * (circumference / FT_IN_METERS); // 0,82 pF por pé de condutor (AA5TB)
  const qLoaded = xl / (2 * rTotal);
  const bw3dB = (f * 1e6) / qLoaded;
  const bwSwr2 = swr2Bandwidth(f * 1e6, xl, rTotal);
  const current = Math.sqrt(power / rTotal);
  const capVoltage = current * xl; // tensão no capacitor: I·XC, com XC = XL na ressonância
  const gainDbi = 1.76 + powerRatioToDb(efficiency);
  const ratio = circumference / lambda;

  const measurements: Measurement[] = [
    { label: 'A', name: 'Diâmetro da espira', meters: dLoop, description: 'Centro a centro do tubo.' },
    { label: 'B', name: 'Comprimento do condutor', meters: circumference, description: 'Perímetro da espira: comprimento de tubo (ou coaxial) a cortar.' },
    { label: 'C', name: 'Loop de acoplamento (diâmetro)', meters: dLoop / 5, description: 'Regra prática de ≈ 1/5 do diâmetro da espira principal. TODO(fonte): ajustar medindo a ROE.' },
  ];

  const warnings: CalcWarning[] = [];
  const outOfRange = rangeWarning(meta, f);
  if (outOfRange) warnings.push(outOfRange);
  if (ratio > SMALL_LOOP_LIMIT) {
    warnings.push({
      level: 'warning',
      message:
        `O perímetro é ${formatNumber(ratio, 3)}λ, acima de ≈ 0,1λ. Para espiras maiores que isso as fórmulas de espira pequena ` +
        '(corrente uniforme) deixam de valer: a eficiência e a indutância calculadas ficam imprecisas.',
    });
  }
  if (efficiency < 0.1) {
    warnings.push({
      level: 'warning',
      message:
        `A eficiência calculada é de apenas ${formatNumber(efficiency * 100, 1)} %: a maior parte da potência vira calor no condutor. ` +
        'Use tubo mais grosso, um diâmetro maior ou frequência mais alta, e solde bem todos os contatos.',
    });
  }
  warnings.push(
    {
      level: 'warning',
      message:
        'A resistência de radiação é minúscula; qualquer solda ruim ou contato oxidado soma resistência e derruba a eficiência. ' +
        (rContact === 0
          ? 'Com contatos = 0 o cálculo é um limite ideal: a eficiência real é menor. Meça a banda de ROE 2:1 e ajuste o valor de contatos.'
          : 'Ajuste o valor de contatos até a banda calculada bater com a medida.'),
    },
    {
      level: 'warning',
      message:
        'Os valores de Q e de largura de banda de projeto costumam diferir dos medidos. Use-os como ordem de grandeza.',
    },
    {
      level: 'info',
      message:
        'Instale a espira de pé, longe de metais e com a parte de baixo a pelo menos um diâmetro do chão. Alimente por um loop ' +
        'de acoplamento (cota C), que fica na parte oposta ao capacitor, ou por um casamento tipo gamma. Use choke de corrente.',
    },
    {
      level: 'danger',
      message:
        `Transmissão: com ${formatNumber(power, 0)} W a tensão no capacitor chega a ${formatEngineering(capVoltage, 'V')} e a corrente na espira a ` +
        `${formatEngineering(current, 'A')}. Use capacitor de ALTA tensão (vácuo ou borboleta de placas bem espaçadas), nunca ` +
        'toque na espira durante a transmissão e mantenha pessoas afastadas. A tensão do capacitor sobe com a raiz da ' +
        'potência.',
    },
  );

  return {
    measurements,
    assumptions: [
      { name: 'Comprimento de onda (λ)', value: `${formatNumber(lambda, 3)} m (perímetro = ${formatNumber(ratio, 3)}λ)`, source: 'λ = 299,792458 / f(MHz)' },
      { name: 'Resistência de radiação (Rr)', value: formatEngineering(rr, 'Ω'), source: '31171·(A/λ²)² (forma padrão); AA5TB slide 18' },
      { name: 'Resistência de perda pelicular', value: formatEngineering(rSkin, 'Ω'), source: 'Cobre, σ = 5,8×10⁷ S/m; AA5TB slide 18' },
      { name: 'Resistência de contatos', value: formatEngineering(rContact, 'Ω'), source: 'Dado do usuário; AA5TB slide 19' },
      { name: 'Eficiência (Rr/(Rr+RL))', value: `${formatNumber(efficiency * 100, 1)} %`, source: 'AA5TB slide 18' },
      { name: 'Indutância (L)', value: formatEngineering(inductance, 'H'), source: 'Grover: μ0·R·(ln(8R/a) − 2); AA5TB slide 18' },
      { name: 'Reatância indutiva (XL)', value: formatEngineering(xl, 'Ω') },
      { name: 'Capacitância total para a ressonância', value: formatEngineering(cTotal, 'F'), source: 'C = 1/(ω²·L)' },
      { name: 'Capacitância própria da espira', value: formatEngineering(cSelf, 'F'), source: 'AA5TB slide 18: 0,82 pF por pé de condutor. O capacitor variável é a diferença.' },
      { name: 'Q carregado', value: formatNumber(qLoaded, 0), source: 'AA5TB slide 18: XL/(2·(Rr+RL))' },
      { name: 'Banda de -3 dB (f/Q)', value: formatEngineering(bw3dB, 'Hz'), source: 'AA5TB slide 18: Δf = f/Q' },
      { name: 'Banda de ROE < 2:1 (espira casada)', value: formatEngineering(bwSwr2, 'Hz'), source: 'Derivada de RLC série: 0,707·f·(Rr+RL)/XL' },
      { name: `Corrente na espira (${formatNumber(power, 0)} W)`, value: formatEngineering(current, 'A'), source: '√(P/(Rr+RL))' },
      { name: 'Tensão no capacitor', value: formatEngineering(capVoltage, 'V'), source: 'I·XC. O AA5TB, slide 18, usa √(P·XL·Q): menor por √2' },
    ],
    expected: {
      impedance: {
        typical: rTotal,
        unit: 'Ω',
        note: 'Resistência total da espira (radiação + perda) na ressonância: valor minúsculo. O acoplamento (loop ou gamma) a transforma em 50 Ω.',
        source: 'Soma Rr + RL; fontes nas premissas',
      },
      gain: {
        typical: gainDbi,
        unit: 'dBi',
        note: 'Diretividade ideal de 1,76 dBi menos a perda por ineficiência. No solo real, o ganho é diferente. Meça.',
        source: 'Duffy (1,76 dBi); eficiência de AA5TB',
      },
      bandwidth: {
        typical: bwSwr2,
        unit: 'Hz',
        note: 'Banda de ROE < 2:1 com a espira casada no centro. É muito estreita: reajuste o capacitor ao mudar de frequência.',
        source: 'RLC série; checada em teste contra o Γ numérico',
      },
    },
    warnings,
  };
}
