# V invertido (inverted-V)

## 1. Visão geral

O V invertido é um dipolo de meia onda montado de outro jeito: o centro (ponto de alimentação)
fica no alto de **um único mastro** e os dois braços descem inclinados até as pontas, presas
por cordas perto do chão. Visto de frente, parece a letra V de cabeça para baixo.

- **Uso:** recepção e transmissão. Muito usado em HF (80 m, 40 m, 20 m), onde levantar dois
  mastros para um dipolo reto é difícil.
- **Polarização:** linear, horizontal no essencial. A parte vertical dos braços soma um pouco
  de radiação na direção das pontas.
- **Ganho:** um pouco menor que o do dipolo reto: cerca de 0,2 dB a menos com 120° entre os
  braços e 0,4 dB a menos com 90° (espaço livre). Na prática, a diferença não se percebe
  (Cebik).
- **Impedância:** mais baixa que a do dipolo, e mais perto de 50 Ω: cerca de 57 Ω com 120° e
  41 Ω com 90° no espaço livre. Perto do chão ela cai ainda mais.
- **Padrão:** o "8" do dipolo fica mais redondo. As pontas, que no dipolo reto são um nulo,
  passam a receber e irradiar um pouco.

**O V precisa ser um pouco mais comprido que o dipolo reto.** Com os braços inclinados, a
ressonância sobe. Pelo modelo da ferramenta (que confere com o Cebik), o fio fica cerca de
0,8 % mais comprido com 120° e 1,9 % com 90°. A ferramenta já aplica esse alongamento.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Braços | Fio de cobre de 1,5–2,5 mm² | Fio de instalação elétrica (o isolamento encurta um pouco a ressonância) |
| Isolador do ápice | Peça comercial com SO-239 e furo para o mastro | Placa de PVC, acrílico ou fenolite |
| Isoladores das pontas | Isolador de porcelana ou plástico de engenharia | Pedaço de tubo de PVC furado |
| Mastro | Tubo de alumínio ou mastro telescópico de fibra | Cano de PVC grosso estaiado, bambu tratado |
| Cordas | Corda de náilon ou poliéster resistente a UV | Varal de náilon |
| Choke | Balun de corrente 1:1 comercial | Ferrites tipo "clip" no coaxial, ou espiras do próprio cabo |
| Vedação | Fita de autofusão + fita isolante | Silicone neutro por baixo da fita |

## 3. Ferramentas

Trena, alicate de corte, estilete para descascar o coaxial, ferro de solda, multímetro,
transferidor ou aplicativo de nível (para conferir o ângulo) e um **NanoVNA** ou **medidor de
ROE** para o ajuste.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o fio de ponta a ponta, **B** é cada braço,
   **C** é o espaço no isolador (se você informar um), **D** é o vão entre as pontas, **E** é
   quanto cada ponta desce em relação ao ápice e **F** é a altura das pontas.
2. Confira no terreno se cabe o vão **D** (mais as cordas) e se as pontas, a **F** do chão,
   ficam fora do alcance de pessoas.
3. Corte os dois braços com a medida **B**, com sobra (uns 2,5 % a mais) e mais a volta nos
   isoladores.
4. Prenda os braços nos terminais do isolador do ápice. Solde o coaxial: a malha num braço e o
   vivo no outro. Prenda o cabo ao isolador para a solda não sustentar o peso.
5. Instale o choke logo abaixo da ligação e vede bem a ligação.
6. Prenda o isolador no topo do mastro, com o coaxial descendo junto ao mastro.
7. Levante o mastro e prenda as pontas com as cordas, mantendo os braços **retos** (sem barriga)
   e o ângulo do projeto. O ângulo muda a ressonância e a impedância.
8. Ajuste com a antena na posição final (seção 6).

## 5. Alimentação e balun

O V é uma carga **simétrica** e o coaxial é **assimétrico**: use um **choke 1:1** no ápice,
para a malha do cabo não virar parte da antena. Desça o cabo junto ao mastro, longe dos braços.

Com 90° a 120° entre os braços, a impedância fica perto de 50 Ω e o V aceita o coaxial de 50 Ω
direto, sem rede de casamento. A ferramenta mostra a impedância e a faixa de ROE do modelo para
o ângulo escolhido.

## 6. Ajuste

O ajuste é como o do dipolo: cortar comprido e encurtar aos poucos, **com a antena na altura
e no ângulo finais**. O solo perto das pontas desloca a ressonância.

1. Meça a ROE (ou o S11 no NanoVNA) varrendo uma faixa em torno da frequência de projeto.
2. Ache a frequência de menor ROE (f_medida).
3. **f_medida abaixo da desejada:** a antena está comprida. Encurte os dois braços por igual.
   **f_medida acima da desejada:** está curta. Será preciso emendar fio.
4. Para estimar o corte: `A_novo ≈ A_atual × f_medida / f_desejada`. Tire metade da diferença
   de cada braço.
5. Se a ROE mínima ficar alta mesmo na ressonância, mude o ângulo: fechar o V baixa a
   resistência e abrir sobe. Depois de mudar o ângulo, refaça o ajuste do comprimento.

Uma dica do Cebik: se uma das pontas ficar fora de alcance, dá para ajustar só a outra, sem
efeito perceptível no desempenho.

## 7. Erros comuns

- Usar o comprimento do dipolo reto: o V precisa de fio um pouco mais comprido.
- Ajustar com a antena baixa e depois subir o mastro (a ressonância muda).
- Braços com barriga ou ângulos diferentes de cada lado.
- Pontas ao alcance da mão: são pontos de tensão alta.
- Fechar demais o V (menos de 90°): a impedância e o ganho caem depressa.
- Dispensar o choke e deixar o coaxial correr perto de um dos braços.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas:** as pontas dos braços têm tensão alta de RF ao transmitir, e no V
  elas ficam **perto do chão**. A ferramenta mostra a altura **F**. Suba as pontas ou cerque a
  área para que ninguém encoste nelas.
- **Exposição a RF:** as pontas baixas aproximam a antena das pessoas. Estime a distância segura
  na ferramenta "Exposição a RF" e confira os limites vigentes da Anatel.
- **Legislação:** transmitir exige licença de radioamador emitida pela **Anatel**. Confira o
  plano de bandas e os limites de potência **vigentes** na Anatel e na LABRE antes de operar.
- **Segurança física da instalação:**
  - Nunca instale perto da rede elétrica. Se o mastro ou um braço cair, não pode alcançar fios.
  - Estaie o mastro. Aterre o mastro e a malha do cabo na entrada da casa.
  - Use protetor contra descargas atmosféricas e desconecte o cabo do rádio em tempestades.
  - Trabalho em altura: use equipamento de proteção e nunca trabalhe sozinho.

## 9. Referências

- L. B. Cebik, W4RNL, "80-Meter Dipoles and Inverted-Vs: A Graphical Scrapbook" (NEC-4):
  comprimentos, impedâncias e ganhos no espaço livre com 120° e 90° (espelho em
  antenna2.github.io/cebik).
- L. B. Cebik, W4RNL, "All the Right Angles, or A Potpourri of Bent Dipoles" e "A Collection
  of Inverted-Vee Patterns" (série *Antennas from the Ground Up*).
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.6 (dipolo de meia onda).
- R. F. Harrington, *Field Computation by Moment Methods* (1968): método usado no modelo.
- ARRL Antenna Book: fator K do dipolo (curva não implementada na ferramenta).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
