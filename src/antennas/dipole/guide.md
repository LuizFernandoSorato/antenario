# Dipolo de meia onda

## 1. Visão geral

O dipolo de meia onda tem dois condutores iguais, alinhados, alimentados no centro.
O comprimento total é de cerca de λ/2. É a antena de referência do radioamadorismo:
quase todo ganho de antena é comparado com ele (dBd = dB acima de um dipolo).

- **Uso:** recepção e transmissão.
- **Polarização:** linear, horizontal ou vertical, conforme a montagem.
- **Ganho típico:** 2,15 dBi no espaço livre.
- **Impedância:** cerca de 73 Ω no espaço livre. Muda com a altura acima do solo.
- **Diagrama:** em forma de "8". Irradia mais para os lados e quase nada nas pontas.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Elementos (HF) | Fio de cobre nu ou encapado, 1,5–2,5 mm² | Fio de instalação elétrica rígido ou flexível |
| Elementos (VHF/UHF) | Tubo ou vareta de alumínio, latão ou cobre | Vareta de solda, arame de cobre rígido |
| Isolador central | Peça comercial com conector SO-239 | Placa de PVC, acrílico ou fenolite |
| Isoladores das pontas (HF) | Isolador de porcelana ou plástico de engenharia | Pedaço de tubo de PVC furado |
| Cabo | Coaxial de 50 Ω (RG-58 em potências baixas, RG-213 em potências maiores) | Coaxial de 75 Ω de TV (RX, ou TX com ROE um pouco maior) |
| Balun / choke | Balun de corrente 1:1 comercial | Choke de ferrite tipo "clip" no coaxial, ou espiras de coaxial |
| Fixação | Corda de náilon ou poliéster resistente a UV | Varal de náilon |

A perda e a potência máxima de cada cabo vêm do datasheet do fabricante (módulo de
cabos, Fase 2).

## 3. Ferramentas

Trena, alicate de corte, ferro de solda de 60 W ou mais (fio grosso exige calor),
estanho, multímetro, e um **NanoVNA** ou um **medidor de ROE** para o ajuste.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. A cota **A** é o comprimento total de ponta a ponta,
   **B** é cada braço e **C** é o espaço central (isolador), se houver. Informe o diâmetro
   **real** do condutor: a ferramenta calcula o fator de encurtamento **K** a partir dele
   (condutor mais grosso, antena mais curta). O K calculado é o de um fio nu no espaço livre.
   Em HF ele dá um dipolo até uns 3 % mais comprido que a regra 468/f do ARRL (K ≈ 0,95),
   que já embute efeitos práticos como isoladores e isolamento do fio. Essa sobra é útil: o
   ajuste é sempre encurtando. Em VHF/UHF, com tubos, o livro de K. Rothammel dá K de 1 a 3 %
   **maior** que o calculado (que confere com o ARRL Antenna Book): mais um motivo para cortar com sobra.
2. Corte os dois braços um pouco **mais compridos** que **B**, por exemplo 5 % a mais.
   Isso deixa margem para o ajuste. Em HF, deixe ainda uns centímetros para a volta no isolador.
3. Prenda cada braço ao isolador central, respeitando a distância **C** entre eles.
4. Ligue o vivo (centro) do coaxial a um braço e a malha ao outro. Solde bem e proteja a
   conexão da água com fita de autofusão e fita isolante por cima.
5. Instale o balun ou choke de corrente junto ao ponto de alimentação.
6. Em HF, prenda as pontas aos isoladores e às cordas de sustentação.
7. Desça o cabo afastado dos braços, de preferência a 90° deles, pelo menos no primeiro trecho.
8. Suba a antena na altura final **antes** do ajuste fino. A altura muda a ressonância.

## 5. Alimentação e balun

O dipolo é uma carga **simétrica** (balanceada), e o coaxial é **assimétrico**. Sem um balun
de corrente, parte da corrente de RF volta pela face externa da malha. O cabo passa a
irradiar, o diagrama se deforma e aparece "RF na estação" (microfone que dá choque,
interferência em aparelhos da casa). Um choke 1:1 no ponto de alimentação resolve isso.

Com 73 Ω em um cabo de 50 Ω, a ROE teórica é de cerca de 1,5:1. Para a maioria dos rádios
isso é aceitável sem rede de casamento.

## 6. Ajuste

1. Meça a ROE (ou o S11 no NanoVNA) varrendo uma faixa em torno da frequência de projeto.
2. Ache a frequência de menor ROE (f_medida).
3. **f_medida abaixo da desejada:** a antena está comprida. Encurte os dois braços por igual.
   **f_medida acima da desejada:** a antena está curta. Será preciso emendar (por isso começamos comprido).
4. Para estimar o novo comprimento, use a proporção (a ressonância é inversamente proporcional
   ao comprimento): `L_novo ≈ L_atual × f_medida / f_desejada`.
5. Encurte aos poucos, sempre nos dois lados, e meça de novo a cada corte.

## 7. Erros comuns

- Cortar no tamanho exato logo de início e ficar curto.
- Ajustar com a antena no chão ou perto de paredes e depois subir (a ressonância muda).
- Braços de tamanhos diferentes.
- Não usar balun ou choke, o que faz o cabo irradiar e a ROE mudar quando você mexe no cabo.
- Emenda sem vedação, que oxida e muda a ROE com o tempo.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas:** as pontas são pontos de alta tensão de RF. Podem passar de
  centenas de volts mesmo com potência moderada. Pontas fora do alcance de pessoas, e
  isoladores de boa qualidade.
- **Potência:** confira a potência máxima do cabo e do balun na frequência de uso (datasheet).
- **Exposição a RF:** mantenha distância segura da antena durante a transmissão. Estime a distância na ferramenta "Exposição a RF". Confira também os limites vigentes da Anatel.
- **Legislação:** transmitir exige licença de radioamador emitida pela **Anatel**. Confira
  o plano de bandas e os limites de potência **vigentes** na Anatel e na LABRE antes de operar.
- **Segurança física da instalação:**
  - Nunca instale perto da rede elétrica. Se a antena ou o mastro cair, não pode alcançar fios.
  - Aterre o mastro e a malha do cabo na entrada da casa.
  - Use protetor contra descargas atmosféricas e desconecte o cabo do rádio em tempestades.
  - Trabalho em altura: use equipamento de proteção e nunca trabalhe sozinho.

## 9. Referências

- ARRL Antenna Book, 21ª ed. (2007), p. 2-5: Fig 8 (K × λ/2d, modelo NEC-4.1), usada para conferir
  o K calculado (0,3 %), e Fig 7 (fio #14 ressoa em 0,488 λ). Regra 468/f pés.
- L. B. Cebik, W4RNL, "80-Meter Dipoles and Inverted-Vs: A Graphical Scrapbook": modelo NEC-4
  usado para conferir o K calculado pelo diâmetro.
- K. Rothammel, *Antene* (tradução sérvia da 9ª ed. alemã), §3.1.5, Fig. 3.7: fator de encurtamento
  × λ/d, de 1 a 3 % acima do ARRL (divergência não resolvida).
- Projeto webantenna (V. Kopitsa, github.com/vkopitsa/webantenna): ajuste K = 1 − 0,225/ln(λ/2d)
  da curva do ARRL, que se afasta da própria figura em até 1,4 %.
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.6 (dipolo de meia onda).
- J. D. Kraus, *Antennas*.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
