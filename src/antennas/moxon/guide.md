# Moxon (retângulo de Moxon)

## 1. Visão geral

A Moxon é uma antena direcional de **dois elementos**: um excitado (na frente) e um refletor
(atrás). As pontas dos dois são dobradas a 90° uma em direção à outra e quase se encostam,
formando um retângulo. O acoplamento entre as pontas faz o trabalho que, numa Yagi, exigiria
elementos mais compridos.

- **Uso:** recepção e transmissão. Popular em HF (com fio) e em VHF/UHF (com vareta), inclusive
  para satélites e para fugir de interferência de repetidoras.
- **Polarização:** horizontal com a antena deitada, vertical com ela em pé.
- **Ganho:** cerca de 6 dBi no espaço livre, quase o de uma Yagi de 2 elementos.
- **Rejeição traseira:** muito alta. Na frequência de projeto a relação frente-costas passa de
  30 dB, e fica acima de 20 dB na maior parte das bandas (Cebik). O padrão é quase cardioide:
  os mínimos ficam a uns 120° da frente.
- **Impedância:** cerca de 50 Ω: liga direto no coaxial, sem rede de casamento.
- **Tamanho:** cerca de 70 % da largura de uma Yagi de 2 elementos.

As medidas vêm das **equações do Cebik (W4RNL)**, que dependem do diâmetro do condutor em
comprimentos de onda. Por isso a ferramenta pede o diâmetro: com fio mais grosso, a largura
diminui e a folga entre as pontas aumenta.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Elementos (VHF/UHF) | Vareta de alumínio de 3 a 5 mm | Fio de cobre rígido de 2,5 a 4 mm² |
| Elementos (HF) | Fio de cobre de 2 a 2,5 mm² | Fio de instalação elétrica (o isolamento muda um pouco as medidas) |
| Suporte | Tubo e conexões de PVC (VHF) | Cruzeta de PVC ou bambu com varetas de fibra (HF) |
| Espaçadores da folga | Tubo plástico justo ou termorretrátil duplo | Pedaço de mangueira de nível |
| Isolador central | Caixinha plástica com conector | Placa de PVC ou acrílico |
| Choke | Balun de corrente 1:1 comercial | Ferrites tipo "clip" no coaxial |

## 3. Ferramentas

Trena ou paquímetro, curvador de tubo de cobre (dobra vareta com raio pequeno), serra, lixa,
ferro de solda, alicate e um **NanoVNA** ou **medidor de ROE**.

## 4. Passo a passo

1. Calcule as medidas na ferramenta com o diâmetro **real** do seu condutor. **A** é a
   largura, **B** a cauda do excitado, **C** a folga entre as pontas, **D** a cauda do refletor,
   **E** a profundidade, **F** cada metade do excitado e **G** o refletor (esticados), e **H** o
   espaço central (se você informar um).
2. Corte o refletor com **G** e as duas metades do excitado com **F** cada. O Cebik
   recomenda acertar o comprimento das peças **antes** de tudo.
3. Marque os cantos: no refletor, a **D** de cada ponta; em cada metade do excitado, a **B** da
   ponta de fora.
4. Dobre a 90° com o **meio da curva sobre a marca**. Com curvador de tubo de cobre, o Cebik
   obteve o mesmo resultado dos modelos de canto vivo.
5. Monte os dois elementos no suporte, paralelos, com a distância **E** entre os eixos.
6. Ajuste a **folga C** dos dois lados e trave com o espaçador isolante. É a medida mais
   crítica: a ferramenta mostra a tolerância.
7. Ligue o coaxial no centro do excitado (malha numa metade, vivo na outra) e instale o choke.
   Leve o cabo para trás, pelo meio da antena.
8. Faça o ajuste (seção 6) com a antena na posição final.

## 5. Alimentação e balun

A Moxon é projetada para cerca de 50 Ω: o coaxial de 50 Ω liga direto. Como em todo elemento
simétrico alimentado por coaxial, use um **choke 1:1** no ponto de alimentação. Leve o cabo para
trás pelo eixo da antena, longe das caudas e da folga.

## 6. Ajuste

A Moxon quase não precisa de ajuste quando as medidas são seguidas: o protótipo de 2 m do
Cebik ressoou onde o projeto previa, e a curva de ROE ficou igual à do modelo.

1. Meça a ROE (ou o S11 no NanoVNA) varrendo a faixa.
2. Se a ROE mínima estiver longe da frequência de projeto, **confira as medidas antes de
   cortar**, começando pela folga **C**, depois **A** e as caudas.
3. Mexer nas medidas para acertar a ROE também muda a rejeição traseira: a mesma geometria
   define a impedância e o padrão.
4. Se puder, confira a rejeição traseira com um sinal conhecido (uma repetidora, um rádio
   portátil a distância): gire a antena e compare a frente com as costas.

## 7. Erros comuns

- Calcular com um diâmetro e construir com outro: a folga C e a largura mudam com o diâmetro.
- Folga C fora da tolerância, ou diferente de um lado para o outro.
- Espaçador de plástico que absorve RF na folga (o Cebik alerta para isso em VHF).
- Dobrar com canto vivo e quebrar a vareta, ou dobrar fora da marca.
- Medir as dimensões pela borda do tubo, e não pelo eixo.
- Esquecer o choke e deixar o coaxial correr perto de uma cauda.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas:** as pontas das caudas, nos dois lados da folga C, ficam em tensão
  alta de RF ao transmitir. Use espaçadores isolantes adequados e mantenha a antena fora do
  alcance de pessoas.
- **Exposição a RF:** a Moxon concentra a potência para a frente (cerca de 6 dBi). Estime a
  distância segura na ferramenta "Exposição a RF" e confira os limites vigentes da Anatel.
- **Legislação:** transmitir exige licença de radioamador emitida pela **Anatel**. Confira o
  plano de bandas e os limites de potência **vigentes** na Anatel e na LABRE antes de operar.
- **Segurança física da instalação:**
  - Nunca instale perto da rede elétrica. Se a antena ou o mastro cair, não pode alcançar fios.
  - Aterre o mastro e a malha do cabo na entrada da casa.
  - Use protetor contra descargas atmosféricas e desconecte o cabo do rádio em tempestades.
  - Trabalho em altura: use equipamento de proteção e nunca trabalhe sozinho.

## 9. Referências

- L. B. Cebik, W4RNL, "Designing Moxon Rectangles by Equation and by Model" (AntenneX, setembro
  de 2000): equações, tabela de modelos e exemplos (espelho em antenna2.github.io/cebik).
- L. B. Cebik, W4RNL, "Building a 2-Meter Moxon": construção, dobra das varetas e tolerância da
  folga.
- J. E. Davis, MoxGen (jedsoft.org): as mesmas equações em programa.
- D. Maguire, AC6LA, MoxGen para Windows (citado pelo Cebik).
- L. Lumpkin, KB8WEV, e B. Cerrito, WA1FXT, "A Compact Two-Element, 2-Meter Beam", QST, janeiro
  de 2000, p. 60–63 (citado pelo Cebik; não consultado).
- R. F. Harrington, *Field Computation by Moment Methods* (1968): método usado no modelo.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
