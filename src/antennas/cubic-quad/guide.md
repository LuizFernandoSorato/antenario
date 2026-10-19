# Quadra cúbica (cubical quad)

## 1. Visão geral

Cada elemento é uma espira quadrada de fio, de perímetro cerca de **uma onda**, presa em duas varetas
cruzadas (os **spreaders**). Um boom une as espiras: o **refletor** (atrás, um pouco maior), a espira
**excitada** (ligada ao cabo) e zero ou mais **diretores** (na frente, um pouco menores).

- **Uso:** recepção e transmissão, de HF a UHF baixo. Muito usada em 10 m a 6 m e em VHF por ter ganho
  alto para o tamanho e ser simples de fazer com fio e varetas.
- **Polarização:** horizontal se a alimentação fica no meio do lado de baixo; vertical se fica no meio de
  um lado vertical.
- **Diagrama:** direcional, para o lado dos diretores.
- **Ganho:** a espira sozinha dá cerca de 2 dB sobre o dipolo; o refletor soma cerca de 5 dB e cada
  diretor mais 1 a 2 dB. É uma estimativa de fonte secundária, com incerteza de vários dB.
- **Impedância:** cerca de 50 Ω com espaçamento de 0,15λ a 0,2λ.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Fio das espiras | Fio de cobre de 1,5 a 2,5 mm² (isolado ou nu) | Fio de alarme ou de cabo de rede para VHF/UHF |
| Varetas (spreaders) | Fibra de vidro ou bambu tratado | Vareta de PVC (cano fino), cabo de vassoura, ripa de madeira tratada |
| Boom | Tubo de PVC ou madeira, **isolante** | Cabo de vassoura |
| Fixação das varetas no boom | Suporte em cruz de PVC ou madeira | Abraçadeiras e parafusos |
| Casamento | Balun 1:1 de corrente (choke) | Ferrite no coaxial |
| Cabo | Coaxial de 50 Ω | — |

Use materiais isolantes (não metálicos) nas varetas e no boom perto das espiras: metal perto do fio
desloca a frequência.

## 3. Ferramentas

Trena, serra, furadeira, estilete, ferro de solda, alicate e NanoVNA ou medidor de ROE.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o lado do refletor, **B** o da espira excitada, **C** o dos
   diretores, **D** o espaçamento, **E** o comprimento das varetas, **F** o boom entre espiras, e
   **G**, **H**, **I** os comprimentos de fio de cada espira.
2. Corte duas varetas por espira, de comprimento **E** (a diagonal da espira do refletor).
3. Cruze as duas varetas de cada espira no centro e prenda-as no boom, formando um "X" visto de frente.
   Prenda as espiras no boom a **D** de distância, na ordem: refletor, excitada, diretores.
4. Corte os fios: **G** para o refletor, **H** para a espira excitada (corte alguns centímetros mais
   comprido) e **I** para cada diretor. Deixe uma sobra para fechar a espira.
5. Passe o fio pelas quatro pontas das varetas (um furo ou ranhura em cada ponta), formando um quadrado
   de lado **A**, **B** ou **C**. As quatro pontas definem os cantos.
6. Feche cada espira soldando as duas pontas do fio. Na espira excitada, deixe a abertura no meio do
   lado onde vai a alimentação (meio do lado de baixo para polarização horizontal).
7. Ligue o coaxial à espira excitada pelo balun/choke.
8. Vede a solda e o conector contra a água e instale no mastro.

## 5. Alimentação e casamento

Com espaçamento de 0,15λ a 0,2λ a impedância da espira excitada fica perto de 50 Ω, o que permite ligar o
coaxial direto, **com choke/balun de corrente** para a malha do cabo não irradiar. Com espaçamento pouco
acima de 0,25λ a impedância sobe para perto de 75 Ω, e um transformador de 1/4 de onda pode servir (use a
ferramenta "Transformador de 1/4 de onda"). Para casar, veja as ferramentas de rede L e de stub. Gamma match ainda não tem equações com fonte aqui (TODO).

## 6. Ajuste

1. Corte a espira excitada alguns centímetros mais comprida que **H** e meça a ROE em torno da
   frequência de projeto.
2. Se a menor ROE ficar **abaixo** da frequência desejada, a espira está comprida: encurte aos poucos,
   por igual nos quatro lados. Use `L_novo ≈ L_atual × f_medida / f_desejada`.
3. Ajuste o refletor e os diretores só se for medir o ganho ou a relação frente-costas.
4. Meça com a antena na altura final, longe de metais.

## 7. Erros comuns

- Esquecer que o perímetro (**G**, **H**, **I**) é o comprimento do fio e o lado é o perímetro ÷ 4.
- Espiras deformadas (losango em vez de quadrado) por varetas de comprimentos diferentes.
- Boom ou varetas de metal perto das espiras.
- Cabo coaxial passando atrás da antena, sem choke.
- Polarização trocada em relação ao outro lado do enlace.

## 8. Notas de transmissão e segurança

- **Tensão alta nos cantos** das espiras em transmissão: mantenha pessoas e fios longe.
- **Potência concentrada na frente:** com ganho alto, a potência equivalente é várias vezes a do rádio.
  Mantenha pessoas fora da frente da antena durante a transmissão. Estime a distância na ferramenta "Exposição a RF".
- **Potência:** confira a potência máxima do cabo e do balun.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - A quad pega muito vento por ter espiras grandes: dimensione o mastro para isso.

## 9. Referências

- Carl O. Jelinek (N6VNG), tabela de projeto de quad cúbica (fórmulas 1030/f, 1005/f, 975/f, em pés):
  https://www.qsl.net/ta1dx/amator/cubical_quad_antenna_design.htm (consultada em 2026-10-16).
- Electronics Notes, "Cubical Quad Beam Antenna: Reflector & Director" (espaçamento, impedância e ganho).
- ARRL Antenna Book (capítulo de quads). TODO(fonte): conferir razões e ganho.
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- Padrão de irradiação: método dos momentos (Harrington, 1968) sobre espiras quadradas de fio de 2 mm (premissa do modelo). O solver foi validado no dipolo, em arranjos e no Yagi do NBS; a quadra em si não tem comparação com medidas neste repositório. A relação frente–costas do modelo é sensível ao tamanho do refletor.
