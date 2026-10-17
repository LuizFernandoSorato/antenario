import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'yagi',
  name: 'Yagi-Uda (NBS TN 688)',
  description:
    'Antena direcional com um refletor, um elemento excitado e vários diretores num boom. ' +
    'As medidas seguem os projetos otimizados do relatório NBS TN 688 (de 0,4λ a 4,2λ de ' +
    'comprimento) ou o método DL6WU, que aceita qualquer número de elementos, ambos com correção do diâmetro dos elementos e do boom. Boa para VHF/UHF: ' +
    'repetidoras, satélites de polarização linear, ADS-B e TV.',
  // Critério de uso prático desta ferramenta (não é limite físico): de 10 m até 23 cm.
  // Abaixo de 28 MHz o boom passa de dezenas de metros; acima de 1300 MHz a tolerância de corte
  // do NBS (0,003λ) fica menor que 1 mm.
  typicalRangeMHz: { min: 28, max: 1300 },
  // O NBS projeta o excitado para 50 ou 200 Ω (dipolo dobrado); ver calc().expected.impedance.
  nominalImpedanceOhms: 50,
  polarization: 'Linear (horizontal ou vertical, conforme a montagem)',
  // O ganho depende do comprimento escolhido; vem de calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'method',
      label: 'Método (1 = NBS TN 688, 2 = DL6WU)',
      unit: '',
      defaultValue: 1,
      toSi: 1,
      min: 1,
      max: 2,
      help:
        '1: projetos otimizados do NBS, só com 3, 5, 6, 12, 15 ou 17 elementos (bons para Yagis curtos). ' +
        '2: DL6WU, qualquer número de elementos de 3 a 102, pensado para Yagis longos (boom de 2,2λ a 39λ, ou seja, a partir de 11 elementos).',
    },
    {
      key: 'elementCount',
      label: 'Número de elementos (refletor + excitado + diretores)',
      unit: '',
      defaultValue: 5,
      toSi: 1,
      min: 3,
      max: 102,
      help:
        'Com o método 1 só valem 3, 5, 6, 12, 15 ou 17 (o projeto de 15, com 4,2λ, é mais comprido que o de 17, com 3,2λ, por usar espaçamento maior). ' +
        'Com o método 2 vale qualquer inteiro de 3 a 102. O comprimento do boom é sempre calculado.',
    },
    { key: 'elementDiameter', label: 'Diâmetro dos elementos', unit: 'mm', defaultValue: 6, toSi: 0.001, min: 0 },
    {
      key: 'boomDiameter',
      label: 'Diâmetro do boom condutor',
      unit: 'mm',
      defaultValue: 20,
      toSi: 0.001,
      min: 0,
      help: 'Se os elementos atravessam ou tocam um boom metálico, o relatório pede um acréscimo. Use 0 para boom isolante (PVC, madeira) com os elementos fixados fora dele.',
    },
    {
      key: 'drivenFactor',
      label: 'Fator de encurtamento do excitado (K)',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
    },
  ],
};
