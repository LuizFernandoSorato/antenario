/**
 * Fator de encurtamento K pelo diâmetro do condutor, para todas as antenas com elementos de meia onda (ou monopolos de λ/4).
 *
 * K vem do modelo do dipolo reto no espaço livre (`core/dipole-resonance.ts`). Fora da faixa do modelo, usa o K do limite:
 * - condutor mais grosso que o limite: o K real é menor (K cai com o diâmetro), então o do limite dá a antena um pouco
 *   COMPRIDA, o lado seguro para cortar e ajustar;
 * - condutor mais fino que o limite (só fios de centésimos de mm em HF): o K real é um pouco maior, e a antena sai curta
 *   por menos de 0,1 %.
 */

import {
  DIPOLE_K_MAX_DIAMETER_LAMBDA,
  DIPOLE_K_MIN_DIAMETER_LAMBDA,
  dipoleShorteningFactor,
} from '../core/dipole-resonance';
import { formatEngineering, formatNumber } from '../core/units';
import { wavelength } from '../core/wave';
import type { Assumption, CalcWarning } from './types';

export interface ShorteningFactor {
  k: number;
  /** Diâmetro do condutor em λ. */
  diameterLambda: number;
  /** 'thick' ou 'thin' quando o diâmetro saiu da faixa do modelo e K é o do limite. */
  clamped: 'thick' | 'thin' | null;
}

export const K_SOURCE =
  'Método dos momentos desta ferramenta (core/dipole-resonance.ts): dipolo reto no espaço livre, conferido com a Fig 8 do ' +
  'ARRL Antenna Book, 21ª ed., p. 2-5 (0,3 %) e com o NEC-4 de L. B. Cebik, W4RNL (0,12 %)';

/**
 * Aviso comum: o K do modelo é de condutor nu no espaço livre. Cita a divergência com o Rothammel ("Antene", trad. sérvia da 9ª ed.
 * alemã, Fig. 3.7, p. 39–40: V = 0,955 com λ/d = 80, 0,964 com λ/d = 200), de 1,3 a 2,8 % acima do modelo e do ARRL. Decisão do
 * usuário (2026-10-28): manter o modelo e citar o Rothammel na nota.
 */
export const K_FIELD_NOTE =
  'O fator K vem do diâmetro do condutor, para condutor nu no espaço livre (confere com o ARRL Antenna Book). O Rothammel dá ' +
  'K de 1 a 3 % maior; isolamento plástico, solo próximo e isoladores encurtam a antena real. Corte com sobra (≈ 3 %) e ' +
  'encurte medindo a ROE.';

export function shorteningFactorFor(diameterM: number, frequencyMHz: number): ShorteningFactor {
  const diameterLambda = diameterM / wavelength(frequencyMHz);
  const clamped =
    diameterLambda > DIPOLE_K_MAX_DIAMETER_LAMBDA ? 'thick' : diameterLambda < DIPOLE_K_MIN_DIAMETER_LAMBDA ? 'thin' : null;
  const inRange = Math.min(DIPOLE_K_MAX_DIAMETER_LAMBDA, Math.max(DIPOLE_K_MIN_DIAMETER_LAMBDA, diameterLambda));
  return { k: dipoleShorteningFactor(inRange), diameterLambda, clamped };
}

/** Premissa "Fator de encurtamento (K)" para a tela. `what` diz a que elemento o K se aplica (ex.: "do radiador"). */
export function kAssumption(sf: ShorteningFactor, what = ''): Assumption {
  const name = `Fator de encurtamento${what ? ` ${what}` : ''} (K)`;
  const note = sf.clamped ? ', do limite do modelo' : '';
  return {
    name,
    value: `${formatNumber(sf.k, 4)}, pelo diâmetro (${formatEngineering(sf.diameterLambda, 'λ')}${note})`,
    source: K_SOURCE,
  };
}

/** Aviso quando o diâmetro saiu da faixa do modelo; null dentro dela. */
export function kWarning(sf: ShorteningFactor, what = 'o condutor'): CalcWarning | null {
  if (sf.clamped === 'thick') {
    return {
      level: 'warning',
      message:
        `${capitalize(what)} tem ${formatEngineering(sf.diameterLambda, 'λ')} de diâmetro, acima do limite do modelo de K ` +
        `(${formatEngineering(DIPOLE_K_MAX_DIAMETER_LAMBDA, 'λ')}, ou seja, λ/2d < ${formatNumber(0.5 / DIPOLE_K_MAX_DIAMETER_LAMBDA, 0)}). ` +
        `Foi usado o K do limite (${formatNumber(sf.k, 4)}): como condutor mais grosso pede K menor, a medida sai um pouco ` +
        'comprida. Corte assim e encurte medindo a ROE.',
    };
  }
  if (sf.clamped === 'thin') {
    return {
      level: 'info',
      message:
        `${capitalize(what)} tem ${formatEngineering(sf.diameterLambda, 'λ')} de diâmetro, abaixo da faixa do modelo de K. ` +
        `Foi usado o K do limite (${formatNumber(sf.k, 4)}); a diferença é menor que 0,1 %.`,
    };
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
