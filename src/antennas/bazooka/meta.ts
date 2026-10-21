import { coaxCables } from '../../data/coax-cables';
import type { AntennaMeta } from '../types';

/** Índice do cabo padrão (RG-58, o mais usado nessa antena) na tabela de cabos. */
export const DEFAULT_CABLE = coaxCables.findIndex((c) => c.id === 'belden-8259');

export const meta: AntennaMeta = {
  id: 'bazooka',
  name: 'Bazooka (double bazooka)',
  description:
    'Dipolo de meia onda com a parte central feita de cabo coaxial: a malha é cortada no meio e o vivo é ligado à malha nas ' +
    'pontas, formando dois tocos de 1/4 de onda por dentro do cabo. Fios completam o comprimento do dipolo. Popular em HF; ' +
    'na prática, alarga pouco a banda em relação a um dipolo comum.',
  // Critério de uso prático desta ferramenta (não é limite físico): de 160 m (1,8 MHz) até o 2 m. Acima disso a espessura
  // do coaxial e as ligações nas pontas pesam muito no comprimento dos tocos.
  typicalRangeMHz: { min: 1.8, max: 148 },
  nominalImpedanceOhms: 70,
  polarization: 'Linear: horizontal ou vertical, conforme a montagem',
  approxGainDbi: 2.15,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 7.1, toSi: 1, min: 0 },
    {
      key: 'shorteningFactor',
      label: 'Fator de encurtamento (K)',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Define o comprimento total, como no dipolo. Típico 0,95. Precisa ser maior que o fator de velocidade do cabo.',
    },
    {
      key: 'cable',
      kind: 'choice',
      label: 'Cabo coaxial da seção central',
      unit: '',
      defaultValue: DEFAULT_CABLE,
      toSi: 1,
      options: coaxCables.map((c, i) => ({ value: i, label: c.name })),
      help: 'O fator de velocidade, a impedância, o diâmetro e a perda saem do datasheet do cabo escolhido.',
    },
    {
      key: 'velocityFactor',
      label: 'Fator de velocidade medido (0 = datasheet)',
      unit: '',
      defaultValue: 0,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Deixe 0 para usar o do datasheet. Se você mediu o VF do seu cabo (NanoVNA), digite aqui: ele define o tamanho dos tocos.',
    },
    {
      key: 'centerGap',
      label: 'Corte da malha no centro',
      unit: 'mm',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help: 'Largura do trecho em que a malha é removida (o vivo e o dielétrico continuam). Entra na seção de coaxial, entre os dois tocos.',
    },
  ],
};
