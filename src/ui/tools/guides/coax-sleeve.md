# Choke de manga de λ/4 (VHF/UHF)

## Para que serve

É o mesmo papel do choke de coaxial: impedir que a corrente volte pela **face externa da malha** e faça o cabo irradiar. Em VHF e UHF, a bobina do próprio cabo deixa de ser prática (as tabelas medidas só vão até o HF), e a solução clássica é a **manga de λ/4**, também chamada de *sleeve balun* ou *detuning sleeve*.

## Como funciona

Um tubo metálico envolve o coaxial logo abaixo do ponto de alimentação. Embaixo, o tubo é fechado por um disco soldado na malha; em cima, fica aberto. O tubo e a face de fora da malha formam uma linha coaxial de ar de λ/4 em curto. Uma linha de λ/4 em curto vista pela outra ponta é um **circuito aberto**: na borda aberta da manga a impedância é muito alta, e a corrente de modo comum não passa. Como toda linha de λ/4, isso só vale perto de uma frequência.

## Montagem

1. Calcule **A** (comprimento interno) e **B** (diâmetro interno do tubo) na ferramenta. Tubo de cobre, latão ou alumínio serve; em VHF, cano de cobre de encanamento costuma cair na faixa de **B**.
2. Corte o tubo um pouco **mais comprido** que **A**.
3. Feche o fundo com um disco metálico furado no centro, do tamanho do cabo. Desencape um anel da capa do cabo nesse ponto e **solde a malha no disco**.
4. Passe o cabo pelo centro do tubo, sem encostar nas paredes. Use espaçadores isolantes (anéis de PVC, nylon ou espuma) para mantê-lo centrado.
5. Deixe a borda aberta para cima, junto do ponto de alimentação, e a manga **simétrica** em relação ao centro da antena: em VHF e UHF, se ela ficar mais perto de um braço que do outro, a própria antena induz corrente na face de fora do tubo.
6. Feche a borda de cima contra a chuva (tampa plástica, sem metal) e deixe um furo de dreno no fundo.

## Ajuste

O livro do ARRL faz assim: abre uma pequena fenda perto do fundo, coloca nela uma espira de uma volta ligada a um dip meter e corta a borda de cima aos poucos até a manga ressoar na frequência da antena. Com um NanoVNA, a mesma espira ligada à porta de medida mostra a ressonância como um vale na varredura. Outro caminho: ajuste primeiro a antena sem a manga, instale a manga e encurte a manga até a ROE e a ressonância voltarem ao lugar, e até a ROE não mudar quando você mexe no cabo.

## Ferrite como alternativa

Contas de ferrite tipo **43** (de 30 a 250 MHz) ou **61** sobre o cabo, logo abaixo da antena, também funcionam em VHF e cobrem uma faixa larga. A impedância cresce com o comprimento ocupado pelas contas, mas as fontes não dão uma receita de quantas contas usar em VHF/UHF. Em transmissão, confira se elas esquentam.

## Erros comuns

- Medir **A** pelo lado de fora ou contar a espessura do disco: **A** é o espaço interno, do disco à borda.
- Cabo encostando no tubo, ou malha ligada ao tubo em outro ponto além do fundo.
- Manga fora do centro da antena.
- Cortar para a frequência errada: a manga precisa ressoar na mesma frequência da antena.

## Referências

- ARRL Antenna Book, 19ª ed., cap. 26, p. 26-22 e 26-23, Fig 33B ("sleeve balun"): L = 234/f(MHz) pés, VF ≈ 0,95, diâmetro, simetria, ajuste com dip meter; ferrite tipo 43 e 61 em VHF.
- ARRL Antenna Book, 19ª ed., p. 24-14, Eq 26: impedância da linha coaxial de ar.
- K. Rothammel, *Antene* (tradução sérvia da 9ª ed. alemã), §25.1.2, p. 362–363, Fig. 25.2: manga para 2 m com 495 mm e relação de diâmetros de 3:1 a 4:1.
