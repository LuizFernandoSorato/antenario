import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'ground-plane',
  name: 'Ground plane de 1/4 de onda',
  description:
    'Um radiador vertical de λ/4 sobre radiais que fazem o papel do "chão". É omnidirecional ' +
    'no plano horizontal: boa para repetidoras, comunicação local e escuta em VHF/UHF.',
  // Critério de uso prático desta ferramenta (não é limite físico):
  // de 10 m (28 MHz) até a faixa de 23 cm.
  typicalRangeMHz: { min: 25, max: 1300 },
  nominalImpedanceOhms: 50,
  polarization: 'Vertical',
  // Sem valor típico com fonte para radiais elevados; ver calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 145, toSi: 1, min: 0 },
    { key: 'radialCount', label: 'Número de radiais', unit: '', defaultValue: 4, toSi: 1, min: 2 },
    {
      key: 'droopAngleDeg',
      label: 'Inclinação dos radiais (abaixo da horizontal)',
      unit: '°',
      defaultValue: 45,
      toSi: 1,
      min: 0,
      max: 89,
      help: '0° = radiais horizontais. Inclinar para baixo eleva a impedância.',
    },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do condutor',
      unit: 'mm',
      defaultValue: 2,
      toSi: 0.001,
      min: 0,
      help: 'Define o fator de encurtamento K do radiador e dos radiais: condutor mais grosso, medidas menores.',
    },
  ],
};
