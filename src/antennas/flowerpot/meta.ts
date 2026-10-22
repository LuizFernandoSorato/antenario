import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'flowerpot',
  name: 'Flowerpot',
  description:
    'Dipolo vertical de meia onda feito de um único cabo coaxial: em cima, o vivo sem a malha; embaixo, o próprio coaxial; ' +
    'uma bobina do cabo enrolada no tubo faz o choke que termina a antena. Tudo dentro de um tubo de PVC.',
  // Faixa em que a ferramenta tem dados: os protótipos do VK2ZOI (6 m e 2 m) e a tabela de bobinas dele, que cobre
  // ressonâncias de 47 a 160 MHz (operação ≈ 50 a 170 MHz).
  typicalRangeMHz: { min: 50, max: 170 },
  // ROE ≈ 1,0:1 em 50 Ω medida pelo VK2ZOI nos dois protótipos.
  nominalImpedanceOhms: 50,
  polarization: 'Linear vertical',
  approxGainDbi: 2.15,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'housing',
      kind: 'choice',
      label: 'Montagem',
      unit: '',
      defaultValue: 1,
      toSi: 1,
      options: [
        { value: 1, label: 'Dentro de conduíte elétrico cinza de PVC (como o VK2ZOI)' },
        { value: 2, label: 'Sem tubo (estimativa: elementos 2 % mais compridos)' },
      ],
      help: 'As medidas do VK2ZOI já descontam o efeito do conduíte. Outros tubos mudam um pouco os comprimentos.',
    },
    {
      key: 'formerDiameter',
      kind: 'choice',
      label: 'Diâmetro do tubo da bobina',
      unit: '',
      defaultValue: 0,
      toSi: 1,
      options: [
        { value: 0, label: 'Automático (o menor que serve)' },
        { value: 0.025, label: '25 mm' },
        { value: 0.032, label: '32 mm' },
        { value: 0.05, label: '50 mm' },
      ],
      help: 'Diâmetro externo do tubo onde a bobina de RG-58 é enrolada (os da tabela do VK2ZOI).',
    },
    {
      key: 'chokeBand',
      kind: 'choice',
      label: 'Uso',
      unit: '',
      defaultValue: 2,
      toSi: 1,
      options: [
        { value: 1, label: 'Uma frequência (ex.: um repetidor)' },
        { value: 2, label: 'Faixa inteira' },
      ],
      help: 'Muda o arredondamento das espiras da bobina: meia espira a menos para uma frequência, a mais para a faixa toda.',
    },
  ],
};
