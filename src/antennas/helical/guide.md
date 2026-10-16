# Helicoidal (modo axial)

## 1. Visão geral

Uma hélice de fio, com circunferência próxima de um comprimento de onda, sobre um refletor
circular. No **modo axial** (Kraus) ela irradia um feixe único na direção do eixo, com
polarização circular.

- **Uso:** recepção e transmissão. É a antena clássica para satélites de órbita baixa
  (UHF, 2,4 GHz) e para qualquer enlace em que a polarização do outro lado gira ou é desconhecida.
- **Polarização:** circular. Hélice enrolada à direita (como um parafuso comum) dá polarização
  circular à direita. Confira qual sentido o satélite ou a estação do outro lado usa.
- **Diagrama:** direcional, ao longo do eixo. Mais voltas dão mais ganho e feixe mais estreito.
- **Impedância:** em torno de 140 Ω, resistiva, na alimentação pela borda. Precisa de casamento
  para o cabo de 50 Ω.
- **Ganho:** fórmula empírica de Kraus, D ≈ 15·N·(C/λ)²·(S/λ). Com 8 voltas, ≈ 15 dBi.

## 2. Materiais

| Item | Opção comum | Alternativa barata |
|---|---|---|
| Fio da hélice | Fio de cobre rígido ou tubo de cobre de 3 a 6 mm | Fio de cobre rígido de 4 mm² (esmaltado ou nu), vareta de solda |
| Suporte da hélice | Tubo de PVC ou fibra no centro (eixo), com ranhuras para o fio | Tubo de PVC de esgoto, cabo de vassoura de madeira tratada |
| Refletor | Chapa de alumínio ou cobre, ou tela metálica | Tampa de lata, grade de ventilação, tela de arame galvanizado |
| Conector | N ou SO-239 de painel no centro do refletor | — |
| Casamento | Fita de cobre ou latão de 1/4 de onda (veja o item 5) | Coaxial de 75 Ω de 1/4 de onda |
| Cabo | Coaxial de 50 Ω | — |

## 3. Ferramentas

Trena, paquímetro, ferro de solda de 60 W ou mais, estanho, alicate, serra, furadeira,
fita para marcar o passo (ou gabarito de papel) e NanoVNA ou medidor de ROE.

## 4. Passo a passo

1. Calcule as medidas na ferramenta. **A** é a circunferência da hélice, **B** o diâmetro
   entre os eixos do fio, **C** o passo, **D** a altura da hélice, **E** o fio total e
   **F** o diâmetro mínimo do refletor.
2. Para marcar o suporte, o diâmetro externo do tubo é **B** menos o diâmetro do fio. A circunferência
   **A** é medida no eixo do fio, não na superfície do tubo.
3. Corte o refletor com diâmetro de pelo menos **F** e fure o centro para o conector.
4. Marque no tubo o caminho do fio: a cada volta, o fio sobe **C** (o passo). Um gabarito de papel
   enrolado no tubo, com a linha inclinada, ajuda. Um triângulo de base **A** e altura **C** dá o
   ângulo certo (diagrama "uma volta desenrolada").
5. Enrole o fio de **E** mais uma sobra de ponta, **no mesmo sentido** em todas as voltas, preso
   com abraçadeiras ou ranhuras a cada volta.
6. Fixe o tubo no centro do refletor, perpendicular a ele. A altura da hélice é **D**.
7. Ligue o início do fio ao pino central do conector, pela borda da primeira volta. A
   malha do coaxial vai no refletor.
8. Vede as soldas e o conector contra a água.

## 5. Alimentação e casamento

A impedância na borda da hélice, ≈ 140·C/λ, é bem acima dos 50 Ω do coaxial. Com C = λ são
140 Ω, o que dá ROE de aproximadamente 2,8:1 sem casamento.

- **Transformador de 1/4 de onda:** impedância intermediária Z = √(50 × 140) ≈ 84 Ω. Use a
  ferramenta "Transformador de 1/4 de onda" (o comprimento físico leva em conta o fator de velocidade).
  Um trecho de coaxial de 75 Ω de λ/4 elétrico é uma aproximação comum, porque 75 Ω fica perto do ideal.
- Kraus descreve também uma fita de cobre que reduz a impedância sob a primeira volta (casamento
  por fita cônica). TODO(fonte): medidas exatas dessa fita.
- Instale um choke de corrente no coaxial perto da antena para a malha não irradiar.

## 6. Ajuste

1. Meça a ROE em torno da frequência de projeto. Como a hélice é de banda larga (modo axial
   de 3/4 a 4/3 de C/λ), a ROE varia pouco com a frequência: o ajuste é no **casamento**, não no comprimento do fio.
2. Se a ROE mínima ficar alta, ajuste o transformador de 1/4 de onda ou a posição do início do fio.
3. Confirme o ganho e o sentido da polarização num teste com um sinal real, de preferência
   com uma segunda antena de polarização circular conhecida.

## 7. Erros comuns

- Enrolar partes da hélice em sentidos diferentes (polarização errada).
- Passo irregular: o diagrama se deforma.
- Refletor pequeno demais (menos de 3λ/4): perde-se ganho e relação frente-costas.
- Medir a circunferência na superfície do tubo, e não no eixo do fio.
- Esquecer o casamento e culpar a antena pela ROE de 2,8:1.
- Trocar a polarização ao usar uma hélice de mão errada para o satélite (perda de cerca de 20 dB
  entre circular à direita e à esquerda, em teoria).

## 8. Notas de transmissão e segurança

- **Direcional e de ganho alto:** a potência se concentra no feixe. Calcule a EIRP e mantenha pessoas
  fora da frente da antena. A calculadora de distância de segurança entra em uma fase futura.
- **Potência:** confira a potência máxima do cabo e do conector na frequência de uso.
- **Legislação:** transmitir exige licença de radioamador da **Anatel**. Confira o plano de
  bandas e os limites de potência vigentes (Anatel e LABRE).
- **Segurança física da instalação:**
  - Mantenha o mastro longe da rede elétrica. Na queda, ele não pode alcançar fios.
  - Aterre o mastro e a malha do cabo.
  - Use protetor contra descargas atmosféricas e desconecte o rádio em tempestades.
  - Uma hélice com refletor grande pega muito vento: dimensione o mastro e o rotor para isso.

## 9. Referências

- J. D. Kraus, R. J. Marhefka, *Antennas for All Applications*, 3ª ed., cap. 7 (antenas helicoidais, modo axial).
- Anatel: regulamentação do Serviço de Radioamador (versão vigente).
- LABRE: plano de bandas (versão vigente).
