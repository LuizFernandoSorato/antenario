/**
 * Texto da largura de banda de ROE (seção "Valores esperados") a partir de uma varredura de `core/swr-band.ts`.
 */

import { matchedFractionalBandwidth } from '../core/q-bandwidth';
import { type SwrBand, type SwrSweep, bandWidthMHz } from '../core/swr-band';
import { formatNumber } from '../core/units';
import type { Estimate } from './types';

export interface SwrEstimateOptions {
  /** Onde a ROE é medida, para o texto: "em 50 Ω", "no cabo de 50 Ω, com casamento ideal"… */
  reference: string;
  /** Meia largura da varredura, em % (para o aviso de faixa aberta). */
  spanPercent: number;
  /** Premissas do modelo, completando o texto. */
  note: string;
  source: string;
}

function unitFor(band: SwrBand | null): 'kHz' | 'MHz' {
  return band && bandWidthMHz(band) >= 1 ? 'MHz' : 'kHz';
}

export function bandText(band: SwrBand | null, unit: 'kHz' | 'MHz', spanPercent: number): string {
  if (!band) return 'não chega lá';
  const k = unit === 'kHz' ? 1000 : 1;
  const d = unit === 'kHz' ? 0 : 2;
  const open = band.open ? ` (ou mais: passou da varredura de ±${formatNumber(spanPercent, 0)} %)` : '';
  return `${formatNumber(bandWidthMHz(band) * k, d)} ${unit}, de ${formatNumber(band.lowMHz, 3)} a ${formatNumber(band.highMHz, 3)} MHz${open}`;
}

/** Estimativa de banda de ROE < 2:1; sem valor típico quando o modelo não chega a 2:1. */
export function swrBandwidthEstimate(s: SwrSweep, options: SwrEstimateOptions): Estimate {
  const { reference, spanPercent, note, source } = options;
  const b2 = s.band2;
  if (!b2) {
    return {
      unit: 'MHz',
      note:
        `No modelo, a menor ROE ${reference} é ${formatNumber(s.minSwr, 1)}:1 (em ${formatNumber(s.minAtMHz, 3)} MHz): não chega a 2:1 sem ` +
        `casamento. ${note}`,
      source,
    };
  }
  const unit = unitFor(b2);
  return {
    typical: bandWidthMHz(b2) * (unit === 'kHz' ? 1000 : 1),
    unit,
    note: `ROE < 2:1 ${reference}: ${bandText(b2, unit, spanPercent)}. ROE < 1,5:1: ${bandText(s.band15, unit, spanPercent)}. ${note}`,
    source,
  };
}

export interface QEstimateOptions {
  /** Onde a ROE é medida, para o texto: "com casamento ideal para 20 Ω"… */
  reference: string;
  note: string;
  source: string;
}

/** Estimativa de banda pelo Q (core/q-bandwidth.ts): (S − 1)/(Q·√S), simétrica em volta de f0. */
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
      `ROE < 2:1 ${options.reference}: ≈ ${formatNumber(b2 * k, d)} ${unit} (≈ ${formatNumber(f0MHz - b2 / 2, 3)} a ` +
      `${formatNumber(f0MHz + b2 / 2, 3)} MHz). ROE < 1,5:1: ≈ ${formatNumber(b15 * k, d)} ${unit}. ${options.note}`,
    source: options.source,
  };
}
