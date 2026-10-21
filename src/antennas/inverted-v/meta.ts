import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'inverted-v',
  name: 'V invertido (inverted-V)',
  description:
    'Dipolo de meia onda com o centro preso no alto de um único mastro e os braços descendo inclinados até as pontas. ' +
    'Ocupa menos espaço que o dipolo reto e tem impedância mais perto de 50 Ω, com um pouco menos de ganho.',
  // Critério de uso prático desta ferramenta (não é limite físico): de 160 m (1,8 MHz) até o 2 m, como a double bazooka.
  // É uma antena de HF por natureza (um mastro só no lugar de dois); em VHF costuma-se usar outras.
  typicalRangeMHz: { min: 1.8, max: 148 },
  // Modelo (espaço livre) com 120° entre os braços: ≈ 57 Ω; com 90°: ≈ 41 Ω (v-model.ts, conferido com o Cebik).
  nominalImpedanceOhms: 50,
  polarization: 'Linear, horizontal (os braços inclinados somam um pouco de componente vertical fora do eixo)',
  // Diretividade no espaço livre com 120° (v-model.ts); o valor da tela vem do modelo para o ângulo escolhido.
  approxGainDbi: 1.95,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 7.1, toSi: 1, min: 0 },
    {
      key: 'shorteningFactor',
      label: 'Fator de encurtamento (K) do dipolo reto',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'O mesmo K do dipolo (típico 0,95). A ferramenta aplica por cima dele o alongamento que o V precisa.',
    },
    {
      key: 'apexAngleDeg',
      label: 'Ângulo entre os braços (no ápice)',
      unit: '°',
      defaultValue: 120,
      toSi: 1,
      min: 60,
      max: 180,
      help: 'Típico de 90° a 120°. 180° é o dipolo reto. Quanto mais fechado, menor a impedância e o ganho.',
    },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do fio',
      unit: 'mm',
      defaultValue: 2,
      toSi: 0.001,
      min: 0,
      help: 'Entra no modelo do alongamento, da impedância e da banda. AWG 12 ≈ 2,05 mm; fio de 2,5 mm² ≈ 1,8 mm.',
    },
    {
      key: 'centerGap',
      label: 'Espaço central (isolador)',
      unit: 'mm',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help: 'Distância entre os dois braços no ponto de alimentação.',
    },
    {
      key: 'apexHeight',
      label: 'Altura do ápice (centro) acima do chão',
      unit: 'm',
      defaultValue: 10,
      toSi: 1,
      min: 0,
      help: 'Serve para calcular a altura das pontas. O cálculo é no espaço livre: a altura não muda as medidas.',
    },
  ],
};
