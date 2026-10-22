import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'moxon',
  name: 'Moxon (retângulo de Moxon)',
  description:
    'Antena direcional de dois elementos com as pontas dobradas para dentro, formando um retângulo. Quase o ganho de uma ' +
    'Yagi de 2 elementos, com rejeição traseira muito alta e 50 Ω direto, em cerca de 70 % da largura.',
  // Critério de uso prático desta ferramenta (não é limite físico): do 40 m (Cebik tem Moxons de fio para 40 m) ao 70 cm.
  typicalRangeMHz: { min: 7, max: 450 },
  // Os modelos do Cebik foram otimizados para 50 a 54 Ω.
  nominalImpedanceOhms: 50,
  polarization: 'Linear: horizontal ou vertical, conforme a montagem',
  // Cebik: 5,95 a 6,05 dBi no espaço livre, condutor perfeito.
  approxGainDbi: 6,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do condutor',
      unit: 'mm',
      defaultValue: 4,
      toSi: 0.001,
      min: 0,
      help: 'Fio, vareta ou tubo, o mesmo nos dois elementos. Todas as medidas dependem dele, principalmente a folga C.',
    },
    {
      key: 'centerGap',
      label: 'Espaço central do excitado (isolador)',
      unit: 'mm',
      defaultValue: 10,
      toSi: 0.001,
      min: 0,
      help: 'Distância entre as duas metades do excitado no ponto de alimentação. Fica dentro da largura A.',
    },
  ],
};
