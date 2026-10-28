# Discone

## 1. Visão geral

Um **disco** horizontal em cima e um **cone** invertido embaixo, com o vértice do cone quase
encostado no centro do disco. O coaxial sobe por dentro do cone: a **malha** liga no vértice do
cone e o **vivo** no centro do disco.

- **Uso:** recepção e transmissão. É a antena de escuta de banda larga por excelência, com SDR e
  scanner: aviação, rádio local, VHF e UHF, tudo numa antena só.
- **Polarização:** vertical.
- **Diagrama:** omnidirecional no plano horizontal.
- **Medidas:** regra do ARRL Antenna Book e do Rothammel: a lateral do cone mede **λ/4 na menor frequência**,
  a base do cone tem o mesmo diâmetro que a lateral (semiângulo de 30°) e o disco tem 0,7 da lateral.
- **Banda:** a partir da menor frequência, por várias oitavas (o Rothammel cita 1:8 com ROE ≤ 1,5). Ao contrário
  de um dipolo, não é "uma frequência só".
- **ROE:** oscila ao longo da banda, com vales e picos. Na ponta de baixo, o modelo desta ferramenta é mais
  pessimista que os livros: ROE ≈ 11:1 na menor frequência e abaixo de 2:1 só a partir de ≈ 1,4 vez ela (sem medida).
  Se a ponta de baixo importar, informe uma frequência menor que a desejada.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Cone e disco | Chapa de alumínio ou cobre, ou hastes de alumínio | Hastes de vareta de solda ou arame rígido, tela metálica fina, tampa metálica |
| Cone (forma) | Folha de chapa enrolada | 8 ou 16 hastes presas em duas argolas de PVC |
| Isolante | Disco e suporte de PVC, nylon ou acrílico | Tampa e tubo de PVC de esgoto |
| Conector | N ou SO-239 de painel | Conector N de painel (melhor em UHF) |
| Cabo | Coaxial de 50 Ω | — |
| Choke | Ferrite em clipe no coaxial | Espiras de coaxial abaixo do cone |

## 3. Ferramentas

Trena, serra, tesoura de chapa ou serra de arco, furadeira, ferro de solda, alicate, gabarito de papel
para o cone e NanoVNA ou analisador de antena.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é a lateral (geratriz) do cone, **B** o diâmetro da base do
   cone, **C** a altura, **D** o diâmetro do disco, **E** o raio do disco (cada haste) e **F** a folga
   isolante entre o disco e o vértice do cone.
2. **Com chapa:** corte o disco com diâmetro **D**. Para o cone, faça um gabarito de papel (setor de
   círculo de raio **A**) e enrole até a base ter diâmetro **B**.
3. **Com hastes:** corte as hastes do cone com comprimento **A** e as do disco com **E** (a ferramenta
   mostra a quantidade). Prenda as hastes do cone em duas argolas: uma pequena no vértice e uma
   grande na base, com diâmetro **B**.
4. Prenda o disco num suporte isolante, a **F** de distância acima do vértice do cone.
5. Passe o coaxial por dentro do cone. Ligue a malha ao vértice do cone e o vivo ao centro do disco, com
   o menor trecho de fio possível.
6. Instale o choke no coaxial logo abaixo do cone.
7. Vede o conector e as soldas, e mantenha a antena na vertical.

## 5. Alimentação e casamento

Não há casamento especial: o ARRL diz que a antena casa bem com coaxial de 50 Ω na faixa, e o Rothammel usa
a mesma forma com cabo de 60 Ω. Use choke de corrente no coaxial. Se a folga entre o disco e o cone mudar, a ROE
muda: ela é o ajuste fino.

## 6. Ajuste

1. Meça a ROE de ponta a ponta da banda de interesse (NanoVNA em varredura).
2. A ROE terá vales e picos. Procure posicionar os vales nas frequências em que você mais usa.
3. A folga **F** pode ser informada (0 = automática, pela proporção do exemplo de Stearns); ela NÃO entra dentro de **A** e **E**. Variar a folga **F** e o diâmetro do disco desloca os vales. Com hastes, inclinar as hastes do cone
   para dentro ou para fora também muda a impedância (é uma vantagem das hastes sobre a chapa).
4. Para transmitir, use só as frequências com ROE baixa.

## 7. Erros comuns

- Disco grande demais: o desenho certo é o disco com 0,7 da lateral do cone.
- Ligar o vivo no cone e a malha no disco (invertido).
- Esquecer o choke: o cabo vira parte da antena.
- Esperar ROE baixa exatamente na menor frequência. O Rothammel diz que o limite real fica ≈ 20 % abaixo da
  frequência de projeto; o modelo por momentos desta ferramenta diz o contrário (ROE < 2:1 só a partir de ≈ 1,4 vez).
  Nenhum dos dois foi medido aqui: confira a ROE na ponta de baixo antes de transmitir nela. O artigo de Stearns
  (QEX 2007) prefere um cone ≈ 1,9 vez maior, com a primeira ressonância em 0,7 vez a menor frequência.
- Metal perto do disco (calha, grade, mastro grosso logo acima).

## 8. Notas de transmissão e segurança

- **Tensão alta de RF** no disco e na borda do cone: instale fora do alcance de pessoas.
- **Potência:** confira a potência máxima do cabo e dos conectores, e transmita só onde a ROE for baixa.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Cuidado com o trabalho em altura.

## 9. Referências

- ARRL Antenna Book, 21ª ed., p. 7-26, Fig 48 (D. Krupp, W8NWF): L = 246/f (pés), disco de 0,67 a 0,70·L, base do cone = L,
  folga de 2 a 12 polegadas. Base das medidas.
- K. Rothammel, *Antene* (tradução sérvia da 9ª ed. alemã), §25.1.4, p. 364–365: lado do cone de λ/4 na maior onda, disco de
  0,7 do lado (Fig. 25.5), faixa de 1:8 com ROE ≤ 1,5, ganho ≈ 3 dB abaixo do dipolo, exemplo de 85 a 500 MHz com cabo de 60 Ω.
  Base das medidas e da faixa.
- S. Stearns (K6OIK), "All About the Discone Antenna: Antenna of Mysterious Origin and Superb Broadband
  Performance", *QEX*, jan/fev 2007, pp. 37-43: proporção da folga automática, ROE com vales e picos e o projeto
  maior citado acima (comparação).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- Padrão de irradiação: método dos momentos (Harrington, 1968) sobre hastes de fio (cada par disco+cone é um fio com a fonte na folga), a λ/12 por trecho, no espaço livre e sem coaxial nem mastro. Verificado no limite de baixa frequência (dipolo curto, ≈ 1,6 dBi), na convergência com a discretização e na ROE mínima na faixa (< 1,5, como diz o Rothammel). Não foi comparado com padrões medidos; nas frequências altas o modelo mostra lóbulos e ondulação em azimute que dependem do número de hastes.
