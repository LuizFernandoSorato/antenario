/**
 * Cabos coaxiais: dados transcritos dos datasheets dos fabricantes.
 *
 * Regras (CLAUDE.md):
 * - Valores copiados como publicados, na unidade original (dB/100 pés). A conversão
 *   para dB/100 m é feita em código com o fator exato (1 pé = 0,3048 m).
 * - Toda entrada cita documento, revisão e data de consulta.
 * - Campos sem dado no datasheet ficam `null`. Não completar de memória.
 *
 * "RG-58", "RG-213" etc. são designações genéricas: cabos de marcas diferentes
 * com o mesmo nome podem ter perdas bem diferentes (compare o Belden 8259 com o
 * 8240 abaixo). Se o seu cabo for de outra marca, use o datasheet dele.
 */

export interface FrequencyPoint {
  fMHz: number;
  value: number;
}

export interface DataSource {
  document: string;
  url: string;
  revision: string;
  /** Data em que o documento foi consultado (AAAA-MM-DD). */
  consulted: string;
}

export interface CoaxCable {
  id: string;
  /** Nome curto exibido ao usuário. */
  name: string;
  manufacturer: string;
  partNumber: string;
  impedanceOhms: number;
  /** Fator de velocidade (VF), fração de 0 a 1. */
  velocityFactor: number;
  outerDiameterMm: number;
  dielectric: string;
  centerConductor: string;
  /** Atenuação nominal/típica em dB/100 pés, como publicada, com VSWR 1:1. */
  attenuationDbPer100ft: FrequencyPoint[];
  /** Potência média (CW) máxima em watts, com VSWR 1:1. `null` se o datasheet não informa. */
  maxPowerW: FrequencyPoint[] | null;
  /** Condições da tabela de potência, como descritas no datasheet. */
  powerConditions: string | null;
  /** Tensão nominal informada pelo fabricante, em volts, com o tipo de especificação. */
  voltageRating: { volts: number; kind: string } | null;
  /** Potência de pico em watts (quando informada). */
  peakPowerW: number | null;
  /** Observações de uso (RX/TX, limitações conhecidas do próprio datasheet). */
  notes: string;
  source: DataSource;
}

const CONSULTED = '2026-10-16';

const BELDEN_POWER_CONDITIONS = 'Max. Power Rating conforme datasheet Belden (condições de ensaio não detalhadas no documento).';

