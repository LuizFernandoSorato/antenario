import { formatLength, formatNumber } from '../../core/units';
import {
  CHOKE_CABLE_LABELS,
  CHOKE_SOURCE,
  type ChokeCableFamily,
  FERRITE_RECIPES,
  MULTI_BAND_CHOKES,
  SINGLE_BAND_CHOKES,
  coilDiameterM,
  feetToMeters,
  singleBandChoke,
} from '../../data/coax-chokes';
import { coaxChokeDiagram } from './diagrams';
import chokeGuide from './guides/coax-choke.md?raw';
import { type Tool, str } from './types';

const turnsText = (t: readonly [number, number]) => (t[0] === t[1] ? String(t[0]) : `${t[0]} a ${t[1]}`);
const feetText = (ft: number) => `${formatLength(feetToMeters(ft), 'cm')} (${formatNumber(ft, 0)} pés)`;

export const coaxChokeTool: Tool = {
  id: 'coax-choke',
  name: 'Choke de coaxial',
  guide: chokeGuide,
  description:
    'Balun de corrente 1:1 feito com o próprio cabo enrolado perto da antena: bloqueia a corrente que volta pela face ' +
    'externa da malha. Comprimentos e espiras medidos, da tabela do ARRL Antenna Book (HF, de 3,5 a 28 MHz).',
  fields: [
    {
      kind: 'select',
      key: 'band',
      label: 'Banda',
      defaultValue: '14',
      options: SINGLE_BAND_CHOKES.rg213.map((c) => ({ value: String(c.fMHz), label: `${formatNumber(c.fMHz, 1)} MHz` })),
    },
    {
      kind: 'select',
      key: 'cable',
      label: 'Cabo',
      defaultValue: 'rg213',
      options: (Object.keys(CHOKE_CABLE_LABELS) as ChokeCableFamily[]).map((k) => ({ value: k, label: CHOKE_CABLE_LABELS[k] })),
    },
  ],
  run(values) {
    const fMHz = Number(str(values, 'band'));
    const family = str(values, 'cable') as ChokeCableFamily;
    if (!(family in CHOKE_CABLE_LABELS)) throw new RangeError(`Cabo desconhecido: ${family}.`);
    const row = singleBandChoke(family, fMHz);
    if (!row) throw new RangeError(`A tabela do ARRL não tem choke para ${fMHz} MHz.`);
    const lengthM = feetToMeters(row.lengthFt);
    const meanTurns = (row.turns[0] + row.turns[1]) / 2;
    const diameterM = coilDiameterM(lengthM, meanTurns);

    return {
      diagrams: [coaxChokeDiagram({ lengthM, turns: turnsText(row.turns), coilDiameterM: diameterM, res: 'cm' })],
      sections: [
        {
          title: `Uma banda (${formatNumber(fMHz, 1)} MHz, ${CHOKE_CABLE_LABELS[family]})`,
          description: 'A coluna "muito eficaz" da tabela: impedância alta medida nessa frequência.',
          rows: [
            { label: 'Cabo a enrolar', value: feetText(row.lengthFt), note: 'O comprimento não é crítico (ARRL).' },
            { label: 'Espiras', value: turnsText(row.turns) },
            {
              label: 'Diâmetro da bobina que resulta',
              value: `≈ ${formatLength(diameterM, 'cm')}`,
              note: 'Comprimento ÷ (π × espiras). Não está na tabela: é só a geometria.',
            },
          ],
        },
        {
          title: 'Várias bandas (RG-8, 58, 59, 8X e 213)',
          description: 'Menos eficazes em cada banda, mas cobrem a faixa toda.',
          rows: MULTI_BAND_CHOKES.map((c) => ({
            label: `${formatNumber(c.lowMHz, 1)} a ${formatNumber(c.highMHz, 0)} MHz`,
            value: `${feetText(c.lengthFt)}, ${turnsText(c.turns)} espiras`,
          })),
        },
        {
          title: 'Com ferrite (receitas do mesmo capítulo, sem cálculo)',
          rows: FERRITE_RECIPES.map((r) => ({ label: r.name, value: r.recipe, note: r.range })),
        },
      ],
      assumptions: [
        { name: 'Dados', value: 'Comprimentos e espiras medidos com medidor de impedância, como publicados', source: CHOKE_SOURCE },
        { name: 'Montagem', value: 'Espiras lado a lado (rolo de corda), presas com fita, perto da antena', source: CHOKE_SOURCE },
        { name: 'Ferrite', value: 'Receitas W2DU e FT240-43', source: 'ARRL Antenna Book, 19ª ed., p. 26-22' },
      ],
      warnings: [
        {
          level: 'info',
          message:
            'Não funciona com fita paralela (twin lead): as espiras vizinhas acoplam demais (ARRL). Só para cabo coaxial.',
        },
        {
          level: 'warning',
          message:
            'Em transmissão, confira se o choke de ferrite esquenta nos primeiros testes com potência: o ARRL avisa que o ' +
            'núcleo aquece por perdas bem antes de saturar. O choke de espiras de cabo não tem núcleo e não tem esse problema.',
        },
        {
          level: 'info',
          message: 'Para VHF e UHF, a tabela não serve: veja a ferramenta "Choke de manga (VHF/UHF)", com o tubo de λ/4.',
        },
      ],
    };
  },
};
