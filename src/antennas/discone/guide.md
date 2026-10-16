# Discone

## 1. Visão geral

Um **disco** horizontal em cima e um **cone** invertido embaixo, com o vértice do cone quase
encostado no centro do disco. O coaxial sobe por dentro do cone: a **malha** liga no vértice do
cone e o **vivo** no centro do disco.

- **Uso:** recepção e transmissão. É a antena de escuta de banda larga por excelência, com SDR e
  scanner: aviação, rádio local, VHF e UHF, tudo numa antena só.
- **Polarização:** vertical.
- **Diagrama:** omnidirecional no plano horizontal.
- **Banda:** a partir da menor frequência de projeto, por várias oitavas (o artigo-base trata de 1 a 5
  oitavas). Ao contrário de um dipolo, não é "uma frequência só".
- **ROE:** oscila ao longo da banda, com vales e picos. Só cai bem abaixo do primeiro vale.

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

O cone foi dimensionado para uma impedância nominal de projeto (50 Ω). Não há casamento especial: o
ângulo do cone **é** o casamento (Z0 = 60·ln cot(θ/2)). Use choke de corrente no coaxial. Se a folga entre
o disco e o cone mudar, a ROE muda: ela é o ajuste fino.

## 6. Ajuste

1. Meça a ROE de ponta a ponta da banda de interesse (NanoVNA em varredura).
2. A ROE terá vales e picos. Procure posicionar os vales nas frequências em que você mais usa.
3. Variar a folga **F** e o diâmetro do disco desloca os vales. Com hastes, inclinar as hastes do cone
   para dentro ou para fora também muda a impedância (é uma vantagem das hastes sobre a chapa).
4. Para transmitir, use só as frequências com ROE baixa.

## 7. Erros comuns

- Disco grande demais e cone comprido demais: o desenho certo é o disco de raio R ≈ 0,72·sen θ × L.
- Ligar o vivo no cone e a malha no disco (invertido).
- Esquecer o choke: o cabo vira parte da antena.
- Primeira ressonância sobre a menor frequência de uso: a ROE dispara abaixo dela. O projeto deixa a
  ressonância em 0,7 vez a menor frequência por esse motivo.
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

- S. Stearns (K6OIK), "All About the Discone Antenna: Antenna of Mysterious Origin and Superb Broadband
  Performance", *QEX*, jan/fev 2007, pp. 37-43 (Eqs. 1 a 5; regra de 0,7 da menor frequência).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
