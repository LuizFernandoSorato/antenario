import { circularSenseParam } from '../circular';
import { REFLECTOR_PLATE, REFLECTOR_TUBES } from './reflector-model';
import type { AntennaMeta } from '../types';

export const meta: AntennaMeta = {
  id: 'turnstile',
  name: 'Turnstile (dipolos cruzados)',
  description:
    'Dois dipolos de meia onda cruzados a 90°, alimentados com defasagem de 90° (um deles por um trecho de cabo de ' +
    '1/4 de onda). Com um refletor a 1/4 de onda atrás, dá polarização circular apontando para cima (satélites). ' +
    'Sem refletor, é omnidirecional na horizontal, com polarização linear horizontal.',
  // Critério de uso prático desta ferramenta (não é limite físico): abaixo de 100 MHz os dipolos passam de 1,4 m;
  // acima de 1 GHz as tolerâncias de corte ficam menores que 1 mm.
  typicalRangeMHz: { min: 100, max: 1000 },
  // Dois dipolos de ≈73 Ω em paralelo (um pela linha de 1/4 de onda de 73 Ω): ≈36,5 Ω. Ver calc().
  nominalImpedanceOhms: 36.5,
  polarization: 'Circular (com refletor, no eixo) ou linear horizontal (sem refletor, na horizontal)',
  // Sem valor típico com fonte aqui; ver calc().expected.gain.
  approxGainDbi: null,
  usage: { rx: true, tx: true },
  outdoor: true,
  params: [
    { key: 'frequencyMHz', label: 'Frequência de projeto', unit: 'MHz', defaultValue: 137.5, toSi: 1, min: 0 },
    {
      key: 'shorteningFactor',
      label: 'Fator de encurtamento dos dipolos (K)',
      unit: '',
      defaultValue: 0.95,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Típico 0,95 (ver o dipolo). Condutores mais grossos pedem K menor.',
    },
    {
      key: 'conductorDiameter',
      label: 'Diâmetro do condutor dos dipolos',
      unit: 'mm',
      defaultValue: 2,
      toSi: 0.001,
      min: 0,
      help: 'Como no dipolo: o K continua manual (curva do ARRL sem fonte). Condutores mais grossos pedem K menor.',
    },
    {
      key: 'centerGap',
      label: 'Espaço central (isolador) de cada dipolo',
      unit: 'mm',
      defaultValue: 0,
      toSi: 0.001,
      min: 0,
      help: 'Distância entre os dois braços de cada dipolo no ponto de alimentação. Conta dentro do comprimento total A.',
    },
    {
      key: 'velocityFactor',
      label: 'Fator de velocidade do coaxial de fase (VF)',
      unit: '',
      defaultValue: 0.66,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Confira no datasheet do SEU cabo. Polietileno sólido ≈ 0,66; espuma 0,78 a 0,85.',
    },
    {
      key: 'reflector',
      kind: 'boolean',
      label: 'Com refletor a 1/4 de onda atrás dos dipolos',
      unit: '',
      defaultValue: 1,
      toSi: 1,
      min: 0,
      max: 1,
      help: 'Marcado: refletor a 1/4 de onda atrás dos dipolos (circular para cima). Desmarcado: omnidirecional na horizontal.',
    },
    {
      key: 'reflectorKind',
      kind: 'choice',
      label: 'Tipo de refletor',
      unit: '',
      defaultValue: REFLECTOR_PLATE,
      toSi: 1,
      options: [
        { value: REFLECTOR_PLATE, label: 'Chapa ou tela quadrada (melhor)' },
        { value: REFLECTOR_TUBES, label: 'Um tubo alinhado com cada dipolo (cruz)' },
      ],
      help: 'Só vale com refletor. A cruz de tubos é mais simples de montar, mas irradia bem mais para trás e perde ganho (valores no aviso do resultado).',
    },
    circularSenseParam(),
  ],
};
