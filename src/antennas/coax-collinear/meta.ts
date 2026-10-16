import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'coax-collinear',
  name: 'Colinear de coaxial',
  description:
    'Uma antena vertical feita do próprio cabo coaxial: seções de meia onda ligadas com o vivo de uma ' +
    'na malha da seguinte, para que as correntes fiquem em fase, mais um chicote de 1/4 de onda no topo. ' +
    'Ganha em VHF/UHF concentrando o diagrama na horizontal. Barata e popular para escuta e repetidoras.',
  // Critério de uso prático desta ferramenta (não é limite físico): abaixo de 100 MHz as seções passam de 1 m
  // cada e a antena fica enorme; acima de 1300 MHz a tolerância de corte fica menor que 1 mm.
  typicalRangeMHz: { min: 100, max: 1300 },
  nominalImpedanceOhms: 50,
  polarization: 'Vertical',
  // O ganho depende do número de seções; vem de calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 435, toSi: 1, min: 0 },
    {
      key: 'sections',
      label: 'Seções de meia onda',
      unit: '',
      defaultValue: 4,
      toSi: 1,
      min: 2,
      max: 8,
      help: 'Mais seções = mais ganho e lóbulo mais estreito, mas mais difícil de reproduzir. A antena precisa ficar bem vertical.',
    },
    {
      key: 'velocityFactor',
      label: 'Fator de velocidade do coaxial (VF)',
      unit: '',
      defaultValue: 0.66,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Confira no datasheet do SEU cabo: erro no VF desloca a frequência. Polietileno sólido: ≈ 0,66; espuma: 0,78 a 0,85.',
    },
    {
      key: 'endEffect',
      label: 'Fator de ponta do chicote (A)',
      unit: '',
      defaultValue: 0.97,
      toSi: 1,
      min: 0.9,
      max: 1,
      help: 'Encurtamento do chicote por efeito de ponta: em geral entre 0,95 e 0,98.',
    },
  ],
};
