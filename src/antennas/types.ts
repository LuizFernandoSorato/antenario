/**
 * Contrato comum a todas as antenas (ver CLAUDE.md, "Contrato de cada antena").
 *
 * Cada antena exporta `meta` (descrição estática) e `calc(params)` (função pura
 * que transforma a entrada em medidas, premissas, valores esperados e avisos).
 */

/** Uma opção de um campo de escolha (botões de opção). `value` é o valor numérico que chega ao cálculo. */
export interface ParamOption {
  value: number;
  label: string;
}

/**
 * Descrição de um parâmetro de entrada, usada pela UI para montar o formulário.
 *
 * `kind`: 'number' (padrão) = campo de texto numérico; 'boolean' = caixa de seleção (o cálculo recebe 1 marcada, 0 desmarcada,
 * mas a tela nunca mostra 0 ou 1); 'choice' = botões de opção, um por item de `options` (o cálculo recebe o `value` da opção).
 */
export interface ParamSpec {
  key: string;
  kind?: 'number' | 'boolean' | 'choice';
  /** Só para kind = 'choice': as opções, na ordem em que aparecem. `defaultValue` é o `value` da opção marcada. */
  options?: ParamOption[];
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
  /**
   * Ganho aproximado em dBi (detalhes e fonte vêm em `calc().expected`).
   * `null` quando não há um valor típico com fonte confiável.
   */
  approxGainDbi: number | null;
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
  /** Método de montagem que depende da entrada (por exemplo, o sentido da polarização circular); a UI mostra como seção própria. */
  assembly?: AssemblyGuide;
}

/** Passo a passo de montagem específico da configuração escolhida. */
export interface AssemblyGuide {
  title: string;
  steps: string[];
}

/** Peça a cortar para a folha de corte. */
export interface CutItem {
  /** Cota do diagrama (A, B, C…) a que a peça corresponde. */
  label: string;
  name: string;
  quantity: number;
  /** Medida nominal calculada, em metros. */
  meters: number;
  /**
   * Peça que será ajustada medindo a ROE: deve ser cortada com sobra e encurtada aos
   * poucos (ver guia). Peças fixas (radiais, ligações) são cortadas na medida.
   */
  adjustable: boolean;
  note?: string;
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
