# Transformador de 1/4 de onda

## Antes de cortar

- O comprimento que a ferramenta mostra já inclui o **fator de velocidade** do cabo escolhido. Use o mesmo tipo de cabo que você selecionou: outro cabo, outro VF, outro comprimento.
- Meça o cabo **entre os pontos de solda** (ou entre os planos de referência dos conectores). Pontas de fio e a solda também contam no comprimento elétrico.
- Corte **um pouco comprido** (alguns milímetros em VHF/UHF) e encurte medindo. É fácil cortar; não dá para emendar.

## Montagem com um cabo

1. Corte o trecho no comprimento calculado e prepare as duas pontas (vivo e malha expostos, o mínimo possível).
2. Ligue uma ponta ao cabo do rádio (conector tipo T, emenda soldada ou conector de passagem) e a outra à antena.
3. Mantenha o trecho **reto ou com curvas largas**, sem dobras fechadas, que mudam a impedância do cabo.

## Montagem com dois cabos em paralelo

Serve quando o Z_t ideal é **menor** que a impedância de um cabo disponível: dois cabos iguais em paralelo têm metade da impedância.

1. Use **dois pedaços do mesmo cabo** (mesmo tipo e, de preferência, do mesmo lance), cortados com **exatamente o mesmo comprimento**.
2. Em cada ponta, una os **dois vivos** entre si e as **duas malhas** entre si. Mantenha as ligações curtas: fios longos entram no comprimento e na indutância.
3. Ligue o cabo do rádio à junção A e a antena à junção B, vivo com vivo e malha com malha.
4. Deixe os dois cabos **lado a lado** e encostados, em toda a extensão. Se um se afasta do outro, o conjunto deixa de se comportar como uma linha só.
5. Confira o resultado de ROE da ferramenta: nem toda combinação de cabos dá um bom casamento para a sua carga. Se a ROE esperada for alta, escolha outro cabo.

## Ajuste

1. Ligue o NanoVNA (ou medidor de ROE) onde o cabo do rádio chegaria e a antena na outra ponta. Procure o ponto de menor ROE na frequência de projeto.
2. Se a ROE mínima estiver em frequência **abaixo** da desejada, o trecho está comprido: encurte aos poucos. Se estiver **acima**, ele ficou curto: refaça com outro pedaço.
3. Um truque de bancada: com a ponta da antena **em aberto**, um trecho de λ/4 aparece como curto (mínimo de |Z|) exatamente na frequência em que tem λ/4. Isso permite medir o comprimento elétrico real do trecho.

## Erros comuns

- Usar o VF do catálogo para um cabo de outro tipo.
- Cortar os dois cabos do par com comprimentos diferentes.
- Esquecer que o transformador só vale se a carga for **resistiva** no ponto da ligação.
- Deixar conectores e emendas sem vedação contra a água.
