import type { AntennaMeta } from '../types';
import { meta as yagiMeta } from '../yagi/meta';

/** Parâmetro do Yagi pela chave (a cross Yagi usa os mesmos campos de elementos). */
function yagiParam(key: string) {
  const p = yagiMeta.params.find((x) => x.key === key);
  if (!p) throw new Error(`Parâmetro ${key} não encontrado na Yagi.`);
  return p;
}

export const meta: AntennaMeta = {
  id: 'cross-yagi',
  name: 'Cross Yagi (polarização circular)',
  description:
    'Dois Yagis idênticos no mesmo boom, girados 90° um em relação ao outro, com os elementos cruzados nas mesmas posições ' +
    '(no mesmo plano). Um é ligado direto e o outro por uma linha de 1/4 de onda, que o atrasa 90° e dá polarização circular. ' +
    'Uso clássico: satélites em 137, 145 e 435 MHz, nos quais a polarização linear sofre desvanecimento (giro do satélite, rotação de Faraday).',
  // Critério de uso prático desta ferramenta (não é limite físico): abaixo de 100 MHz o boom e os elementos ficam grandes
  // demais para uso portátil; acima de 1300 MHz a tolerância do NBS (0,003λ) fica menor que 1 mm.
  typicalRangeMHz: { min: 100, max: 1300 },
  // Dois Yagis de 100 Ω em paralelo na junção (LY3H); ver calc().expected.impedance.
  nominalImpedanceOhms: 50,
  polarization: 'Circular (direita ou esquerda, conforme qual Yagi recebe a linha defasadora)',
  // Depende do número de elementos; vem de calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { ...yagiParam('frequencyMHz'), defaultValue: 436.5 },
    yagiParam('elementCount'),
    { ...yagiParam('elementDiameter'), defaultValue: 3.2, help: 'LY3H cita varetas de alumínio de 3,2 mm (comentário na página); o comprimento depende do diâmetro.' },
    yagiParam('boomDiameter'),
    yagiParam('drivenFactor'),
    {
      key: 'yagiImpedance',
      label: 'Impedância de cada Yagi no ponto de alimentação',
      unit: 'Ω',
      defaultValue: 100,
      toSi: 1,
      min: 0,
      help:
        'Medida ou estimada. O LY3H mediu 100 Ω em cada Yagi (excitado dobrado). Com 100 Ω, os dois em paralelo dão 50 Ω e não precisa de ' +
        'transformador. Um dipolo simples dentro de um Yagi costuma ficar bem abaixo de 50 Ω: meça no NanoVNA antes.',
    },
    {
      key: 'velocityFactor',
      label: 'Fator de velocidade do coaxial defasador (VF)',
      unit: '',
      defaultValue: 0.66,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Confira no datasheet do SEU cabo. Polietileno sólido ≈ 0,66; espuma 0,78 a 0,85.',
    },
  ],
};
