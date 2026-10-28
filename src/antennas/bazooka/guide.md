# Bazooka (double bazooka)

## 1. Visão geral

A double bazooka ("bazuca") é um dipolo de meia onda cuja parte central é feita de cabo
coaxial. A malha é cortada no meio e recebe o cabo de alimentação. Nas duas pontas da
seção de coaxial, o vivo é soldado na malha. Fios nas extremidades completam o comprimento
do dipolo.

Por fora, a malha e os fios irradiam como um dipolo comum. Por dentro, cada metade do
coaxial é um **toco de 1/4 de onda em curto**. Na frequência de projeto, um toco desses tem
impedância muito alta e quase não interfere. Fora dela, a reatância dos tocos compensa
um pouco a do dipolo. Essa é a promessa de "banda larga".

- **Uso:** recepção e transmissão. Popular em 40 m, 80 m e 11 m.
- **Polarização:** linear, horizontal ou vertical, conforme a montagem.
- **Ganho:** o de um dipolo (2,15 dBi no espaço livre), menos a pequena perda nos tocos.
- **Impedância:** cerca de 70 Ω no espaço livre, como o dipolo. ROE ≈ 1,4:1 em cabo de 50 Ω.
- **Banda:** só um pouco maior que a do dipolo. O ARRL Antenna Book cita 1,14 vez a banda de
  ROE 2:1 de um dipolo simples (em 3,75 MHz, tocos de RG-58A), e diz que parte disso vem da
  malha do coaxial, mais grossa que um fio. A ferramenta compara com um dipolo do mesmo diâmetro
  do coaxial e dá entre 1,04 e 1,10 vez, conforme o cabo e a frequência. Outra parte do ganho de
  banda vem da própria **perda** nos tocos (análise de W2DU).

**Para que serve, então?** É uma forma válida de fazer um dipolo para uma banda, com o
comprimento quase todo em coaxial. Não espere milagres: um dipolo de fio com um bom choke
tem praticamente o mesmo desempenho, pesa menos e tem menos emendas.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Seção central | Coaxial RG-58 ou RG-8X (escolha na ferramenta) | Sobra de coaxial de 75 Ω de TV (RG-59/RG-6) |
| Fios das pontas | Fio de cobre de 1,5–2,5 mm² | Fio de instalação elétrica |
| Isolador central | Peça comercial com SO-239 | Placa de PVC, acrílico ou fenolite |
| Isoladores das pontas | Isolador de porcelana ou plástico de engenharia | Tubo de PVC furado |
| Vedação | Fita de autofusão + fita isolante, ou termorretrátil com cola | Silicone neutro por baixo da fita |
| Choke | Balun de corrente 1:1 comercial | Ferrites tipo "clip" no coaxial, ou espiras do próprio cabo |
| Fixação | Corda de náilon ou poliéster resistente a UV | Varal de náilon |

**O fator de velocidade (VF) do seu cabo define o tamanho dos tocos.** RG-58 de polietileno
sólido tem VF ≈ 0,66; os de espuma ficam perto de 0,78 a 0,85. Na dúvida, meça o VF com o
NanoVNA e digite o valor no campo "Fator de velocidade medido".

## 3. Ferramentas

Trena, estilete para descascar coaxial, alicate de corte, ferro de solda de 60 W ou mais,
estanho, multímetro, e um **NanoVNA** ou um **medidor de ROE** para o ajuste.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o comprimento total, **B** é a seção de
   coaxial, **C** é cada toco (do corte da malha até o curto), **D** é cada fio da ponta e
   **E** é o trecho sem malha no centro (se você informar um). O comprimento total usa o fator
   de encurtamento K do fio das pontas: como o coaxial é mais grosso, a antena real fica um
   pouco mais curta, e a diferença sai no ajuste dos fios **D**.
2. Corte a seção de coaxial com a medida **B**, mais alguns centímetros em cada ponta para
   descascar e fazer o curto. **B** é medida de curto a curto.
3. No meio da seção, tire a capa e corte a malha em volta do cabo, num trecho curto (**E**,
   de poucos milímetros a 1–2 cm). **Não corte o vivo nem o dielétrico.** Confira com o
   multímetro: as duas metades da malha NÃO podem se tocar.
4. Em cada ponta da seção, a uma distância **C** do corte da malha, solde o vivo na malha (curto). Confira com o multímetro:
   o vivo e a malha devem estar em curto.
5. Solde um fio da ponta (**D**) em cada curto. Corte os fios com sobra (cada um uns 2,5 % de
   **A** a mais), mais a volta no isolador.
