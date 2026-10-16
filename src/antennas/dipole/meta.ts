import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'dipole',
  name: 'Dipolo de meia onda',
  description:
    'Dois braços de λ/4 alimentados no centro. É a antena de referência: simples, ' +
    'barata e eficiente, para recepção e transmissão.',
  // Critério de uso prático desta ferramenta (não é limite físico):
  // de 160 m (1,8 MHz, ~80 m de fio) até UHF baixo.
  typicalRangeMHz: { min: 1.8, max: 500 },
  nominalImpedanceOhms: 73,
  polarization: 'Linear: horizontal ou vertical, conforme a montagem',
  approxGainDbi: 2.15,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    {
      key: 'shorteningFactor',
      label: 'Fator de encurtamento (K)',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Típico 0,95. Condutores mais grossos pedem K menor.',
    },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do condutor',
      unit: 'mm',
      defaultValue: 2,
      toSi: 0.001,
      min: 0,
    },
    {
      key: 'centerGap',
      label: 'Espaço central (isolador)',
      unit: 'mm',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help: 'Distância entre os dois braços no ponto de alimentação.',
    },
  ],
};
