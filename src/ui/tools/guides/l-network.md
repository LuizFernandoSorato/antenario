# Rede L

## Escolha da solução

- Em transmissão, prefira a solução **passa-baixas** (indutor em série, capacitor em paralelo): atenua harmônicos do transmissor.
- Confira se os valores são **práticos**: capacitores de poucos pF ou indutores de uma fração de espira são difíceis de acertar.

## Componentes

- **Capacitor:** a tensão de trabalho tem de ficar bem acima da tensão de pico mostrada. Para potências maiores, use capacitor de mica, cerâmico de alta tensão ou variável a ar, com espaçamento de placas adequado.
- **Indutor:** use fio grosso, que suporte a corrente eficaz indicada, em ar (sem núcleo de ferrite, que pode saturar e esquentar). Afaste-o de peças metálicas, que mudam a indutância.
- **Terminais e fios curtos:** cada centímetro de fio soma indutância e capacitância parasita, principalmente em VHF.

## Montagem

1. Monte a rede numa **caixa metálica** (blindagem), com os conectores de entrada e saída e o terra comum ligado à caixa.
2. O elemento **em série** fica no condutor vivo, entre o conector do rádio e o da antena. O elemento **em paralelo** liga o vivo ao terra, no ponto do esquema (lado do rádio ou da antena, conforme a solução).
3. Para ajustar, use um **capacitor variável** ou um indutor cujas espiras possam ser afastadas ou juntadas.

## Ajuste

1. Meça a ROE (ou o |S11| no NanoVNA) na entrada da rede, com a antena ligada.
2. Ajuste um elemento de cada vez; ajustes pequenos e repetidos convergem.
3. Teste com **pouca potência** antes de subir. Se um componente esquentar, a corrente é maior que a prevista: use fio mais grosso ou revise o casamento.

## Erros comuns

- Medir a impedância da antena **com o cabo no caminho** e usar o valor como se fosse da antena: o cabo transforma a impedância. Meça nos terminais da antena, ou leve em conta o comprimento do cabo.
- Capacitor com tensão de trabalho curta: em transmissão, a tensão pode chegar a centenas ou milhares de volts.
- Rede sem caixa e sem terra: capacitância parasita e irradiação não prevista.
