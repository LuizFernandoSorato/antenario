# QFH (hélice quadrifilar)

## 1. Visão geral

Duas espiras de fio, uma **maior** e outra **menor**, torcidas meia volta em torno de um cilindro e cruzadas a 90°.
A diferença de tamanho cria um defasamento de 90° entre as duas, e isso dá **polarização circular**. O diagrama é
quase hemisférico, então a antena recebe satélites de órbita baixa sem rastreamento.

- **Uso:** recepção (satélites meteorológicos de 137 MHz, por exemplo). Esta ferramenta não traz dados de transmissão para a QFH.
- **Polarização:** circular. O sentido de enrolamento define direita ou esquerda; satélites de 137 MHz usam circular à direita.
- **Ganho:** o modelo por momentos (ver as referências) dá ≈ 4,8 dBi no zênite, com −6 a −7 dB no horizonte e ≈ −16 dB para baixo; a faixa de 3 a 5 dBic vem de uma fonte secundária. Não há medida com fonte aqui (TODO). O que importa na prática é o diagrama largo.
- **Aviso importante:** as medidas são as de uma calculadora publicada para 137,5 MHz, **escaladas** pela frequência. Meça e ajuste.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Condutor | Tubo de cobre ou alumínio de 4 a 7 mm | Fio rígido de cobre de 4 mm; vareta |
| Suporte do cilindro | Tubo de PVC | Cano de esgoto, com cortes para encaixar o condutor |
| Coaxial | 50 Ω, curto | RG-58 |
| Pré-amplificador (opcional) | LNA para 137 MHz | — |
| Caixa de ligação | Caixa estanque | Pote plástico vedado |

## 3. Ferramentas

Trena, paquímetro, serra, gabarito ou fita para marcar a torção, ferro de solda de 60 W, NanoVNA.

## 4. Passo a passo

1. Calcule as medidas com a sua frequência. **A** e **E** são o fio de cada espira; **B**/**F** são as alturas e **C**/**G** os diâmetros internos.
2. Corte a espira maior com **A** e a menor com **E**, com sobra para ajuste.
3. Dobre cada espira em retângulo, depois torça meia volta (180°) sobre o cilindro, com a altura final **B** (maior) e **F** (menor).
4. Fixe as duas espiras no cilindro cruzadas a 90°, uma sobre a outra, no mesmo eixo.
5. Faça as ligações na caixa, conforme a seção 5.
6. Vede e instale na vertical, com visão livre do céu.

Os separadores (**D** na maior, **H** na menor) são valores da calculadora de origem; a função construtiva exata deles não consta da fonte. TODO(fonte).

## 5. Alimentação e casamento

Fontes de montagem alimentam a QFH com coaxial de 50 Ω. O arranjo de ligação das quatro pontas (qual fio vai ao vivo e qual à malha, e o
balun/choke) **não consta das fontes consultadas** para esta ferramenta. TODO(fonte): consulte a página de montagem de origem
(qsl.net/ik1hgi/qfh-2_hgi.htm) antes de ligar. Use um **choke** no cabo para evitar corrente de modo comum.

## 6. Ajuste

1. Meça a ROE com NanoVNA. Corte comprido e encurte aos poucos.
2. Mexa no cabo: se a ROE muda, o choke é insuficiente.
3. Confirme em recepção real: um passe de satélite mostra se a polarização e o diagrama estão certos.

## 7. Erros comuns

- Fazer as duas espiras do mesmo tamanho: a polarização circular desaparece.
- Torcer no sentido errado: a polarização fica invertida e perde-se sinal.
- Espiras fora de 90° ou fora do eixo.
- Esquecer o choke.
- Água dentro do suporte.

## 8. Notas de segurança

- Instale longe de rede elétrica e aterre o mastro e a malha do cabo.
- Proteja contra descargas atmosféricas e desligue o rádio em tempestades.
- Trabalho em altura exige equipamento de proteção e companhia.
- Esta ferramenta não cobre transmissão com QFH. Se for transmitir, é preciso licença da **Anatel** e dados de potência e tensão que não estão aqui.

## 9. Referências

- John Coppens, calculadora de QFH (jcoppens.com), saída a 137,5 MHz reproduzida em qsl.net/ik1hgi/qfh-2_hgi.htm (consultada em 2026-10-16).
- rfwireless-world.com, "QFH antenna" (condutor de 7 mm), usada só para medir a sensibilidade ao condutor.
- Padrão de irradiação: método dos momentos (Harrington, 1968) sobre as duas espiras de fio de 4,1 mm, com a geometria reconstruída das medidas da calculadora de Coppens (os "separadores" conferem: o vertical é o comprimento do braço helicoidal e o horizontal é o diâmetro entre os centros do fio) e as duas espiras alimentadas no topo, em amplitude igual e 90° de diferença (suposto ideal; sem cilindro de suporte nem coaxial). O padrão resultante é um cardioide com razão axial < 1 dB no zênite. Não foi comparado com medidas; o sentido de polarização não é afirmado.
- C. C. Kilgus, publicações de 1969 (IEEE AP-17) e 1970 (Microwave Journal) sobre a hélice quadrifilar. Citadas por resumos secundários; não consultadas diretamente.
