/**
 * Contrato comum a todas as antenas (ver CLAUDE.md, "Contrato de cada antena").
 *
 * Cada antena exporta `meta` (descrição estática) e `calc(params)` (função pura
 * que transforma a entrada em medidas, premissas, valores esperados e avisos).
 */

/** Descrição de um parâmetro de entrada, usada pela UI para montar o formulário. */
export interface ParamSpec {
  key: string;
  label: string;
  /** Unidade exibida ao lado do campo (ex.: "MHz", "mm", "°"). */
  unit: string;
  defaultValue: number;
  /** Fator para converter o valor digitado para SI (ex.: mm → m = 0,001). */
  toSi: number;
  min?: number;
  max?: number;
  help?: string;
}

export interface AntennaMeta {
  id: string;
  name: string;
  description: string;
  /**
   * Faixa de uso prático, em MHz. É um critério de projeto desta ferramenta
   * (tamanho físico razoável, construção caseira viável), não um limite físico.
   */
  typicalRangeMHz: { min: number; max: number };
  nominalImpedanceOhms: number;
  polarization: string;
  /** Ganho aproximado em dBi (detalhes e fonte vêm em `calc().expected`). */
  approxGainDbi: number;
  usage: { rx: boolean; tx: boolean };
  /** Antena externa: o guia leva o bloco de segurança física (aterramento, rede elétrica). */
  outdoor: boolean;
  params: ParamSpec[];
}

/** Uma cota do diagrama/guia (A, B, C…). Comprimentos sempre em metros. */
export interface Measurement {
  /** Letra da cota, usada no diagrama e no passo a passo do guia. */
  label: string;
  name: string;
  meters: number;
  description: string;
}

/** Premissa usada no cálculo; a UI sempre mostra todas. */
export interface Assumption {
  name: string;
  value: string;
  source?: string;
}

/** Estimativa de uma grandeza (impedância, ganho, banda), com faixa e fonte. */
export interface Estimate {
  typical?: number;
  min?: number;
  max?: number;
  unit: string;
  note: string;
  source: string;
}

export type WarningLevel = 'info' | 'warning' | 'danger';

export interface CalcWarning {
  level: WarningLevel;
  message: string;
}

export interface CalcResult {
  measurements: Measurement[];
  assumptions: Assumption[];
  expected: {
    impedance: Estimate;
    gain: Estimate;
    /** `null` quando não há modelo confiável (regra do CLAUDE.md: não inventar). */
    bandwidth: Estimate | null;
  };
  warnings: CalcWarning[];
}

/** Aviso padrão quando a frequência está fora da faixa de uso prático da antena. */
export function rangeWarning(meta: AntennaMeta, fMHz: number): CalcWarning | null {
  const { min, max } = meta.typicalRangeMHz;
  if (fMHz < min || fMHz > max) {
    return {
      level: 'warning',
      message:
        `${fMHz} MHz está fora da faixa de uso prático desta antena (${min}–${max} MHz). ` +
        'O cálculo continua válido em princípio, mas a construção pode ser inviável ' +
        '(grande demais ou pequena demais para as tolerâncias de montagem).',
    };
  }
  return null;
}
