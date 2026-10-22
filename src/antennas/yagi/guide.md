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
  de 2,2λ). Com 4 ou de 7 a 10 elementos o NBS não tem projeto e o DL6WU calcula, mas com aviso e sem estimar o ganho. A tela informa
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
| Elemento excitado | Dipolo (de tubo ou fio) com ponto de alimentação isolado | Dipolo dobrado de fio de cobre, para impedância de cerca de 200 Ω |
| Casamento | Balun 4:1 ou balun de corrente 1:1 | Ver a seção 5 |
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
   Se você informar o **espaço central do excitado** (isolador entre os dois braços), **DE** continua sendo o comprimento de
   ponta a ponta, incluindo o espaço; aparecem **DB** (cada braço, `(DE − DG)/2`) e **DG** (o espaço). Só o excitado é partido ao meio.
2. Corte os elementos com tolerância de 0,003λ (a ferramenta mostra o valor em mm). Em VHF isso
   são alguns milímetros; em UHF, 1 mm ou menos. Use um gabarito para cortar todos com a mesma precisão.
3. Marque no boom as posições, medidas a partir do refletor: refletor em 0, excitado em **E**,
   1º diretor em **E** + **S**, 2º em **E** + 2·**S**, e assim por diante.
   No método DL6WU o espaçamento não é uniforme: use as posições **P1**, **P2**… da tabela de medidas, todas
   medidas a partir do refletor.
4. Fure o boom nas posições, **perpendicular** ao eixo, e monte os elementos **centrados** no boom
   (mesmo comprimento dos dois lados).
5. Monte o elemento excitado, com o ponto de alimentação isolado do boom.
6. Se o boom é de metal e os elementos o atravessam ou tocam, informe o diâmetro dele na ferramenta:
   o NBS pede um acréscimo nos parasitas. Com boom isolante e elementos fora dele, use 0.
7. Instale o balun/choke e o cabo e vede as conexões.
8. Monte no mastro, de preferência com o centro de gravidade no ponto de fixação.

## 5. Alimentação e casamento

O NBS projetou o elemento excitado para trabalhar em **50 ou 200 Ω**, e a medida do excitado depende
do casamento escolhido. Um dipolo simples dentro do Yagi fica bem abaixo de 50 Ω. Opções:

- **Dipolo dobrado de ≈ 200 Ω** com balun de 4:1 para 50 Ω. Para o balun de meia onda de coaxial,
  use a ferramenta "Balun de meia onda de coaxial (4:1)".
- **Hairpin**: use a ferramenta "Hairpin" com a impedância medida do elemento. **Gamma match**: ainda sem equações com fonte aqui.
- Instale um choke de corrente no coaxial, logo atrás do excitado, para a malha não irradiar.

## 6. Ajuste

1. Os elementos parasitas **não** se ajustam: foram calculados para o ganho máximo, e cortá-los
   desvia do projeto. Se mudar o diâmetro ou o boom, recalcule.
2. Corte o excitado um pouco mais comprido e meça a ROE em torno da frequência. Se a ROE mínima está
   abaixo da frequência desejada, encurte aos poucos nas duas pontas, por igual.
3. Ajuste o casamento (balun, tamanho do dipolo dobrado) até a ROE mínima ficar baixa.
4. Meça com a antena montada na altura final, longe de metais.

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
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- G. Hoch, DL6WU, "Extremely Long Yagi Antennas", *VHF Communications* 3/82, e G. Hoch e PA0MS, "Zelf Ontwerpen en
  Bouwen van VHF en UHF Antennes", VERON. As equações usadas vêm do programa DL6WU.BAS de J. Haigwood KY4Z, B. Stein
  W6NBI e I. White G3SEK (versão de 2006): http://www.ifwtech.co.uk/g3sek/diy-yagi/dl6wu-2006.bas. Os artigos
  originais não foram consultados diretamente.
- Padrão de irradiação: método dos momentos para fio fino (Harrington, *Field Computation by Moment Methods*, 1968; Burke e Poggio, NEC, NOSC TD 116, 1981), implementado em `core/mom.ts`. Validado contra o ganho MEDIDO dos seis projetos do NBS TN 688 (diferença de −0,5 a +0,3 dB) e contra a estimativa do DL6WU (até 0,6 dB). Até 40 elementos.
