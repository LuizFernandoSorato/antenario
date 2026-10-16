import { complex } from '../../core/complex';
import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { type StubTermination, designSingleStub } from '../../matching/single-stub';
import { type Tool, cableAssumptions, cableField, getCable, num, str } from './types';

export const singleStubTool: Tool = {
  id: 'single-stub',
  name: 'Casamento com stub',
  description:
    'Um pedaço de cabo (o stub) ligado em paralelo com a linha, a uma distância certa da antena, ' +
    'cancela a reatância e casa a impedância. Não precisa de componentes: só cabo.',
  fields: [
    { kind: 'number', key: 'rl', label: 'Resistência da antena (R)', unit: 'Ω', defaultValue: 30 },
    { kind: 'number', key: 'xl', label: 'Reatância da antena (X)', unit: 'Ω', defaultValue: 20 },
    { kind: 'number', key: 'z0', label: 'Impedância do cabo (Z0)', unit: 'Ω', defaultValue: 50 },
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    cableField('cable', 'Cabo (linha e stub)', 'belden-8267', 'Usado para o fator de velocidade.'),
    {
      kind: 'select',
      key: 'termination',
      label: 'Ponta do stub',
      defaultValue: 'short',
      options: [
        { value: 'short', label: 'Em curto (vivo ligado à malha)' },
        { value: 'open', label: 'Em aberto' },
      ],
    },
  ],
  run(values) {
    const zLoad = complex(num(values, 'rl'), num(values, 'xl'));
    const z0 = num(values, 'z0');
    const fMHz = num(values, 'fMHz');
    const cable = getCable(values, 'cable');
    const termination = str(values, 'termination') as StubTermination;
    const res = lengthResolutionForFrequency(fMHz);

    const solutions = designSingleStub({
      zLoad,
      z0,
      fMHz,
      lineVelocityFactor: cable.velocityFactor,
      stubVelocityFactor: cable.velocityFactor,
      termination,
    });

    return {
      sections: solutions.map((s, i) => ({
        title: `Solução ${i + 1}`,
        rows: [
          {
            label: 'Distância da antena até o ponto do stub',
            value: formatLength(s.distanceM, res),
            note: `${formatNumber(s.distanceWavelengths, 4)} λ no cabo`,
          },
          {
            label: `Comprimento do stub (${termination === 'short' ? 'em curto' : 'em aberto'})`,
            value: formatLength(s.stubM, res),
            note: `${formatNumber(s.stubWavelengths, 4)} λ no cabo`,
          },
        ],
      })),
      assumptions: [
        ...cableAssumptions(cable),
        { name: 'Fórmulas', value: 'Stub simples em paralelo', source: 'Pozar, Microwave Engineering, 4ª ed., §5.2' },
        { name: 'Linha', value: 'Sem perdas; distâncias medidas a partir dos terminais da antena' },
      ],
      warnings: [
        {
          level: 'info',
          message:
            'Prefira a solução com a menor distância e o menor stub: a banda de casamento é mais larga. ' +
            'O stub em curto também deixa a antena aterrada em corrente contínua (bom contra estática).',
        },
        {
          level: 'warning',
          message:
            'As distâncias contam a partir dos terminais da antena e incluem o comprimento elétrico dos ' +
            'conectores e do T. Corte o stub um pouco comprido e ajuste medindo a ROE.',
        },
      ],
    };
  },
};
