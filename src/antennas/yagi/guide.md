# Yagi-Uda (NBS TN 688 e DL6WU)

## 1. Visão geral

Um Yagi é uma fileira de dipolos num **boom**: um **elemento excitado** (ligado ao cabo), um
**refletor** um pouco mais comprido atrás dele e vários **diretores** um pouco mais curtos na
frente. Os elementos parasitas recebem corrente induzida e, com o espaçamento certo, somam o
campo na frente e o cancelam atrás.

- **Uso:** recepção e transmissão em VHF/UHF (repetidoras, satélites de polarização linear,
  ADS-B, TV, links ponto a ponto).
- **Polarização:** linear. Elementos na horizontal = polarização horizontal; na vertical = vertical.
  As duas estações precisam usar a mesma (senão se perdem cerca de 20 dB).
- **Diagrama:** direcional, para o lado dos diretores. Mais comprido = mais ganho e feixe mais estreito.
- **Ganho:** no método NBS, 7,1 a 14,2 dB sobre um dipolo (9,2 a 16,4 dBi) para 0,4λ a 4,2λ de comprimento.
  No método DL6WU, a estimativa é 9,2 + 3,39·ln(boom em λ) dBd, para boom de 2,2λ a 39λ.
- **Dois métodos, escolhidos automaticamente pelo número de elementos:** com **3, 5 ou 6 elementos** vale o **NBS TN 688**
  (projetos otimizados e testados). Com **11 ou mais**, o **DL6WU** (qualquer número de 3 a 40; feito para Yagis longos, boom a partir
  de 2,2λ). Com 4 ou de 7 a 10 elementos o NBS não tem projeto e o DL6WU calcula, mas com aviso; o ganho mostrado vem do modelo por momentos. A tela informa
  qual método foi usado.
- **Medidas:** no NBS, os projetos da Tabela 1 corrigidos para o diâmetro dos elementos (Fig. 9) e do boom
  (Fig. 10). No DL6WU, as equações do programa DL6WU.BAS (Hoch, DL6WU; G3SEK), com espaçamento crescente
  entre os diretores até o 14º e constante (0,4λ) depois.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Elementos | Vareta ou tubo de alumínio de 4 a 10 mm | Vareta de solda de latão (6 mm) ou fio rígido de cobre de 4 mm² (só para antenas pequenas) |
| Boom | Tubo de alumínio quadrado ou redondo | Cano de PVC (boom isolante, sem correção), cabo de vassoura tratado, perfil de madeira |
| Fixação dos elementos | Peças de nylon ou abraçadeiras | Furos no PVC com cola epóxi |
| Elemento excitado | Tubo ou vareta inteira, como os parasitas | — |
| Gamma match | Barra de alumínio ou latão, braçadeira deslizante, capacitor variável (trimmer) | Fio de cobre rígido como barra |
| Choke | Choke de corrente no coaxial (ferramentas "Choke de manga" e "Choke de coaxial") | Bobina do próprio cabo (HF) |
| Cabo | Coaxial de 50 Ω | — |
| Mastro | Tubo de aço galvanizado ou alumínio | — |

## 3. Ferramentas

Serra de arco ou cortador de tubos, lima, furadeira, trena, **paquímetro** (a tolerância de corte
é pequena), esquadro, ferro de solda, alicate e NanoVNA ou medidor de ROE.

## 4. Passo a passo

1. Calcule as medidas na ferramenta com o diâmetro de elemento e de boom que você realmente vai usar.
   **R** é o refletor, **DE** o elemento excitado, **D1**, **D2**, **D3**… os diretores (do mais
   próximo do excitado para a frente). **E** é a distância refletor→excitado, **S** o espaçamento dos
   diretores e **L** o comprimento do boom (entre os centros do refletor e do último diretor; some uma sobra
   nas pontas para fixação).
   O excitado é sempre alimentado por **gamma match**: **DE** é inteiro e as cotas do gamma são **GL** (do centro do excitado
   até a ponte de curto), **GS** (espaçamento entre os centros da barra e do excitado) e **GD** (diâmetro da barra); ver a seção 5.
