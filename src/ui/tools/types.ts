/**
 * Contrato das ferramentas (calculadoras de cabo e casamento).
 *
 * A física fica em src/lines e src/matching (funções puras testadas); cada
 * ferramenta só traduz a entrada do formulário e formata a saída.
 */

import type { Diagram } from '../../antennas/diagram-kit';
import type { Assumption, CalcWarning } from '../../antennas/types';
import type { CoaxCable } from '../../data/coax-cables';
import { coaxCables } from '../../data/coax-cables';

export type FieldSpec =
  | {
      kind: 'number';
      key: string;
      label: string;
      unit: string;
      defaultValue: number;
      help?: string;
    }
  | {
      kind: 'select';
      key: string;
      label: string;
      defaultValue: string;
      options: { value: string; label: string }[];
      help?: string;
    };

export type ToolValues = Record<string, number | string>;

export interface ToolRow {
  label: string;
  value: string;
  note?: string;
}

export interface ToolSection {
  title: string;
  description?: string;
  rows: ToolRow[];
}

export interface ToolOutput {
  sections: ToolSection[];
  assumptions: Assumption[];
  warnings: CalcWarning[];
  /** Desenhos esquemáticos (SVG gerado por código) mostrados depois do resultado. */
  diagrams?: Diagram[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  fields: FieldSpec[];
  run: (values: ToolValues) => ToolOutput;
  /** Dicas de montagem e ajuste, em Markdown (cartão próprio, como o guia das antenas). */
  guide?: string;
}

export function num(values: ToolValues, key: string): number {
  const v = values[key];
  if (typeof v !== 'number') throw new RangeError(`Campo numérico ausente: ${key}.`);
  return v;
}

export function str(values: ToolValues, key: string): string {
  const v = values[key];
  if (typeof v !== 'string') throw new RangeError(`Campo de seleção ausente: ${key}.`);
  return v;
}

/** Campo de seleção de cabo, com todos os cabos da tabela. */
export function cableField(key: string, label: string, defaultValue: string, help?: string): FieldSpec {
  return {
    kind: 'select',
    key,
    label,
    defaultValue,
    options: coaxCables.map((c) => ({ value: c.id, label: c.name })),
    ...(help ? { help } : {}),
  };
}

export function getCable(values: ToolValues, key: string): CoaxCable {
  const id = str(values, key);
  const cable = coaxCables.find((c) => c.id === id);
  if (!cable) throw new RangeError(`Cabo desconhecido: ${id}.`);
  return cable;
}

/** Premissas que identificam a origem dos dados de um cabo. */
export function cableAssumptions(cable: CoaxCable): Assumption[] {
  return [
    { name: 'Cabo', value: `${cable.name}: ${cable.impedanceOhms} Ω, VF ${cable.velocityFactor}` },
    {
      name: 'Fonte dos dados do cabo',
      value: `${cable.source.document} (${cable.source.revision})`,
      source: `${cable.source.url}, consultado em ${cable.source.consulted}`,
    },
  ];
}
