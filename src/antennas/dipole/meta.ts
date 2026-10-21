import type { AntennaMeta } from '../types';
import { K_FROM_DIAMETER, K_MANUAL } from './k-mode';

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
      key: 'kMode',
      kind: 'choice',
      label: 'Fator de encurtamento (K)',
      unit: '',
      defaultValue: K_FROM_DIAMETER,
      toSi: 1,
      options: [
        { value: K_FROM_DIAMETER, label: 'Calcular pelo diâmetro do condutor' },
        { value: K_MANUAL, label: 'Digitar (campo abaixo)' },
      ],
      help: 'O K depende da razão entre o comprimento de onda e o diâmetro: condutores mais grossos pedem K menor.',
    },
    {
      key: 'shorteningFactor',
      label: 'K digitado',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Só vale com "Digitar". Típico 0,95 (regra 468/f pés do ARRL).',
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
