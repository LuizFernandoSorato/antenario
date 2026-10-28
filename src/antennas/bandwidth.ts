/**
 * Texto da largura de banda de ROE (seção "Valores esperados") a partir de uma varredura (`core/swr-band.ts`) ou do Q
 * (`core/q-bandwidth.ts`). Os textos são curtos de propósito: os três cartões de valores esperados ficam lado a lado na tela
 * (o teste do registro limita o tamanho). A explicação longa de cada modelo fica nos comentários do código e no CLAUDE.md.
 */

import { matchedFractionalBandwidth } from '../core/q-bandwidth';
import { type SwrBand, type SwrSweep, bandWidthMHz } from '../core/swr-band';
import { formatNumber } from '../core/units';
import type { Estimate } from './types';

/** Tamanho máximo da nota e da fonte de uma estimativa de banda (caracteres), conferido no teste do registro. */
export const MAX_NOTE_LENGTH = 240;
export const MAX_SOURCE_LENGTH = 180;

export interface SwrEstimateOptions {
  /** Onde a ROE é medida, para o texto: "em 50 Ω"… */
  reference: string;
  /** Meia largura da varredura, em % (para o aviso de faixa aberta). */
  spanPercent: number;
  /** Premissa principal do modelo, em uma frase curta. */
  note: string;
  source: string;
}

function unitFor(band: SwrBand | null): 'kHz' | 'MHz' {
  return band && bandWidthMHz(band) >= 1 ? 'MHz' : 'kHz';
}

/** "de 139,718 a 149,663 MHz", com "(ou mais)" quando a faixa passou da varredura. */
export function rangeText(band: SwrBand, spanPercent: number): string {
  const open = band.open ? ` (ou mais; varredura de ±${formatNumber(spanPercent, 0)} %)` : '';
  return `de ${formatNumber(band.lowMHz, 3)} a ${formatNumber(band.highMHz, 3)} MHz${open}`;
}

/** "3,21 MHz" ou "140 kHz"; "não chega" sem faixa. */
export function widthText(band: SwrBand | null): string {
  if (!band) return 'não chega';
  const unit = unitFor(band);
  return unit === 'kHz' ? `${formatNumber(bandWidthMHz(band) * 1000, 0)} kHz` : `${formatNumber(bandWidthMHz(band), 2)} MHz`;
}

/** Frase da faixa de polarização circular das antenas cruzadas (quadrature-feed.ts), para a nota da banda. */
export function axialText(band: SwrBand | null, spanPercent: number): string {
  return band
    ? `Polarização circular (razão axial < 3 dB) só ${rangeText(band, spanPercent)}: fora disso a fase da linha sai de 90°.`
    : 'A razão axial não fica abaixo de 3 dB no modelo.';
}

/** Estimativa de banda de ROE < 2:1; sem valor típico quando o modelo não chega a 2:1. */
export function swrBandwidthEstimate(s: SwrSweep, options: SwrEstimateOptions): Estimate {
  const { reference, spanPercent, note, source } = options;
  const b2 = s.band2;
  if (!b2) {
    return {
      unit: 'MHz',
      note: `Não chega a ROE 2:1 ${reference} sem casamento (mínima ${formatNumber(s.minSwr, 1)}:1). ${note}`,
      source,
    };
  }
  const unit = unitFor(b2);
  return {
    typical: bandWidthMHz(b2) * (unit === 'kHz' ? 1000 : 1),
    unit,
    note: `ROE < 2:1 ${reference} ${rangeText(b2, spanPercent)}; < 1,5:1 em ${widthText(s.band15)}. ${note}`,
    source,
  };
}

export interface QEstimateOptions {
  /** Como a antena é casada em f0, no início do texto; padrão: "Com casamento ideal". */
  match?: string;
  /** Premissa principal, em uma frase curta. */
  note: string;
  source: string;
}

/** Estimativa de banda pelo Q (core/q-bandwidth.ts): (S − 1)/(Q·√S), simétrica em volta de f0, com casamento ideal em f0. */
export function qBandwidthEstimate(f0MHz: number, q: number, options: QEstimateOptions): Estimate {
  const b2 = matchedFractionalBandwidth(q, 2) * f0MHz;
  const b15 = matchedFractionalBandwidth(q, 1.5) * f0MHz;
  const unit: 'kHz' | 'MHz' = b2 >= 1 ? 'MHz' : 'kHz';
  const k = unit === 'kHz' ? 1000 : 1;
  const d = unit === 'kHz' ? 0 : 2;
  return {
    typical: b2 * k,
    unit,
    note:
      `${options.match ?? 'Com casamento ideal'}, ROE < 2:1 de ≈ ${formatNumber(f0MHz - b2 / 2, 3)} a ${formatNumber(f0MHz + b2 / 2, 3)} MHz; ` +
      `< 1,5:1 em ≈ ${formatNumber(b15 * k, d)} ${unit}. ${options.note}`,
    source: options.source,
  };
}
