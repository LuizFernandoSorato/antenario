import { circularSenseParam } from '../circular';
import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'helical',
  name: 'Helicoidal',
  description:
    'Uma hélice de fio sobre um refletor circular, irradiando na direção do eixo com ' +
    'polarização circular. É a antena clássica para satélites (polarização circular evita ' +
    'o desvanecimento causado pela rotação do satélite) e tem ganho alto para um projeto simples.',
  // Critério de uso prático desta ferramenta (não é limite físico): abaixo de ~100 MHz a hélice
  // fica com metros de diâmetro; acima de ~2,5 GHz as tolerâncias de montagem ficam exigentes.
  typicalRangeMHz: { min: 100, max: 2500 },
  // Impedância de entrada ≈ 140·C/λ (Kraus); 140 Ω com C = λ. Veja calc().expected.
  nominalImpedanceOhms: 140,
  polarization: 'Circular, à direita (RHCP) ou à esquerda (LHCP) conforme o enrolamento da hélice',
  // O ganho depende de N; o valor sai de calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 437, toSi: 1, min: 0 },
    {
      key: 'turns',
      label: 'Número de voltas (N)',
      unit: '',
      defaultValue: 8,
      toSi: 1,
      min: 1,
      help: 'Mais voltas = mais ganho e feixe mais estreito. O modo axial vale para N > 3.',
    },
    {
      key: 'circumferenceRatio',
      label: 'Circunferência em comprimentos de onda (C/λ)',
      unit: '',
      defaultValue: 1,
      toSi: 1,
      min: 0,
      help: 'O modo axial funciona para 0,75 < C/λ < 1,33. O valor central é 1.',
    },
    {
      key: 'pitchRatio',
      label: 'Passo em comprimentos de onda (S/λ)',
      unit: '',
      defaultValue: 0.25,
      toSi: 1,
      min: 0,
      help: 'Distância entre voltas. 0,25 corresponde a um ângulo de passo de 12° a 14° com C = λ.',
    },
    { key: 'conductorDiameter', label: 'Diâmetro do condutor', unit: 'mm', defaultValue: 3, toSi: 0.001, min: 0 },
    circularSenseParam(
      'Hélice enrolada à direita irradia RHCP; à esquerda, LHCP. A antena precisa ter o MESMO sentido do sinal: confirme o sentido do seu satélite.',
    ),
  ],
};