6. Ligue o cabo de alimentação no centro: a malha do cabo numa metade da malha da seção e o
   vivo do cabo na outra metade. Prenda tudo ao isolador central para a solda não sustentar
   o peso.
7. Instale o choke logo abaixo da alimentação.
8. Vede muito bem o centro e os dois curtos. Água dentro do coaxial muda os tocos e aumenta
   a perda, e o defeito aparece meses depois.
9. Prenda as pontas aos isoladores e às cordas. Apoie a seção de coaxial ao longo do vão se
   ele for grande: coaxial pesa mais que fio.
10. Suba a antena na altura final **antes** do ajuste fino.

## 5. Alimentação e balun

A bazooka é uma carga **simétrica**, como qualquer dipolo, e o coaxial de alimentação é
**assimétrico**. A ideia de que os tocos dispensam o balun não se confirma (F5AD, ZS6GM):
use um **choke 1:1** no ponto de alimentação, para a malha do cabo de alimentação não virar
parte da antena.

A impedância na ressonância fica perto de 70 Ω (espaço livre). Em cabo de 50 Ω a ROE é de
cerca de 1,4:1, aceitável sem rede de casamento.

## 6. Ajuste

Os tocos (**C**) são feitos na medida e **não se ajustam**. O ajuste é nos fios das pontas
(**D**), como num dipolo comum.

1. Meça a ROE (ou o S11 no NanoVNA) varrendo uma faixa em torno da frequência de projeto.
2. Ache a frequência de menor ROE (f_medida).
3. **f_medida abaixo da desejada:** a antena está comprida. Encurte os dois fios **D** por igual.
   **f_medida acima da desejada:** a antena está curta. Será preciso emendar fio.
4. Para estimar o corte, use a proporção sobre o comprimento total:
   `A_novo ≈ A_atual × f_medida / f_desejada`. Tire metade da diferença de cada fio.
5. Encurte aos poucos e meça de novo a cada corte.

Se a curva de ROE ficar "torta" (mínimo largo de um lado e estreito do outro), confira o VF:
tocos com VF errado não ressoam junto com o dipolo.

## 7. Erros comuns

- Usar o VF "de tabela" sem conferir o cabo (RG-58 de espuma tem VF bem maior que o de
  polietileno sólido).
- Cortar o vivo junto com a malha no centro.
- Deixar as duas metades da malha encostando no centro.
- Ajustar encurtando o coaxial em vez dos fios das pontas.
- Curtos mal vedados: a água entra pelo coaxial e a ROE muda com o tempo.
- Dispensar o choke por achar que a bazooka "já é balanceada".

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas:** as pontas dos fios **D** são pontos de alta tensão de RF. Pontas
  fora do alcance de pessoas e isoladores de boa qualidade.
- **Potência e perda:** os tocos dissipam uma pequena parte da potência (a ferramenta mostra
  a estimativa). Com cabo fino e potência alta, o calor fica nos curtos e no centro: confira a
  potência máxima do cabo no datasheet.
- **Exposição a RF:** mantenha distância segura da antena durante a transmissão. Estime a
  distância na ferramenta "Exposição a RF". Confira também os limites vigentes da Anatel.
- **Legislação:** transmitir exige licença de radioamador emitida pela **Anatel**. Confira
  o plano de bandas e os limites de potência **vigentes** na Anatel e na LABRE antes de operar.
- **Segurança física da instalação:**
  - Nunca instale perto da rede elétrica. Se a antena ou o mastro cair, não pode alcançar fios.
  - Aterre o mastro e a malha do cabo na entrada da casa.
  - Use protetor contra descargas atmosféricas e desconecte o cabo do rádio em tempestades.
  - Trabalho em altura: use equipamento de proteção e nunca trabalhe sozinho.

## 9. Referências

- ARRL Antenna Book, 21ª ed. (2007), p. 9-6 e 9-7: double bazooka (Fig 11, 1,14 vez a banda
  de um dipolo simples) e a variante com tocos em paralelo (Fig 12, 1,55 vez, com eficiência de
  ≈ 80 % nas bordas da faixa de 2:1).
- C. Turner, ZS6GM, "The Great Double Bazooka Antenna Debate" (zs6stn.org.za).
- W. Maxwell, W2DU, "The Broadband Double Bazooka Antenna: How Broad Is It?", cap. 18 de
  *Reflections II* (2001).
- Ham Radio Base, "Double Bazooka Antenna Build Guide": comprimento dos tocos, (246/f) × VF pés.
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.2 e §4.6 (dipolo).
- D. M. Pozar, *Microwave Engineering*, 4ª ed., §2.7 (linha com perdas, usada nos tocos).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
