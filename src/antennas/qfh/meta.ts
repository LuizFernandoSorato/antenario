import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'qfh',
  name: 'QFH (hélice quadrifilar)',
  description:
    'Duas espiras de fio, uma maior e outra menor, torcidas meia volta em torno de um cilindro e ' +
    'cruzadas a 90°. Dá polarização circular com diagrama quase hemisférico: recebe satélites ' +
    'de órbita baixa (NOAA, Meteor, GPS) sem precisar apontar nem rastrear. Feita de tubo ou fio rígido.',
  // Critério de uso prático desta ferramenta (não é limite físico): de 100 MHz (cilindro de ~0,4 m)
  // até 2 GHz (GPS L1 está em 1,575 GHz).
  typicalRangeMHz: { min: 100, max: 2000 },
  nominalImpedanceOhms: 50,
  polarization: 'Circular à direita (para as medidas de satélite meteorológico em 137 MHz)',
  // Sem valor típico com fonte; ver calc().expected.gain.
  approxGainDbi: null,
  // O projeto de referência é de recepção. Não há fonte aqui para TX (potência, tensões, casamento).
  usage: { rx: true, tx: false },
  outdoor: true,
  params: [{ key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 137.5, toSi: 1, min: 0 }],
};