2. Corte os elementos com tolerância de 0,003λ (a ferramenta mostra o valor em mm). Em VHF isso
   são alguns milímetros; em UHF, 1 mm ou menos. Use um gabarito para cortar todos com a mesma precisão.
3. Marque no boom as posições, medidas a partir do refletor: refletor em 0, excitado em **E**,
   1º diretor em **E** + **S**, 2º em **E** + 2·**S**, e assim por diante.
   No método DL6WU o espaçamento não é uniforme: use as posições **P1**, **P2**… da tabela de medidas, todas
   medidas a partir do refletor.
4. Fure o boom nas posições, **perpendicular** ao eixo, e monte os elementos **centrados** no boom
   (mesmo comprimento dos dois lados).
5. Monte o elemento excitado: ele é inteiro e preso pelo centro, como os parasitas (pode tocar o boom metálico). Monte a barra
   do gamma, a ponte e o capacitor (seção 5 e a seção "Gamma match: montagem e ajuste" da tela).
6. Se o boom é de metal e os elementos o atravessam ou tocam, informe o diâmetro dele na ferramenta:
   o NBS pede um acréscimo nos parasitas. Com boom isolante e elementos fora dele, use 0.
7. Instale o choke de corrente e o cabo e vede as conexões e o capacitor do gamma contra a chuva.
8. Monte no mastro, de preferência com o centro de gravidade no ponto de fixação.

## 5. Alimentação e casamento

O NBS projetou o elemento excitado para trabalhar em **50 ou 200 Ω**, e a medida do excitado depende
do casamento escolhido. Um dipolo simples dentro do Yagi fica bem abaixo de 50 Ω. A ferramenta usa sempre o **gamma match**:

- **Gamma match.** Liga o coaxial de 50 Ω direto no excitado,
  sem balun, e o excitado fica **inteiro**: o centro dele está em potencial zero e pode ser preso no boom metálico, como os
  parasitas (a montagem "tudo em metal" do ARRL).
  - **Como funciona:** uma barra paralela a UMA das metades do excitado forma com ele uma linha curta em curto na ponte. A barra
    "puxa" a corrente para longe do centro, onde a impedância é maior (transformação **Hz**, que depende da razão de diâmetros e
    do espaçamento), e a indutância dessa linha é cancelada pelo **capacitor em série**.
  - **Como a ferramenta calcula:**
    1. O excitado fica **≈ 3 % mais curto que a ressonância no conjunto** (ponto de partida do ARRL). A ressonância e a impedância
       vêm do modelo por momentos (elementos soltos, sem boom e sem a barra).
    2. O gamma vê **metade** da impedância do dipolo (a barra só corre ao longo de um lado; Tolles).
    3. As equações do Tolles dão o comprimento da barra até a ponte (**GL**) e o capacitor.
    4. Em automático, a barra (**GD**) tem 1/3 do diâmetro do elemento e fica a 0,007λ dele (**GS**, regras do ARRL). Se assim a
       barra sair de 15° a 45° elétricos (a faixa que o Tolles prefere), a ferramenta procura o espaçamento mais próximo que a
       coloca nessa faixa. Se nem assim fechar, usa uma barra mais fina, que dá mais transformação.
    5. A folga entre as superfícies fica de pelo menos um diâmetro da barra, para caber o isolador.
  - **Capacitor:** um variável (de ar, ou um trimmer de boa qualidade) que cubra o valor com folga; o Tolles usou um de
    7 a 45 pF para 28 pF no 2 m. Na transmissão, veja a tensão no aviso da tela e a seção 8. Depois do ajuste, pode-se medir e trocar
    por um fixo, de tensão adequada.
  - **Assimetria:** por ser assimétrico, o gamma pode deformar um pouco o diagrama em Yagis longas; o T match (dois gammas,
    com balun 4:1) evita isso.
- Instale um choke de corrente no coaxial, logo atrás do excitado, para a malha não irradiar.
- Outras alimentações (dipolo dobrado de ≈ 200 Ω com balun 4:1, hairpin com o excitado partido ao meio) existem, mas a ferramenta
  não as calcula para a Yagi: o comprimento do excitado e as cotas mostradas valem só para o gamma.

## 6. Ajuste

