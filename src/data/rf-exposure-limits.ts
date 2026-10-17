/**
 * Níveis de referência de exposição a RF (densidade de potência incidente, onda plana).
 *
 * Fonte: ICNIRP, "Guidelines for Limiting Exposure to Electromagnetic Fields (100 kHz to 300 GHz)",
 * Health Physics 118(5):483–524, maio de 2020, Tabela 5 (média de 30 min, corpo inteiro):
 * https://www.icnirp.org/cms/upload/publications/ICNIRPrfgdl2020.pdf (consultado em 2026-10-16).
 *
 *   Público em geral:  >30–400 MHz: S = 2 W/m²;  >400–2000 MHz: S = f/200 W/m²;  >2–300 GHz: S = 10 W/m².
 *   Ocupacional:       >30–400 MHz: S = 10 W/m²; >400–2000 MHz: S = f/40 W/m²;   >2–300 GHz: S = 50 W/m².
 *   (f em MHz.) De 0,1 a 30 MHz a tabela não traz densidade de potência: usa campo E e H (zona de campo
 *   próximo), e o cálculo de campo distante desta ferramenta NÃO se aplica.
 *
 * Legislação brasileira (consultada em 2026-10-17):
 *  - Resolução Anatel nº 700/2018, Art. 4º, § 1º: adota os limites da ICNIRP, "detalhados em Ato específico"
 *    (https://informacoes.anatel.gov.br/legislacao/resolucoes/2018/1161-resolucao-700). A resolução não traz tabelas.
 *  - O Ato nº 458/2019 (que detalhava a ICNIRP) está REVOGADO. Foi substituído pelo Ato nº 17.865 (DOU, jan/2024,
 *    em vigor desde 01/03/2024; fonte secundária: https://dplnews.com/?p=220353).
 *  - A minuta desse Ato (Consulta Pública nº 63/2022, Anexo A, Tabelas A.I e A.II) adota a ICNIRP 2020 com os
 *    MESMOS valores de densidade de potência acima (público: 2 W/m², f/200, 10 W/m²; ocupacional: 10, f/40, 50).
 *    https://apps.anatel.gov.br/ParticipaAnatel/VisualizarTextoConsulta.aspx?TelaDeOrigem=3&ConsultaId=10077
 * Ressalva: o texto final do Ato nº 17.865 não foi lido, só a minuta e a notícia. O usuário deve conferir a versão
 * vigente no site da Anatel.
 */

export type ExposureScenario = 'public' | 'occupational';

export const EXPOSURE_LIMITS_SOURCE = {
  document: 'ICNIRP Guidelines (2020), Tabela 5',
  url: 'https://www.icnirp.org/cms/upload/publications/ICNIRPrfgdl2020.pdf',
  consulted: '2026-10-16',
} as const;

/** Menor frequência (exclusiva) para a qual a Tabela 5 dá densidade de potência. */
export const POWER_DENSITY_MIN_MHZ = 30;
/** Maior frequência da Tabela 5. */
export const POWER_DENSITY_MAX_MHZ = 300_000;

/**
 * Densidade de potência de referência (W/m²) para f em MHz, ou `null` quando a Tabela 5 não traz
 * densidade de potência para essa frequência (f ≤ 30 MHz).
 */
export function powerDensityLimit(fMHz: number, scenario: ExposureScenario): number | null {
  if (!Number.isFinite(fMHz) || fMHz <= 0) throw new RangeError('A frequência deve ser positiva.');
  if (fMHz > POWER_DENSITY_MAX_MHZ) {
    throw new RangeError('Acima de 300 GHz está fora da faixa das diretrizes (100 kHz a 300 GHz).');
  }
  if (fMHz <= POWER_DENSITY_MIN_MHZ) return null;
  const pub = scenario === 'public';
  if (fMHz <= 400) return pub ? 2 : 10;
  if (fMHz <= 2000) return fMHz / (pub ? 200 : 40);
  return pub ? 10 : 50;
}
