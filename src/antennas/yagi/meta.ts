import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'yagi',
  name: 'Yagi-Uda (NBS TN 688)',
  description:
    'Antena direcional com um refletor, um elemento excitado e vários diretores num boom. ' +
    'As medidas seguem os projetos otimizados do relatório NBS TN 688 (de 0,4λ a 4,2λ de ' +
    'comprimento), com correção do diâmetro dos elementos e do boom. Boa para VHF/UHF: ' +
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
      key: 'designLength',
      label: 'Comprimento do Yagi (em λ)',
      unit: 'λ',
      defaultValue: 0.8,
      toSi: 1,
      min: 0.4,
      max: 4.2,
      help:
        'Só os projetos do NBS: 0,4 (3 elementos), 0,8 (5), 1,2 (6), 2,2 (12), 3,2 (17) ou 4,2 (15). ' +
        'Mais comprido = mais ganho e feixe mais estreito.',
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
