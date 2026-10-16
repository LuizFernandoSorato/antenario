/**
 * Constantes físicas, conversões de unidade e formatação pt-BR.
 *
 * Convenção do projeto: frequência entra em MHz, comprimentos são calculados
 * em metros e só são arredondados na exibição.
 */

/**
 * Velocidade da luz no vácuo, em m/s. Valor exato por definição do SI.
 * Fonte: BIPM, "The International System of Units (SI)", 9ª ed., 2019.
 */
export const SPEED_OF_LIGHT_M_PER_S = 299_792_458;

/**
 * Polegada internacional, em metros. Valor exato.
 * Fonte: International Yard and Pound Agreement, 1959.
 */
export const INCH_IN_METERS = 0.0254;

/**
 * Limite superior da faixa de HF, em MHz (HF = 3–30 MHz).
 * Fonte: ITU-R Recommendation V.431 (nomenclatura das faixas de frequência).
 * Usado só para escolher a resolução de exibição (cm em HF, mm acima).
 */
export const HF_UPPER_LIMIT_MHZ = 30;

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

/** Garante que o valor é um número finito e maior que zero. */
export function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} deve ser um número positivo (recebido: ${value}).`);
  }
}

/** Garante que a frequência (MHz) é válida. */
export function assertFrequencyMHz(fMHz: number): void {
  assertPositive(fMHz, 'A frequência (MHz)');
}

// ---------------------------------------------------------------------------
// Conversões
// ---------------------------------------------------------------------------

export function mhzToHz(fMHz: number): number {
  return fMHz * 1e6;
}

export function hzToMhz(fHz: number): number {
  return fHz / 1e6;
}

export function metersToCentimeters(m: number): number {
  return m * 100;
}

export function metersToMillimeters(m: number): number {
  return m * 1000;
}

export function metersToInches(m: number): number {
  return m / INCH_IN_METERS;
}

export function inchesToMeters(inches: number): number {
  return inches * INCH_IN_METERS;
}

// ---------------------------------------------------------------------------
// Decibéis e potência
// ---------------------------------------------------------------------------

/** Razão de potência → dB (10·log10). */
export function powerRatioToDb(ratio: number): number {
  return 10 * Math.log10(ratio);
}

/** dB → razão de potência. */
export function dbToPowerRatio(db: number): number {
  return 10 ** (db / 10);
}

/** Razão de tensão (ou corrente) → dB (20·log10), com impedâncias iguais. */
export function voltageRatioToDb(ratio: number): number {
  return 20 * Math.log10(ratio);
}

/** dB → razão de tensão (ou corrente), com impedâncias iguais. */
export function dbToVoltageRatio(db: number): number {
  return 10 ** (db / 20);
}

/** Potência em watts → dBm (referência: 1 mW). */
export function wattsToDbm(watts: number): number {
  return 10 * Math.log10(watts / 1e-3);
}

/** dBm → potência em watts. */
export function dbmToWatts(dbm: number): number {
  return 1e-3 * 10 ** (dbm / 10);
}

// ---------------------------------------------------------------------------
// Formatação e leitura de números (pt-BR)
// ---------------------------------------------------------------------------

const LOCALE = 'pt-BR';

/** Formata um número com vírgula decimal (pt-BR) e casas decimais fixas. */
export function formatNumber(value: number, decimals: number, useGrouping = true): string {
  if (!Number.isFinite(value)) {
    return value > 0 ? '∞' : value < 0 ? '−∞' : '—';
  }
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  }).format(value);
}

/** Remove zeros decimais à direita de um número já formatado: "36,50" → "36,5"; "73,00" → "73". */
export function trimZeros(formatted: string): string {
  return formatted.replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
}

/**
 * Lê um número digitado pelo usuário, aceitando vírgula ou ponto como
 * separador decimal ("145,5" ou "145.5"). Não aceita separador de milhar.
 * Retorna NaN se o texto não for um número válido.
 */
export function parseDecimal(text: string): number {
  const normalized = text.trim().replace(/\s+/g, '').replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) {
    return Number.NaN;
  }
  return Number(normalized);
}

/** Resolução de exibição de comprimentos. */
export type LengthResolution = 'mm' | 'cm';

/**
 * Resolução de exibição sugerida pela frequência: cm em HF (e abaixo),
 * mm em VHF/UHF e acima (regra do CLAUDE.md).
 */
export function lengthResolutionForFrequency(fMHz: number): LengthResolution {
  assertFrequencyMHz(fMHz);
  return fMHz <= HF_UPPER_LIMIT_MHZ ? 'cm' : 'mm';
}

/**
 * Formata um comprimento (em metros) para exibição, arredondando na
 * resolução pedida. Abaixo de 1 m mostra em mm ou cm; a partir de 1 m mostra
 * em metros com as casas decimais equivalentes à resolução.
 *
 * Exemplos: 0,5169 m → "517 mm" | "52 cm"; 2,0675 m → "2,068 m" | "2,07 m".
 */
export function formatLength(meters: number, resolution: LengthResolution): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError(`Comprimento inválido: ${meters}.`);
  }
  const decimalsInMeters = resolution === 'mm' ? 3 : 2;
  // Arredonda primeiro para decidir a unidade (evita "1000 mm" em vez de "1,000 m").
  const factor = 10 ** decimalsInMeters;
  const rounded = Math.round(meters * factor) / factor;
  if (rounded >= 1) {
    return `${formatNumber(rounded, decimalsInMeters, false)} m`;
  }
  return resolution === 'mm'
    ? `${formatNumber(metersToMillimeters(rounded), 0, false)} mm`
    : `${formatNumber(metersToCentimeters(rounded), 0, false)} cm`;
}

/** Exibição secundária em polegadas (opcional na UI). */
export function formatInches(meters: number, decimals = 2): string {
  return `${formatNumber(metersToInches(meters), decimals, false)} pol`;
}
