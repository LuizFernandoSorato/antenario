import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'cubic-quad',
  name: 'Quadra cúbica',
  description:
    'Elementos em espiras quadradas de uma onda de perímetro, montados em varetas cruzadas ' +
    '(spreaders) sobre um boom. Um refletor, uma espira excitada e zero ou mais diretores. ' +
    'Ganho alto para o tamanho, funciona bem com fio e varetas leves.',
  // Critério de uso prático desta ferramenta (não é limite físico): a 14 MHz o lado da espira
  // já passa de 5 m; acima de 450 MHz as espiras ficam muito pequenas para montar com fio.
  typicalRangeMHz: { min: 14, max: 450 },
  nominalImpedanceOhms: 50,
  polarization: 'Horizontal (alimentada no meio do lado de baixo) ou vertical (no meio de um lado)',
  // Ganho: estimativa aditiva de fonte secundária; ver calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'directorCount',
      label: 'Número de diretores',
      unit: '',
      defaultValue: 1,
      toSi: 1,
      min: 0,
      help: '0 = só refletor e excitado (2 elementos). Cada diretor soma ganho e comprimento de boom.',
    },
    {
      key: 'spacingLambda',
      label: 'Espaçamento entre elementos (em λ)',
      unit: 'λ',
      defaultValue: 0.2,
      toSi: 1,
      min: 0.1,
      max: 0.3,
      help: 'De 0,15λ a 0,2λ dá cerca de 50 Ω; com pouco mais de 0,25λ, cerca de 75 Ω (Electronics Notes).',
    },
    {
      key: 'wireDiameter',
      label: 'Diâmetro do fio',
      unit: 'mm',
      defaultValue: 2,
      toSi: 0.001,
      min: 0,
      // TODO(fonte): fonte pendente para o texto abaixo.
      help: 'Não altera os perímetros (as fórmulas são para fio fino; o efeito do diâmetro não tem fonte aqui); entra só no padrão de irradiação e na impedância do modelo por momentos.',
    },
    {
      key: 'feedGap',
      label: 'Espaço de alimentação da espira excitada',
      unit: 'mm',
      defaultValue: 10,
      toSi: 0.001,
      min: 0,
      help: 'Abertura do fio no meio do lado de baixo, onde liga o cabo. Conta dentro do perímetro H; o fio a cortar é H menos o espaço.',
    },
  ],
};
