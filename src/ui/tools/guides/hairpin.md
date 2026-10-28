# Hairpin (casamento de Yagi)

## O que é

Um grampo de dois fios paralelos, em curto na ponta, ligado aos terminais do elemento excitado. Ele se comporta como uma **indutância em paralelo**. Um elemento excitado propositalmente um pouco curto é capacitivo e tem resistência baixa; o grampo cancela a reatância e eleva a resistência.

## Montagem

1. Use **fio grosso** (cobre rígido ou tubo): conduz corrente alta e mantém a forma.
2. Mantenha os dois fios **paralelos, com o espaçamento informado** (por exemplo, com um espaçador isolante). O espaçamento e o diâmetro entram no cálculo.
3. Una as duas pontas com uma **barra de curto**, de preferência soldada ou parafusada: um contato ruim aquece e muda o ajuste.
4. Ligue o cabo (com balun 1:1 ou choke) aos terminais do elemento, na base do grampo.

## Ajuste

1. Meça a impedância do elemento excitado **sem** o grampo (R + jX) e informe à ferramenta.
2. Corte o grampo **comprido** e desloque a barra de curto (ou corte aos poucos), medindo a ROE. Quanto menor a impedância do elemento, mais crítico o ajuste.
3. Se não achar um bom mínimo, ajuste também o **comprimento do elemento excitado**: a ferramenta mostra qual reatância dá o casamento exato.

## Erros comuns

- Medir a impedância do elemento com o cabo no caminho, sem compensar o comprimento.
- Barra de curto mal soldada.
- Fios do grampo encostados no boom de metal ou no elemento: isso muda a indutância. Prenda-os afastados.

## Transmissão

O grampo e a barra de curto conduzem **corrente alta**: use fio grosso e conexão firme. Nos primeiros testes com potência, observe se há aquecimento.

## Referências

- ARRL Antenna Book, 19ª ed., cap. 26, "The Hairpin and Beta Matches" (p. 26-10 e 26-11): rede L, exemplo de 20 Ω para 50 Ω em 14 MHz e fator de velocidade de 97,5 % da linha aberta. O ponto central do grampo é neutro e pode ser ligado ao boom; afastar os fios equivale a alongar o grampo.
