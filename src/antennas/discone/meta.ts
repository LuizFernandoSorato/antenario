import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'discone',
  name: 'Discone',
  description:
    'Um disco sobre um cone invertido, alimentados no ponto onde se encontram (o cabo sobe por dentro do ' +
    'cone). É omnidirecional e de banda larguíssima: uma só antena cobre de VHF a UHF e além. A preferida de ' +
    'quem escuta com SDR e scanner, de aviação a rádio local.',
  // Critério de uso prático desta ferramenta (não é limite físico): abaixo de 30 MHz o cone passa de 2,5 m;
  // acima de 2,5 GHz o disco e a folga têm poucos milímetros. O artigo-base mostra uso até 2,4 GHz (Wi-Fi).
  typicalRangeMHz: { min: 30, max: 2500 },
  nominalImpedanceOhms: 50,
  polarization: 'Vertical',
  // Sem valor típico com fonte; ver calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    {
      key: 'frequencyMHz',
      label: 'Menor frequência de operação',
      unit: 'MHz',
      defaultValue: 100,
      toSi: 1,
      min: 0,
      help:
        'O cone mede λ/4 nesta frequência (regra do ARRL e do Rothammel), e a antena cobre daí para cima. No modelo desta ' +
        'ferramenta, a ROE só fica abaixo de 2:1 a partir de ≈ 1,4 vez este valor.',
    },
    {
      key: 'rodCount',
      label: 'Hastes do cone e do disco',
      unit: '',
      defaultValue: 8,
      toSi: 1,
      min: 3,
      help: 'Cone e disco podem ser de chapa ou de hastes. Com hastes: 8 é comum, 16 melhora um pouco.',
    },
    { key: 'rodDiameter', label: 'Diâmetro das hastes', unit: 'mm', defaultValue: 4, toSi: 0.001, min: 0 },
    {
      key: 'centerGap',
      label: 'Folga disco–cone (0 = automática)',
      unit: 'mm',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help:
        'Espaço isolante entre o disco e o vértice do cone, onde liga o coaxial. 0 usa a proporção do exemplo de Stearns (11 mm para um cone de 270 mm). ' +
        'Aqui a folga NÃO entra dentro de A e E: as medidas são das hastes, e a folga fica entre elas.',
    },
  ],
};
