import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'magnetic-loop',
  name: 'Loop magnética (small loop)',
  description:
    'Uma espira circular de tubo ou coaxial, bem menor que o comprimento de onda, sintonizada por um ' +
    'capacitor variável. Cabe em casa ou numa varanda e funciona em HF sem radiais. O preço é a banda ' +
    'estreita (reajuste a cada poucos kHz) e a tensão altíssima no capacitor.',
  // Critério de uso prático desta ferramenta: HF. Acima de ~30 MHz a espira deixa de ser "pequena"
  // para diâmetros caseiros; abaixo de 1,8 MHz a eficiência cai demais.
  typicalRangeMHz: { min: 1.8, max: 30 },
  // Impedância no capacitor/acoplamento: depende do acoplamento escolhido (loop de acoplamento ou gamma).
  nominalImpedanceOhms: 50,
  polarization: 'Linear (a espira de pé: vertical; o plano da espira define o campo)',
  // Ganho: diretividade de 1,76 dBi menos a perda por ineficiência; vem de calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 7.1, toSi: 1, min: 0 },
    { key: 'loopDiameter', label: 'Diâmetro da espira (centro a centro)', unit: 'cm', defaultValue: 100, toSi: 0.01, min: 0 },
    {
      key: 'tubeDiameter',
      label: 'Diâmetro do tubo condutor',
      unit: 'mm',
      defaultValue: 22,
      toSi: 0.001,
      min: 0,
      help: 'Cobre de 22 mm (3/4") é comum. Tubo mais grosso = menos perda e mais eficiência.',
    },
    {
      key: 'contactResistance',
      label: 'Resistência de contatos e emendas',
      unit: 'mΩ',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help: 'Soldas e conexões ruins somam resistência. 0 = ideal (só a perda do cobre). Na prática, alguns mΩ são comuns.',
    },
    { key: 'powerW', label: 'Potência de transmissão', unit: 'W', defaultValue: 10, toSi: 1, min: 0 },
  ],
};
