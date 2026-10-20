# Casamento com stub

## O que construir

Um pedaço de cabo (o **stub**) ligado em paralelo com a linha, a uma certa **distância da antena**. Só cabo e um T (ou emenda soldada); sem componentes que esquentam.

## Montagem

1. Corte o trecho entre a antena e o ponto do stub com o comprimento calculado, **medido dos terminais da antena**.
2. No ponto marcado, ligue o stub **em paralelo**: vivo no vivo, malha na malha. Um conector tipo T resolve, mas o T e os conectores também têm comprimento elétrico (veja abaixo).
3. A ponta do stub fica **em curto** (vivo ligado à malha, solda curta) ou **em aberto** (ponta bem isolada), conforme a ferramenta mostra.
4. Prefira a solução com **menor distância e menor stub**: a banda de casamento é mais larga.

## Dicas

- O **stub em curto** deixa a antena aterrada em corrente contínua, o que descarrega a estática. Em aberto, a ponta é um ponto de entrada de umidade: vede bem.
- Em UHF, o comprimento do **conector T** pesa no resultado: conte-o nas medidas, ou corte o stub comprido e ajuste.
- Mantenha o stub **reto** e afastado de metal, sem enrolá-lo apertado: um cabo enrolado tem acoplamento entre as espiras.

## Ajuste

1. Meça a ROE com o NanoVNA, ligado no cabo que vai ao rádio.
2. Encurte o stub aos poucos, medindo a cada corte: a ROE mínima se move na frequência. Se passar do ponto, não há como alongar sem refazer a ponta.
3. Se não achar um bom mínimo, verifique a **distância até a antena**: um erro nela não se corrige só com o stub.

## Erros comuns

- Medir a distância a partir de um ponto errado (do conector, e não dos terminais da antena).
- Usar o fator de velocidade de outro cabo.
- Esquecer a **vedação** da ponta do stub em aberto.
