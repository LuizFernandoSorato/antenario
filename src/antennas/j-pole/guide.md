# J-pole

## 1. Visão geral

O J-pole é um radiador vertical de **meia onda** alimentado pela ponta de baixo. Essa ponta
tem impedância muito alta (milhares de ohms), por isso não dá para ligar o coaxial direto.
A antena usa uma **seção de casamento de λ/4 em curto**: dois condutores paralelos unidos
na base. Na ponta aberta da seção a impedância é muito alta. No curto ela é quase zero.
Entre os dois existe um ponto onde vale **50 Ω**, e é ali que o coaxial é ligado.

O formato lembra a letra "J": um elemento longo (radiador + seção) e um elemento curto,
unidos na base.

- **Uso:** recepção e transmissão, típico em VHF e UHF.
- **Polarização:** vertical.
- **Diagrama:** omnidirecional no plano horizontal.
- **Vantagem:** dispensa radiais.
- **Ponto fraco:** tende a jogar corrente na malha do coaxial. O choke é obrigatório.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Condutores | Tubo de cobre de 1/2" (hidráulica) + curva/"U" e tê de cobre | Fio de cobre rígido; fita paralela de TV de 300 Ω (versão "Slim Jim"/portátil) |
| Base / curto | Conexão "U" ou tê de cobre soldada | Barra de cobre ou alumínio parafusada |
| Conexão do coaxial | Abraçadeiras de inox (deslizam para o ajuste) | Fio soldado depois de achar o ponto |
| Cabo | Coaxial de 50 Ω | — |
| Choke | Ferrite tipo "clip" | Espiras de coaxial logo abaixo do ponto de alimentação |
| Fixação | Mastro com abraçadeiras na base (região do curto, que fica em baixa tensão de RF) | — |

Se usar fita de TV com dielétrico, a seção de casamento fica mais curta: use o **fator de
velocidade do datasheet** no campo "fator da seção de casamento".

## 3. Ferramentas

Maçarico ou ferro de solda grande (para tubo de cobre), solda para cobre, cortador de tubo,
trena, chave para as abraçadeiras e um NanoVNA ou medidor de ROE.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o elemento longo, **B** é o radiador (parte do
   elemento longo acima do topo do elemento curto), **C** é a seção de casamento (elemento
   curto) e **D** é o espaçamento entre os centros dos condutores. O diâmetro do tubo define o
   fator de encurtamento K do radiador (tubo mais grosso, radiador mais curto). A seção de
   casamento é uma linha de transmissão e usa o fator próprio que você informar.
2. Corte o elemento longo um pouco **mais comprido** que **A**, por exemplo 5 %, e o curto na
   medida **C**.
3. Monte a base em "U" unindo os dois tubos com o espaçamento **D**. A base é o curto da seção.
4. Fixe o conjunto no mastro **pela base**. Esse ponto tem tensão de RF baixa, então pode ser
   fixado em metal.
5. Ligue o coaxial com duas abraçadeiras deslizantes, uma em cada condutor, na mesma altura.
   Na montagem mais comum, o vivo vai no elemento longo e a malha no curto.
6. Comece com as abraçadeiras perto da base. Instale o choke logo abaixo delas.

## 5. Alimentação e casamento

A impedância ao longo da seção de casamento vai de quase zero (no curto) até um valor muito
alto (na ponta aberta). Ao subir o ponto de ligação, a impedância vista pelo coaxial
**aumenta**. O objetivo é achar a altura em que ela vale 50 Ω (ROE mínima).

> **Ainda não calculado:** a ferramenta não indica uma altura inicial para o ponto de
> alimentação, porque ela depende da impedância da ponta do radiador, que varia com o
> diâmetro e a montagem.

## 6. Ajuste

O J-pole tem **dois ajustes**, feitos nesta ordem:

1. **Ponto de alimentação (casamento):** desloque as duas abraçadeiras juntas, alguns
   milímetros por vez, e meça. Procure a posição em que a **ROE mínima** é a mais baixa
   possível, mesmo que essa ROE mínima ainda caia fora da frequência desejada.
2. **Frequência (ressonância):** com o casamento bom, ache a frequência de menor ROE.
   Se ela estiver **abaixo** da desejada, encurte o **radiador** (topo do elemento longo).
   Use a proporção `L_novo ≈ L_atual × f_medida / f_desejada` aplicada ao radiador **B**.
3. Repita o passo 1 rapidamente: mudar o radiador mexe um pouco no casamento.
4. Mexa no cabo depois do choke. Se a ROE mudar, o choke está insuficiente.
5. Depois de achar o ponto, solde a conexão ou aperte bem e vede contra a água.

## 7. Erros comuns

- Sem choke: o cabo vira parte da antena, a ROE "dança" e o diagrama sobe ou desce.
- Mexer na ressonância antes de acertar o casamento, e se perder nos dois ajustes.
- Fixar o mastro metálico perto da ponta aberta da seção ou do radiador (região de alta tensão).
- Usar fita de TV sem corrigir o fator de velocidade: a seção fica comprida demais.

## 8. Notas de transmissão e segurança

- **Tensão alta:** a ponta do radiador e a ponta aberta do elemento curto ficam em tensão
  alta de RF. Instale fora do alcance de pessoas.
- **Potência:** confira a potência máxima do cabo e do conector na frequência de uso.
- **Exposição a RF:** mantenha distância durante a transmissão. Estime a distância na ferramenta "Exposição a RF".
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - O tubo de cobre é condutor e comprido: nunca instale perto da rede elétrica.
  - Aterre o mastro e a malha do cabo. A base em curto do J-pole pode ser ligada ao mastro aterrado.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Trabalho em altura exige equipamento de proteção e companhia.

## 9. Referências

- ARRL Antenna Book: J-pole e antena Zepp alimentada por seção de casamento de λ/4.
- J. D. Kraus, *Antennas* (linha de dois fios; impedância característica).
- D. M. Pozar, *Microwave Engineering*, 4ª ed., tabela 2.1 (linha de dois fios).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- Padrão de irradiação: o radiador como dipolo vertical de meia onda (Balanis, *Antenna Theory*, §4.2; Wikipedia, "J-pole antenna").
