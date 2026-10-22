import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'j-pole',
  name: 'J-pole',
  description:
    'Radiador vertical de λ/2 alimentado na ponta por uma seção de casamento de λ/4 em curto. ' +
    'Não precisa de radiais e é fácil de fazer com tubo de cobre, fio ou fita de TV.',
  // Critério de uso prático desta ferramenta (não é limite físico): VHF baixo a UHF.
  typicalRangeMHz: { min: 50, max: 450 },
  nominalImpedanceOhms: 50,
  polarization: 'Vertical',
  // Sem valor típico com fonte; ver calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'stubFactor',
      label: 'Fator da seção de casamento',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Se a seção for de fita/twin-lead com dielétrico, use o fator de velocidade do datasheet.',
    },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do condutor',
      unit: 'mm',
      defaultValue: 12.7,
      toSi: 0.001,
      min: 0,
      help: 'Define o fator de encurtamento K do radiador (tubo mais grosso, radiador mais curto) e a impedância da seção.',
    },
    {
      key: 'spacing',
      label: 'Espaçamento entre os condutores (centro a centro)',
      unit: 'mm',
      defaultValue: 50,
      toSi: 0.001,
      min: 0,
    },
  ],
};
