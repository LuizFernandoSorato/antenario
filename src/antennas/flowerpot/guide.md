# Flowerpot (dipolo coaxial vertical)

## 1. Visão geral

A flowerpot ("vaso de flor") é um **dipolo vertical de meia onda** feito de um único cabo
coaxial, montado dentro de um tubo de PVC. Não é um ground plane nem uma antena alimentada na
ponta: é um dipolo alimentado de um jeito esperto (G4NSJ).

- **Elemento de cima (A):** a ponta do cabo, sem capa e sem malha. O vivo, com o dielétrico, é
  o braço de cima do dipolo.
- **Elemento de baixo (B):** o próprio coaxial, inteiro. A face **externa** da malha é o braço
  de baixo; por dentro, o sinal segue até o ponto de alimentação (onde a malha termina).
- **Bobina (choke):** espiras do mesmo cabo enroladas no tubo. Ela barra a corrente na face
  externa da malha e marca o fim do braço de baixo. Sem ela, o cabo inteiro até o rádio vira
  antena.

O nome vem de quem escondeu uma num vaso de flores: é uma ótima antena discreta.

- **Uso:** recepção e transmissão, típica de 2 m e 6 m (repetidoras, FM simplex, escuta).
- **Polarização:** vertical.
- **Ganho:** o de um dipolo de meia onda, ≈ 2,15 dBi, omnidirecional no plano horizontal.
- **Impedância:** perto de 50 Ω: o VK2ZOI mediu ROE ≈ 1,0:1 nos protótipos dele.

Os braços ficam mais curtos que λ/4 (≈ 0,89 e 0,87 de λ/4) porque o dielétrico do cabo, a capa
e o tubo encurtam a onda. As medidas vêm dos protótipos do VK2ZOI, feitos com **RG-58 em
conduíte elétrico cinza**.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Cabo | RG-58 com malha trançada e dielétrico sólido (VF 0,66), uma peça só até o rádio | O mesmo; evite cabo de espuma ou com folha metálica |
| Tubo | Conduíte elétrico cinza de PVC de 25 mm (2 m) ou 50 mm (6 m) | Outro tubo de PVC (as medidas mudam um pouco: ajuste) |
| Tampa | Tampa de conduíte | Tampa de cano de PVC |
| Linha | Linha de pesca de náilon | Qualquer fio de náilon fino |
| Vedação | Termorretrátil (com cola, de preferência) | Fita de autofusão + fita isolante |
| Conector | PL-259 ou o do seu rádio | — |

## 3. Ferramentas

Trena, estilete para descascar o coaxial, furadeira (broca de ≈ 6 mm), lima, soprador de ar
quente para o termorretrátil, ferro de solda para o conector, e um **NanoVNA** ou **medidor de
ROE**.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o elemento de cima, **B** o elemento de baixo,
   **C** a parte que irradia (A + B), **D** o cabo gasto na bobina e **E** o comprimento da
   bobina (a distância entre os furos do tubo). A seção "Montagem" da ferramenta mostra o
   número de espiras.
2. Corte o tubo com sobra: a parte de cima precisa de **C** mais uma folga até a tampa, e a de
   baixo, espaço para prender a antena no suporte.
3. Fure o tubo em dois pontos, separados por **E**, na altura do início da bobina. Lime os furos
   para o cabo não dobrar em canto vivo.
4. Numa ponta do cabo, tire a capa e a malha num trecho um pouco maior que **A**. Não corte o
   vivo nem o dielétrico. Amarre a linha de náilon na ponta.
5. Do fim da malha, meça **B** pelo cabo e marque: é onde começa a bobina.
6. Passe o elemento de cima por dentro do tubo, entrando pelo furo de cima, até a marca chegar no
   furo. Puxe a linha de náilon para deixar o elemento reto.
7. Enrole as espiras encostadas em volta do tubo e passe o resto do cabo pelo furo de baixo, sem
   deixar a marca sair do lugar.
