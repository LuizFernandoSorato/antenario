# Loop magnética (small loop)

## 1. Visão geral

Uma espira circular de tubo de cobre (ou de coaxial), com perímetro menor que cerca de 0,1λ,
fechada por um **capacitor variável** que a sintoniza. Ela cabe numa varanda e dispensa radiais e
mastros altos. Em recepção, a banda estreita ajuda a filtrar ruído. Em transmissão, a **eficiência**
depende muito do tubo grosso e de contatos perfeitos.

- **Uso:** recepção e transmissão em HF, em locais com pouco espaço.
- **Polarização:** linear. O campo magnético é perpendicular ao plano da espira; instalada de pé, o
  máximo de sinal fica no plano da espira.
- **Banda:** muito estreita. A cada poucos kHz é preciso reajustar o capacitor.
- **Eficiência:** vem da relação entre a resistência de radiação (minúscula) e a de perda. É a principal
  coisa que a ferramenta calcula.
- **Perigo:** a tensão no capacitor pode chegar a milhares de volts e a corrente na espira a vários
  ampères, mesmo com potência baixa.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Espira | Tubo de cobre de 22 mm (3/4") ou mais grosso | Coaxial grosso (RG-213 ou LMR-400, só com a malha: eficiência menor), tubo de alumínio |
| Capacitor variável | Capacitor a vácuo, ou borboleta de placas muito espaçadas | Capacitor de rádio antigo de placas bem espaçadas (só para RX ou potência baixa) |
| Loop de acoplamento | Coaxial rígido ou fio grosso (cota **C**) | Fio de cobre de 2,5 mm² |
| Suporte | Madeira ou PVC (isolante) | Cabo de vassoura |
| Cabo | Coaxial de 50 Ω com choke | — |
| Conexões | Solda com maçarico, ou braçadeiras inox | Evite parafusos e fios finos nos pontos de corrente |

## 3. Ferramentas

Dobradora de tubo (ou gabarito circular), maçarico de solda forte, trena, ferro de solda,
alicate, NanoVNA ou medidor de ROE e um bom medidor de capacitância.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é o diâmetro da espira, **B** o comprimento de tubo e
   **C** o diâmetro do loop de acoplamento.
2. Corte o tubo no comprimento **B** e dobre num círculo de diâmetro **A**, deixando a abertura no ponto
   mais alto, para o capacitor. Use um gabarito circular para não amassar.
3. Fixe o capacitor com **solda forte**, ou braçadeiras largas, nas duas pontas do tubo. Qualquer
   contato fraco soma resistência e reduz a eficiência.
4. Faça o loop de acoplamento com diâmetro **C**, na parte de baixo, oposta ao capacitor, dentro da
   espira e no mesmo plano. Ligue o coaxial nele.
5. Monte tudo num suporte isolante, com a espira de pé.
6. Instale um choke de corrente no coaxial.
7. Mantenha a base da espira a pelo menos um diâmetro do chão e longe de metais.

## 5. Alimentação e casamento

O **loop de acoplamento** transforma a resistência minúscula da espira (alguns décimos de ohm) em 50 Ω:
ele funciona como transformador. Ajuste o diâmetro **C** e a distância ao tubo da espira até a ROE no
centro da banda ficar baixa. A regra de diâmetro ≈ 1/5 da espira principal é uma boa partida.
Gamma match e acoplamento direto ainda não têm equações com fonte aqui (TODO).

## 6. Ajuste

1. Gire o capacitor até achar o ponto de ressonância (maior ruído em RX, menor ROE em TX). Faça
   com **potência mínima**.
2. Ajuste o loop de acoplamento (tamanho e posição) para a ROE mínima ser baixa.
3. A banda de ROE < 2:1 é estreita (a ferramenta estima). Reajuste o capacitor ao mudar de frequência.
4. Para medir a eficiência real: meça a banda de ROE 2:1 e compare com a calculada, aumentando o valor
   de "resistência de contatos" na ferramenta até as duas bater (método do AA5TB).

## 7. Erros comuns

- Tubo fino e eficiência baixa: o que mais importa é o diâmetro do tubo.
- Soldas frias e conexões ressecadas: cada miliohm conta.
- Capacitor sem tensão suficiente: arco elétrico, e até incêndio, em transmissão.
- Perto de metais, do chão ou de paredes com ferragem: o desempenho e a sintonia mudam.
- Tocar na espira durante a transmissão: queimadura grave.

## 8. Notas de transmissão e segurança

- **Alta tensão no capacitor:** milhares de volts mesmo com 10 a 50 W. Use capacitor com tensão de trabalho
  maior que o valor calculado (a ferramenta mostra), com margem. Tensão sobe com a raiz da potência.
- **Alta corrente na espira:** esquenta contatos fracos. Use solda forte.
- **Não toque** na espira nem no capacitor em transmissão. Instale fora do alcance de pessoas e animais.
- **Exposição a RF:** o campo próximo da espira é intenso. Mantenha distância durante a transmissão.
  Estime a distância na ferramenta "Exposição a RF".
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o suporte longe da rede elétrica.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.

## 9. Referências

- S. Sussman-Fort (AB2EW), "My Loop Antenna", apresentação, 20 nov. 2013, slides 16 a 20 (equações do AA5TB).
- Owen Duffy, calculadora de espira pequena de transmissão (definição de espira pequena, ganho de 1,76 dBi).
- F. W. Grover, *Inductance Calculations* (indutância de um anel circular).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
- Padrão de irradiação: loop pequena, campo ∝ sin θ, D = 1,5 (Balanis, *Antenna Theory*, §5.2). Vale para circunferência abaixo de ≈ λ/10.
