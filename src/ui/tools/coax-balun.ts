import { formatLength, formatNumber, lengthResolutionForFrequency } from '../../core/units';
import { halfWaveBalun } from '../../matching/coax-balun';
import { type Tool, cableAssumptions, cableField, getCable, num } from './types';

export const coaxBalunTool: Tool = {
  id: 'coax-balun',
  name: 'Balun 4:1 de coaxial',
  description:
    'Um laço de coaxial de meia onda (elétrica) liga uma carga balanceada de 200 Ω, como um dipolo ' +
    'dobrado, a um cabo de 50 Ω. Usado em VHF/UHF, onde o laço fica curto.',
  fields: [
    { kind: 'number', key: 'fMHz', label: 'Frequência', unit: 'MHz', defaultValue: 145 },
    { kind: 'number', key: 'z0', label: 'Impedância do cabo principal', unit: 'Ω', defaultValue: 50 },
    cableField('cable', 'Cabo do laço', 'belden-8259', 'Normalmente o mesmo tipo do cabo principal.'),
  ],
  run(values) {
    const fMHz = num(values, 'fMHz');
    const cable = getCable(values, 'cable');
    const r = halfWaveBalun({ fMHz, unbalancedOhms: num(values, 'z0'), velocityFactor: cable.velocityFactor });

    return {
      sections: [
        {
          title: 'Balun',
          rows: [
            {
              label: 'Comprimento do laço',
              value: formatLength(r.loopLengthM, lengthResolutionForFrequency(fMHz)),
              note: 'Medido entre os dois pontos em que o vivo do laço se liga aos terminais da antena.',
            },
            { label: 'Impedância do lado balanceado', value: `${formatNumber(r.balancedOhms, 0)} Ω` },
          ],
        },
      ],
      assumptions: [
        ...cableAssumptions(cable),
        { name: 'Princípio', value: 'Laço de λ/2 elétrico atrasa 180°: relação 4:1', source: 'ARRL Antenna Book (baluns de linha)' },
      ],
      warnings: [
        {
          level: 'warning',
          message:
            'Banda estreita: a relação 4:1 só vale perto da frequência de projeto. Confira a ROE na faixa de uso.',
        },
        {
          level: 'info',
          message:
            'Chokes de ferrite e de espiras de coaxial (baluns de corrente 1:1) ainda não estão na ' +
            // TODO(fonte): fonte pendente para o texto abaixo.
            'ferramenta: o cálculo depende de dados de núcleo e de medições.',
        },
      ],
    };
  },
};
