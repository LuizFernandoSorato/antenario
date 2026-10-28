import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { SLEEVE_DIAMETER_RATIO, sleeveBalun } from '../../matching/sleeve-balun';
import { sleeveBalunDiagram } from './diagrams';
import sleeveGuide from './guides/coax-sleeve.md?raw';
import { type Tool, cableAssumptions, cableField, getCable, num } from './types';

/** Abaixo disso a manga passa de ≈ 2,3 m: em HF a ferramenta "Choke de coaxial" (bobina do cabo) é o caminho. */
const HF_UPPER_MHZ = 30;

export const coaxSleeveTool: Tool = {
  id: 'coax-sleeve',
  name: 'Choke de manga (VHF/UHF)',
  guide: sleeveGuide,
  description:
    'Balun de corrente 1:1 para VHF e UHF: um tubo de λ/4 em volta do coaxial, fechado embaixo e aberto perto da ' +
    'antena, trava a corrente na face externa da malha. Medidas do ARRL Antenna Book, conferidas com o Rothammel.',
  fields: [
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    cableField('cable', 'Cabo que passa pela manga', 'belden-8259'),
    {
      kind: 'number',
      key: 'odMm',
      label: 'Diâmetro externo medido do cabo (0 = do datasheet)',
      unit: 'mm',
      defaultValue: 0,
      help: 'Use se o seu cabo for de outro fabricante, ou se a manga for passar sobre um tubo em vez do cabo.',
    },
  ],
  run(values) {
    const fMHz = num(values, 'fMHz');
    const cable = getCable(values, 'cable');
    const odMm = num(values, 'odMm');
    if (!Number.isFinite(odMm) || odMm < 0) throw new RangeError(`Diâmetro inválido: ${odMm}.`);
    const diameterMm = odMm > 0 ? odMm : cable.outerDiameterMm;
    const r = sleeveBalun({ fMHz, cableDiameterM: diameterMm / 1000 });
    const res = lengthResolutionForFrequency(fMHz);

    const warnings: ToolWarnings = [
      {
        level: 'warning',
        message:
          'Funciona numa frequência só (ARRL): corte a manga para a mesma frequência da antena, um pouco comprida, e ' +
          'encurte pela borda de cima até ressoar.',
      },
      {
        level: 'info',
        message:
          'Em VHF e UHF a manga precisa ficar simétrica em relação ao centro da antena, senão a própria antena induz ' +
          'corrente na face de fora do tubo (ARRL).',
      },
      {
        level: 'warning',
        message:
          'Transmissão: a borda aberta é um ponto de impedância muito alta, com tensão de RF alta. Mantenha o cabo ' +
          'centrado (espaçador isolante) e a borda longe de outras partes metálicas.',
      },
    ];
    if (fMHz < HF_UPPER_MHZ) {
      warnings.unshift({
        level: 'info',
        message: `Em ${formatNumber(fMHz, 1)} MHz a manga mede ${formatLength(r.lengthM, 'cm')}. Em HF, a ferramenta "Choke de coaxial" (bobina do próprio cabo) é mais prática.`,
      });
    }

    return {
      diagrams: [sleeveBalunDiagram({ lengthM: r.lengthM, tubeMinM: r.tubeDiameterMinM, tubeMaxM: r.tubeDiameterMaxM, res })],
      sections: [
        {
          title: `Manga de λ/4 (${formatNumber(fMHz, 1)} MHz)`,
          rows: [
            {
              label: 'Comprimento interno (A)',
              value: formatLength(r.lengthM, res),
              note: 'Do disco do fundo à borda aberta. É λ/4 de linha de ar, com VF ≈ 0,95 (234/f pés).',
            },
            {
              label: 'Diâmetro interno do tubo (B)',
              value: `${formatLength(r.tubeDiameterMinM, 'mm')} a ${formatLength(r.tubeDiameterMaxM, 'mm')}`,
              note: `${SLEEVE_DIAMETER_RATIO.min} a ${SLEEVE_DIAMETER_RATIO.max} vezes o diâmetro do cabo (${formatNumber(diameterMm, 2)} mm).`,
            },
            {
              label: 'Impedância da linha da manga',
              value: `${formatNumber(r.lineImpedanceMinOhms, 0)} a ${formatNumber(r.lineImpedanceMaxOhms, 0)} Ω`,
              note: 'Só informativa: o que importa é a impedância muito alta na borda aberta, com a manga ressonante.',
            },
          ],
        },
        {
          title: 'Alternativa: ferrite em VHF (sem cálculo)',
          description: 'Contas de ferrite passadas sobre o cabo, logo abaixo do ponto de alimentação (como o balun W2DU).',
          rows: [
            { label: 'Material', value: 'Tipo 43 (de 30 a 250 MHz) ou tipo 61', note: 'ARRL: 43 ou 61 é "a melhor escolha" em VHF.' },
            {
              label: 'Quantidade',
              value: 'Mais contas, mais impedância',
              note: 'A impedância é aproximadamente proporcional ao comprimento ocupado pelas contas. As fontes não dão receita para VHF/UHF.',
            },
          ],
        },
      ],
      assumptions: [
        { name: 'Comprimento', value: 'L = 234/f(MHz) pés (linha de ar, VF ≈ 0,95)', source: 'ARRL Antenna Book, 19ª ed., p. 26-23, Fig 33B' },
        {
          name: 'Diâmetro do tubo',
          value: `${SLEEVE_DIAMETER_RATIO.min} a ${SLEEVE_DIAMETER_RATIO.max} vezes o do cabo`,
          source: 'Rothammel, "Antene", §25.1.2 (3:1 a 4:1); ARRL, p. 26-23 (2" para cabo de 1/2")',
        },
        { name: 'Conferência', value: 'Exemplo de 2 m do Rothammel: 495 mm; a fórmula dá 492 mm a 145 MHz', source: 'Rothammel, "Antene", Fig. 25.2' },
        { name: 'Impedância da linha', value: 'Z0 = 138·log10(D/d), linha coaxial de ar', source: 'ARRL Antenna Book, 19ª ed., p. 24-14, Eq 26' },
        {
          name: 'Diâmetro do cabo',
          value: odMm > 0 ? `${formatNumber(odMm, 2)} mm, medido por você` : `${formatNumber(cable.outerDiameterMm, 2)} mm, do datasheet`,
        },
        ...(odMm > 0 ? [] : cableAssumptions(cable).filter((a) => a.name !== 'Cabo')),
        { name: 'Ferrite', value: 'Tipo 43 de 30 a 250 MHz; 43 ou 61 em VHF', source: 'ARRL Antenna Book, 19ª ed., p. 26-22 e 26-23' },
      ],
      warnings,
    };
  },
};

type ToolWarnings = ReturnType<Tool['run']>['warnings'];
