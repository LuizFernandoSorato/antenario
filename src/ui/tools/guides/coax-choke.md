# Choke de coaxial (balun de corrente 1:1)

## Para que serve

O dipolo e as outras antenas balanceadas recebem o sinal por um cabo coaxial, que é desbalanceado. Sem um choke, parte da corrente volta pela **face externa da malha**: o cabo passa a irradiar, o diagrama se deforma, a ROE muda quando você mexe no cabo e aparece RF na estação. O choke põe uma impedância alta no caminho dessa corrente (o ARRL usa +j1000 Ω como referência) sem mexer no sinal que corre por dentro do cabo.

## Montagem

1. Escolha a banda e o cabo na ferramenta e separe o comprimento indicado do **próprio cabo de alimentação**, a partir da antena.
2. Enrole o cabo como um **rolo de corda**, com as espiras lado a lado (não embaralhadas), no número de espiras da tabela. Um pedaço de tubo de PVC ajuda a manter a forma.
3. Prenda as espiras com fita isolante ou abraçadeiras plásticas.
4. Deixe a bobina **perto do ponto de alimentação**: é ali que ela é mais eficaz.
5. Respeite o raio mínimo de curvatura do cabo (datasheet), principalmente com cabo de dielétrico de espuma.

## Uma banda ou várias

As bobinas de uma banda foram medidas para ter impedância alta naquela frequência. As de várias bandas são um compromisso e cobrem uma faixa maior. Se aparecer problema em uma banda só, dá para acrescentar uma bobina feita para ela.

## Ferrite

Contas ou toroides de ferrite dão impedância alta com menos cabo. O livro traz receitas (balun W2DU com contas e toroide FT240-43), mas não um modelo de impedância: o resultado depende do material e do núcleo. Funcionam melhor com antenas de menos de ≈ 100 Ω.

## VHF e UHF

A tabela vai só até 28 MHz. Acima disso, use a ferramenta **Choke de manga (VHF/UHF)**: um tubo de λ/4 em volta do cabo.

## Erros comuns

- Enrolar fita paralela (twin lead): não funciona, as espiras acoplam demais.
- Pôr a bobina longe da antena, perto do rádio.
- Espiras embaralhadas, que aumentam a capacitância entre elas.

## Referências

- ARRL Antenna Book, 19ª ed., cap. 26 ("Coupling the Line to the Antenna"), p. 26-21 e 26-22: Tabela 3 (chokes de coaxial), balun W2DU e baluns de ferrite.