1. Os elementos parasitas **não** se ajustam: foram calculados para o ganho máximo, e cortá-los
   desvia do projeto. Se mudar o diâmetro ou o boom, recalcule.
2. O excitado fica na medida calculada e o ajuste é no gamma:
   1. Ajuste o capacitor para a menor ROE.
   2. Se ela não chegar perto de 1:1, mude a ponte (**GL**) e repita: o ARRL recomenda esse vai e vem, e o Tolles ajustou primeiro a
      barra e depois o capacitor.
   3. Se não fechar de jeito nenhum, mude o espaçamento ou o diâmetro da barra (campos da ferramenta) e recalcule.
   4. No exemplo do Tolles, o ajuste medido ficou a 1 % da barra calculada e a ≈ 11 % do capacitor.
3. Meça com a antena montada na altura final, longe de metais. O Tolles viu a ROE variar com a altura do mastro.

## 7. Erros comuns

- Medir a distância entre elementos nas pontas do boom em vez de nos centros dos elementos.
- Elementos fora de centro ou tortos no boom.
- Usar o diâmetro do elemento errado na ferramenta (d/λ muda o comprimento dos elementos).
- Esquecer a correção quando o boom é metálico.
- Montar de costas: o refletor deve apontar para o lado oposto ao da estação.
- Polarização errada para o outro lado do enlace.

## 8. Notas de transmissão e segurança

- **Tensão alta nas pontas dos elementos** em transmissão: mantenha pessoas e fios longe.
- **Potência concentrada na frente:** com ganho de 10 dBi, a potência equivalente é 10 vezes a do rádio.
  Mantenha pessoas fora da frente da antena durante a transmissão. Estime a distância na ferramenta "Exposição a RF".
- **Potência:** confira a potência máxima do cabo, do balun e dos conectores.
- **Capacitor do gamma:** a corrente da linha passa por ele, e a tensão de RF é a corrente × a reatância. A tela mostra o valor
  para a potência informada; escolha um capacitor com tensão de trabalho bem acima do pico. O ARRL diz que capacitor variável
  de recepção serve até algumas centenas de watts, em 14 MHz. Proteja-o da chuva: umidade muda a capacitância e causa arco.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - O Yagi pega vento e o torque num rotor é grande: dimensione o mastro e o rotor para isso.

## 9. Referências

- P. P. Viezbicke, *Yagi Antenna Design*, NBS Technical Note 688, National Bureau of Standards,
  dezembro de 1976. https://doi.org/10.6028/NBS.TN.688 (Tabela 1; Figs. 9 e 10; exemplos da seção 4).
- ARRL Antenna Book, 19ª ed., cap. 26, "The T and Gamma Matches" e "The Hairpin and Beta Matches" (p. 26-8 a 26-11):
  regras práticas do gamma (barra, espaçamento, capacitor, excitado ≈ 3 % curto) e os exemplos do programa GAMMA.
- H. F. Tolles, W7ITB, "How to Design Gamma-Matching Networks", *Ham Radio*, maio de 1973, pp. 46–55: equações do gamma
  (eqs. 2, 3 e 8 a 14), usadas no cálculo e conferidas com os exemplos do artigo e com o programa GAMMA do ARRL.
- K. Rothammel, *Antene* (tradução sérvia da 9ª ed. alemã), §6.3, Tabela 6.1: medidas aproximadas do gamma em 10, 15 e 20 m.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- G. Hoch, DL6WU, "Extremely Long Yagi Antennas", *VHF Communications* 3/82, e G. Hoch e PA0MS, "Zelf Ontwerpen en
  Bouwen van VHF en UHF Antennes", VERON. As equações usadas vêm do programa DL6WU.BAS de J. Haigwood KY4Z, B. Stein
  W6NBI e I. White G3SEK (versão de 2006): http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas. Os artigos
  originais não foram consultados diretamente.
- Padrão de irradiação: método dos momentos para fio fino (Harrington, *Field Computation by Moment Methods*, 1968; Burke e Poggio, NEC, NOSC TD 116, 1981), implementado em `core/mom.ts`. Validado contra o ganho MEDIDO dos seis projetos do NBS TN 688 (diferença de −0,5 a +0,3 dB) e contra a estimativa do DL6WU (até 0,6 dB). Até 40 elementos.
