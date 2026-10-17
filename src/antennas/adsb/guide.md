# Antena ADS-B (1090 MHz)

## 1. Visão geral

Um ground plane de λ/4 cortado para **1090 MHz**, a frequência em que os aviões transmitem
sua posição (ADS-B / Mode S). Com um SDR barato (RTL-SDR) e um programa como o dump1090 você
vê os aviões no mapa. Em 1090 MHz λ/4 tem só uns 65 mm, então a antena é minúscula.

- **Uso:** somente recepção. **Não transmita em 1090 MHz**: é frequência do serviço aeronáutico.
- **Polarização:** vertical (a das antenas dos aviões).
- **Diagrama:** omnidirecional no plano horizontal.
- **Alcance:** o sinal é de visada direta. Altura da antena e perda do cabo pesam mais que o ganho.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Radiador e radiais | Vareta de latão ou cobre de 1 a 2 mm | Fio de cobre rígido |
| Base | Conector SMA ou N de painel | Conector SO-239 (perde mais em UHF alto) |
| Cabo | Coaxial de baixa perda, o mais curto possível | RG-58 só para poucos metros |
| Caixa | Lata de metal ou caixa plástica estanque | Pote plástico com tampa |

## 3. Ferramentas

Ferro de solda, estanho, alicate, régua ou paquímetro (as medidas são pequenas), lima e,
se tiver, um NanoVNA.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o radiador, **B** é cada radial,
   **C** é o alcance horizontal do radial e **D** é a queda da ponta do radial.
2. Corte o radiador um pouco **mais comprido** que **A** (uns 2 mm de sobra) e os radiais na medida **B**.
3. Solde o radiador no pino central do conector.
4. Solde os radiais na flange ou no corpo do conector, distribuídos por igual (4 radiais, a cada 90°).
5. Dobre os radiais para baixo, conforme a queda **D** (cerca de 45°).
6. Vede o conector e as soldas contra a água.
7. Instale o mais alto possível, com vista livre para o céu e com o cabo curto.

## 5. Alimentação e casamento

Alimentação direta pelo coaxial: vivo no radiador, malha nos radiais. A inclinação dos
radiais é o ajuste grosso da impedância. Para recepção, um descasamento moderado pesa
pouco; o que mais pesa é a perda do cabo.

## 6. Ajuste

Com NanoVNA, meça o S11 em torno de 1090 MHz. Se o melhor ponto estiver abaixo de 1090 MHz,
o radiador está comprido: encurte aos poucos (`L_novo ≈ L_atual × f_medida / f_desejada`).
Sem instrumento, confie na medida calculada: em RX o resultado costuma ser bom.

## 7. Erros comuns

- Cabo longo de coaxial fino: em 1090 MHz a perda é grande. Use cabo curto ou um SDR junto à antena.
- Antena baixa ou atrás de paredes e folhas de metal.
- Radiais desiguais.
- Conectores ruins ou mal soldados, que perdem sinal em UHF alto.

## 8. Notas de transmissão e segurança

- Esta antena é **só para recepção**. Transmitir em 1090 MHz interfere na navegação aérea e é proibido.
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o SDR em tempestades.
  - Trabalho em telhado ou em altura exige equipamento de proteção e companhia.

## 9. Referências

- ICAO Anexo 10, vol. IV, e RTCA DO-260B: o ADS-B usa 1090 MHz (Mode S Extended Squitter).
- C. A. Balanis, *Antenna Theory: Analysis and Design*, 4ª ed., §4.7 (monopolo e teoria das imagens).
- ARRL Antenna Book: verticais e ground planes.
- TODO(fonte): ganho e alcance típicos de ADS-B caseira não têm fonte citada aqui; não os assumimos.
