import { meta as groundPlaneMeta } from '../ground-plane/meta';
import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'adsb',
  name: 'ADS-B 1090 MHz (ground plane)',
  description:
    'Ground plane de λ/4 para receber o transponder ADS-B dos aviões (1090 MHz, polarização vertical) ' +
    'com um SDR. Pequena o bastante para caber numa lata ou numa caixa, mas rende mais quando ' +
    'fica alta e com o cabo coaxial curto.',
  // Critério da ferramenta: o ADS-B de 1090 MHz é fixo; deixa-se uma folga para quem quiser
  // usar a mesma antena em outras frequências próximas (ex.: 978 MHz UAT nos EUA).
  typicalRangeMHz: { min: 900, max: 1300 },
  nominalImpedanceOhms: 50,
  polarization: 'Vertical',
  approxGainDbi: null,
  // Só recepção: transmitir em 1090 MHz é serviço aeronáutico e interfere na navegação aérea.
  usage: { rx: true, tx: false },
  outdoor: true,
  params: groundPlaneMeta.params.map((p) => (p.key === 'frequencyMHz' ? { ...p, defaultValue: 1090 } : p)),
};
