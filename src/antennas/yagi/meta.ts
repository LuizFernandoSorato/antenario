import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'yagi',
  name: 'Yagi-Uda',
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
      key: 'elementCount',
      label: 'Número de elementos (refletor + excitado + diretores)',
      unit: '',
      defaultValue: 5,
      toSi: 1,
      min: 3,
      max: 40,
      help:
        'O método é escolhido sozinho: com 3, 5 ou 6 elementos, os projetos otimizados do NBS TN 688; com 11 ou mais, o DL6WU (feito para ' +
        'Yagis longos, boom a partir de 2,2λ). Com 4 ou de 7 a 10 elementos o DL6WU calcula, mas avisa e não estima o ganho. ' +
        'Vale qualquer inteiro de 3 a 40 (acima disso o padrão de irradiação, calculado por momentos, ficaria lento demais); o comprimento do boom é sempre calculado.',
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
      key: 'drivenGap',
      label: 'Espaço central do excitado (isolador)',
      unit: 'mm',
      defaultValue: 10,
      toSi: 0.001,
      min: 0,
      help: 'Distância entre os dois braços do excitado no ponto de alimentação. Conta dentro do comprimento DE (ponta a ponta); só o excitado é partido ao meio.',
    },
  ],
};