export const coaxCables: readonly CoaxCable[] = [
  {
    id: 'belden-8216',
    name: 'RG-174 (Belden 8216)',
    manufacturer: 'Belden',
    partNumber: '8216',
    impedanceOhms: 50,
    velocityFactor: 0.66,
    outerDiameterMm: 2.79,
    dielectric: 'PE sólido',
    centerConductor: '26 AWG (7×34) aço cobreado',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 1.9 },
      { fMHz: 10, value: 3.3 },
      { fMHz: 50, value: 5.8 },
      { fMHz: 100, value: 8.4 },
      { fMHz: 200, value: 12.5 },
      { fMHz: 400, value: 19.0 },
      { fMHz: 700, value: 27.0 },
      { fMHz: 900, value: 31.0 },
      { fMHz: 1000, value: 34.0 },
    ],
    maxPowerW: [
      { fMHz: 1, value: 976 },
      { fMHz: 10, value: 354 },
      { fMHz: 50, value: 197 },
      { fMHz: 100, value: 161 },
      { fMHz: 200, value: 136 },
      { fMHz: 400, value: 120 },
      { fMHz: 700, value: 112 },
      { fMHz: 900, value: 109 },
      { fMHz: 1000, value: 108 },
    ],
    powerConditions: BELDEN_POWER_CONDITIONS,
    voltageRating: { volts: 1100, kind: 'Voltage Rating (Belden)' },
    peakPowerW: null,
    notes: 'Cabo fino, de perda alta. Bom para rabichos curtos (pigtails) e SDR; evite em lances longos.',
    source: {
      document: 'Belden 8216 Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/8216_techdata.pdf',
      revision: 'Revision Number 0.540, 2026-02-20',
      consulted: CONSULTED,
    },
  },
  {
    id: 'belden-8259',
    name: 'RG-58 flexível (Belden 8259)',
    manufacturer: 'Belden',
    partNumber: '8259',
    impedanceOhms: 50,
    velocityFactor: 0.66,
    outerDiameterMm: 4.9,
    dielectric: 'PE sólido',
    centerConductor: '20 AWG (19×33) cobre estanhado',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 0.4 },
      { fMHz: 10, value: 1.5 },
      { fMHz: 50, value: 3.7 },
      { fMHz: 100, value: 5.4 },
      { fMHz: 200, value: 8.1 },
      { fMHz: 400, value: 12.4 },
      { fMHz: 700, value: 17.7 },
      { fMHz: 900, value: 21.1 },
      { fMHz: 1000, value: 22.8 },
    ],
    // TODO(fonte): o datasheet do 8259 não publica tabela de potência.
    maxPowerW: null,
    powerConditions: null,
    voltageRating: { volts: 1900, kind: 'Voltage Rating (Belden)' },
    peakPowerW: null,
    notes: 'Versão com condutor central trançado (mais flexível, perda maior que a do 8240).',
    source: {
      document: 'Belden 8259 Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/8259_techdata.pdf',
      revision: 'Revision Number 0.533, 2026-02-20',
      consulted: CONSULTED,
    },
  },
  {
    id: 'belden-8240',
    name: 'RG-58/U sólido (Belden 8240)',
    manufacturer: 'Belden',
    partNumber: '8240',
    // Datasheet: "Nominal Characteristic Impedance 52 Ohm"; "Actual Impedance specification is 51.5 +/- 1.5 ohms".
    impedanceOhms: 52,
    velocityFactor: 0.66,
    outerDiameterMm: 4.9,
    dielectric: 'PE sólido',
    centerConductor: '20 AWG sólido, cobre nu',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 0.3 },
      { fMHz: 10, value: 1.1 },
      { fMHz: 50, value: 2.5 },
      { fMHz: 100, value: 3.8 },
      { fMHz: 200, value: 5.6 },
      { fMHz: 400, value: 8.4 },
      { fMHz: 700, value: 11.7 },
      { fMHz: 900, value: 13.7 },
      { fMHz: 1000, value: 14.5 },
    ],
    maxPowerW: [
      { fMHz: 50, value: 530 },
      { fMHz: 100, value: 350 },
      { fMHz: 400, value: 160 },
      { fMHz: 1000, value: 90 },
    ],
    powerConditions: BELDEN_POWER_CONDITIONS,
    voltageRating: { volts: 1900, kind: 'Voltage Rating (Belden)' },
    peakPowerW: null,
    notes: 'Impedância nominal de 52 Ω (51,5 ± 1,5 Ω), na prática usado como 50 Ω.',
    source: {
      document: 'Belden 8240 Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/8240_techdata.pdf',
      revision: 'Revision Number 0.541, 2026-02-20',
      consulted: CONSULTED,
    },
  },
  {
    id: 'belden-9258',
    name: 'RG-8X / mini-8 (Belden 9258)',
    manufacturer: 'Belden',
    partNumber: '9258',
    impedanceOhms: 50,
    velocityFactor: 0.82,
    outerDiameterMm: 6.15,
    dielectric: 'PE espumado',
    centerConductor: '16 AWG (19×29) cobre nu',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 0.3 },
      { fMHz: 10, value: 0.9 },
      { fMHz: 50, value: 2.1 },
      { fMHz: 100, value: 3.1 },
      { fMHz: 200, value: 4.5 },
      { fMHz: 400, value: 6.6 },
      { fMHz: 700, value: 9.1 },
      { fMHz: 900, value: 10.7 },
      { fMHz: 1000, value: 11.2 },
    ],
    maxPowerW: [
      { fMHz: 10, value: 1000 },
      { fMHz: 50, value: 370 },
      { fMHz: 100, value: 250 },
      { fMHz: 200, value: 190 },
      { fMHz: 400, value: 110 },
      { fMHz: 700, value: 75 },
      { fMHz: 1000, value: 60 },
    ],
    powerConditions: BELDEN_POWER_CONDITIONS,
    // Classificação UL de instalação predial (CM), não é especificação de RF.
    voltageRating: { volts: 300, kind: 'UL Voltage Rating (CM), classificação predial' },
    peakPowerW: null,
    notes: 'Meio-termo entre RG-58 e RG-213: mais leve que o RG-213, perda menor que a do RG-58.',
    source: {
      document: 'Belden 9258 Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/9258_techdata.pdf',
      revision: 'Revision Number 0.514, 2026-02-20',
      consulted: CONSULTED,
    },
  },
  {
    id: 'belden-8267',
    name: 'RG-213 (Belden 8267)',
    manufacturer: 'Belden',
    partNumber: '8267',
    impedanceOhms: 50,
    velocityFactor: 0.66,
    outerDiameterMm: 10.3,
    dielectric: 'PE sólido',
    centerConductor: '13 AWG (7×21) cobre nu',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 0.17 },
      { fMHz: 10, value: 0.55 },
      { fMHz: 50, value: 1.3 },
      { fMHz: 100, value: 1.9 },
      { fMHz: 200, value: 2.7 },
      { fMHz: 400, value: 4.1 },
      { fMHz: 700, value: 6.5 },
      { fMHz: 900, value: 7.6 },
      { fMHz: 1000, value: 8.0 },
      { fMHz: 4000, value: 21.5 },
    ],
    maxPowerW: [
      { fMHz: 1, value: 9295 },
      { fMHz: 10, value: 2761 },
      { fMHz: 50, value: 1122 },
      { fMHz: 100, value: 748 },
      { fMHz: 200, value: 494 },
      { fMHz: 400, value: 326 },
      { fMHz: 700, value: 235 },
      { fMHz: 900, value: 205 },
      { fMHz: 1000, value: 194 },
      { fMHz: 4000, value: 110 },
    ],
    powerConditions: BELDEN_POWER_CONDITIONS,
    voltageRating: { volts: 3700, kind: 'Voltage Rating (Mil-Spec)' },
    peakPowerW: null,
    notes: 'Cabo clássico de estação fixa em HF/VHF: robusto, potência alta, perda moderada.',
    source: {
      document: 'Belden 8267 Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/8267_techdata.pdf',
      revision: 'Revision Number 0.599, 2026-02-20',
      consulted: CONSULTED,
    },
  },
  {
    id: 'times-lmr-240',
    name: 'LMR-240 (Times Microwave)',
    manufacturer: 'Times Microwave Systems',
    partNumber: 'LMR-240',
    impedanceOhms: 50,
    velocityFactor: 0.84,
    outerDiameterMm: 6.1,
    dielectric: 'PE espumado',
    centerConductor: 'Cobre sólido, 1,42 mm',
    attenuationDbPer100ft: [
      { fMHz: 50, value: 1.7 },
      { fMHz: 150, value: 3.0 },
      { fMHz: 220, value: 3.7 },
      { fMHz: 450, value: 5.3 },
      { fMHz: 900, value: 7.6 },
      { fMHz: 1500, value: 9.9 },
      { fMHz: 1800, value: 10.9 },
      { fMHz: 2000, value: 11.5 },
      { fMHz: 2500, value: 12.9 },
      { fMHz: 5800, value: 20.4 },
    ],
    maxPowerW: [
      { fMHz: 50, value: 1150 },
      { fMHz: 150, value: 660 },
      { fMHz: 220, value: 540 },
      { fMHz: 450, value: 380 },
      { fMHz: 900, value: 260 },
      { fMHz: 1500, value: 200 },
      { fMHz: 1800, value: 180 },
      { fMHz: 2000, value: 170 },
      { fMHz: 2500, value: 150 },
      { fMHz: 5800, value: 100 },
    ],
    powerConditions: 'Input Power (CW), Max, conforme datasheet (condições de ensaio não detalhadas nesta cópia).',
    voltageRating: { volts: 1500, kind: 'Dielectric Withstanding Voltage (DC)' },
    peakPowerW: 5600,
    notes: 'A tabela publicada começa em 50 MHz: abaixo disso (HF) não há dado nesta fonte.',
    source: {
      document: 'Times Microwave LMR-240, datasheet distribuído pela Fairview Microwave',
      url: 'https://www.fairviewmicrowave.com/images/productPDF/LMR-240.pdf',
      revision: '© 2023 Infinite Electronics; desenho rev. B (2024-05-10)',
      consulted: CONSULTED,
    },
  },
  {
    id: 'times-lmr-400',
    name: 'LMR-400 (Times Microwave)',
    manufacturer: 'Times Microwave Systems',
    partNumber: 'LMR-400',
    impedanceOhms: 50,
    velocityFactor: 0.85,
    outerDiameterMm: 10.29,
    dielectric: 'PE espumado',
    centerConductor: 'Alumínio cobreado (BCCAl) sólido, 2,74 mm',
    attenuationDbPer100ft: [
      { fMHz: 30, value: 0.7 },
      { fMHz: 50, value: 0.9 },
      { fMHz: 150, value: 1.5 },
      { fMHz: 220, value: 1.9 },
      { fMHz: 450, value: 2.7 },
      { fMHz: 900, value: 3.9 },
      { fMHz: 1500, value: 5.1 },
      { fMHz: 1800, value: 5.7 },
      { fMHz: 2000, value: 6.0 },
      { fMHz: 2500, value: 6.8 },
      { fMHz: 5800, value: 10.8 },
    ],
    maxPowerW: [
      { fMHz: 30, value: 3330 },
      { fMHz: 50, value: 2570 },
      { fMHz: 150, value: 1470 },
      { fMHz: 220, value: 1200 },
      { fMHz: 450, value: 830 },
      { fMHz: 900, value: 580 },
      { fMHz: 1500, value: 440 },
      { fMHz: 1800, value: 400 },
      { fMHz: 2000, value: 370 },
      { fMHz: 2500, value: 330 },
      { fMHz: 5800, value: 210 },
    ],
    powerConditions:
      'VSWR 1,0; ambiente +40 °C; condutor interno a 100 °C; nível do mar; ar seco; sem radiação solar.',
    voltageRating: { volts: 2500, kind: 'Voltage Withstand (DC)' },
    peakPowerW: 16000,
    notes:
      'Perda muito menor que a do RG-213 em VHF/UHF. Condutor central de alumínio cobreado: ' +
      'evite dobras repetidas no mesmo ponto. A tabela começa em 30 MHz.',
    source: {
      document: 'Times Microwave Systems, catálogo LMR-400, p. 22–23',
      url: 'https://cdn.shopify.com/s/files/1/1182/1008/files/LMR-400.pdf',
      revision: 'Sem número de revisão no documento',
      consulted: CONSULTED,
    },
  },
  {
    id: 'belden-1694a',
    name: 'RG-6 75 Ω (Belden 1694A)',
    manufacturer: 'Belden',
    partNumber: '1694A',
    impedanceOhms: 75,
    velocityFactor: 0.82,
    outerDiameterMm: 6.96,
    dielectric: 'PE espumado',
    centerConductor: '18 AWG sólido, cobre nu',
    attenuationDbPer100ft: [
      { fMHz: 1, value: 0.24 },
      { fMHz: 3.58, value: 0.44 },
      { fMHz: 5, value: 0.52 },
      { fMHz: 6, value: 0.57 },
      { fMHz: 7, value: 0.61 },
      { fMHz: 10, value: 0.71 },
      { fMHz: 12, value: 0.78 },
      { fMHz: 25, value: 1.08 },
      { fMHz: 67.5, value: 1.65 },
      { fMHz: 71.5, value: 1.69 },
      { fMHz: 88.5, value: 1.86 },
      { fMHz: 100, value: 1.95 },
      { fMHz: 135, value: 2.24 },
      { fMHz: 143, value: 2.3 },
      { fMHz: 180, value: 2.57 },
      { fMHz: 270, value: 3.17 },
      { fMHz: 360, value: 3.69 },
      { fMHz: 540, value: 4.5 },
      { fMHz: 720, value: 5.3 },
      { fMHz: 750, value: 5.4 },
      { fMHz: 1000, value: 6.3 },
      { fMHz: 1500, value: 7.8 },
      { fMHz: 2000, value: 9.2 },
      { fMHz: 2250, value: 9.8 },
      { fMHz: 3000, value: 11.5 },
      { fMHz: 4500, value: 14.5 },
      { fMHz: 6000, value: 17.7 },
    ],
    // TODO(fonte): cabo de vídeo, o datasheet não publica potência máxima.
    maxPowerW: null,
    powerConditions: null,
    voltageRating: { volts: 300, kind: 'UL Voltage Rating (CMR), classificação predial' },
    peakPowerW: null,
    notes:
      'Cabo de 75 Ω (TV/satélite): ótimo e barato para recepção e SDR. Em sistema de 50 Ω o ' +
      'descasamento sozinho dá ROE de 1,5:1. Sem dado de potência: não use para TX sem datasheet.',
    source: {
      document: 'Belden 1694A Technical Data Sheet',
      url: 'https://catalog.belden.com/techdata/en/1694A_techdata.pdf',
      revision: 'Revision Number 0.716, 2026-05-27',
      consulted: CONSULTED,
    },
  },
];

export function findCable(id: string): CoaxCable | undefined {
  return coaxCables.find((c) => c.id === id);
}