8. Prenda a linha de náilon num entalhe da borda do tubo; a tampa vai segurá-la.
9. Ponha o conector e faça o ajuste (seção 6). Só depois tampe o tubo.
10. Vede o fim da malha e os furos com termorretrátil. **Não tampe o fundo do tubo:** a água
    condensada precisa sair.

## 5. Alimentação e balun

A própria bobina é o choke: ela faz o papel do balun. O cabo segue inteiro, sem emendas, até o
rádio. Na ressonância, a impedância fica perto de 50 Ω e não precisa de rede de casamento.

A bobina deve ressoar 5 a 6 % abaixo da frequência de operação (VK2ZOI). A ferramenta escolhe
o número de espiras pela tabela dele. Espiras mais apertadas deixam o mínimo da ROE mais fundo e
estreito; mais espaçadas, mais largo e mais alto. Para uma frequência só, a ferramenta arredonda
para meia espira a menos; para a faixa toda, para meia espira a mais.

## 6. Ajuste

O ajuste é no **elemento de cima (A)**: o de baixo fica fixo pela marca da bobina.

1. Com a antena na posição final (ou o mais perto disso), meça a ROE varrendo a faixa.
2. Se a ROE mínima estiver **abaixo** da frequência desejada, a antena está comprida: apare um
   pouco a ponta de cima e meça de novo.
3. Se estiver **acima**, o elemento ficou curto: solde um pedaço de fio (ou da malha retirada)
   na ponta.
4. Para estimar o corte: `A_novo ≈ A_atual × f_medida / f_desejada` (aproximado, porque só um
   braço muda).

O VK2ZOI diz que, com as medidas dele, quase não é preciso aparar. Objetos por perto mudam a
ROE: o G4NSJ mediu 1:1 com a antena no ar livre e 1,4:1 dentro do sótão.

## 7. Erros comuns

- Usar cabo com blindagem de folha metálica: ela quebra nas curvas da bobina.
- Usar RG-58 de espuma ou outro cabo: o elemento de cima muda de tamanho.
- Deixar a marca do início da bobina escorregar ao enrolar (muda o elemento de baixo).
- Bobina com espiras frouxas ou fora da contagem.
- Tampar o fundo do tubo (a água condensada fica presa).
- Montar sem tubo e usar as medidas do conduíte sem ajustar (sem tubo, os elementos ficam 2 a 3 %
  mais compridos, segundo o VK2ZOI).

## 8. Notas de transmissão e segurança

- **Tensão alta na ponta:** a ponta de cima do elemento **A** tem tensão alta de RF ao
  transmitir. Mantenha a tampa no lugar e a antena fora do alcance de pessoas.
- **Dentro de casa:** a flowerpot costuma ir para o sótão ou a varanda, perto de pessoas. Estime
  a distância segura na ferramenta "Exposição a RF" e confira os limites vigentes da Anatel.
- **Potência:** o RG-58 limita a potência; confira o máximo no datasheet para a frequência.
- **Legislação:** transmitir exige licença de radioamador emitida pela **Anatel**. Confira o
  plano de bandas e os limites de potência **vigentes** na Anatel e na LABRE antes de operar.
- **Segurança física da instalação:**
  - Nunca instale perto da rede elétrica. Se a antena ou o mastro cair, não pode alcançar fios.
  - Aterre o mastro e a malha do cabo na entrada da casa.
  - Use protetor contra descargas atmosféricas e desconecte o cabo do rádio em tempestades.
  - Trabalho em altura: use equipamento de proteção e nunca trabalhe sozinho.

## 9. Referências

- J. Bishop, VK2ZOI, "Half-Wave Flower Pot Antenna" (vk2zoi.com): medidas dos protótipos de 2 m
  e 6 m, curvas de ROE medidas e tabela de bobinas de RG-58.
- G4NSJ, "Flowerpot Antennas" (radio-workshop.co.uk): o que é a flowerpot.
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.2 e §4.6 (dipolo de meia
  onda).
- Datasheet do RG-58 (Belden 8259): diâmetro externo e fator de velocidade.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
