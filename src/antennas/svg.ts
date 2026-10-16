/**
 * Primitivas SVG para os diagramas das antenas.
 *
 * Cores e espessuras vêm de classes CSS (`.dg-*` em style.css), não de atributos:
 * assim o diagrama segue o tema claro/escuro e vira preto no papel ao imprimir.
 */

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Coordenadas com no máximo 2 casas, sem zeros inúteis. */
export function n(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function svgDoc(width: number, height: number, title: string, description: string, body: string): string {
  return `<svg class="diagram" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dg-title dg-desc">
<title id="dg-title">${esc(title)}</title>
<desc id="dg-desc">${esc(description)}</desc>
<defs>
<marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="dg-arrowhead"/></marker>
</defs>
${body}
</svg>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, cls: string): string {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" class="${cls}"/>`;
}

export function circle(cx: number, cy: number, r: number, cls: string): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" class="${cls}"/>`;
}

export function rect(x: number, y: number, w: number, h: number, cls: string): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" class="${cls}"/>`;
}

export function text(x: number, y: number, content: string, anchor: 'start' | 'middle' | 'end' = 'middle', cls = 'dg-label'): string {
  return `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" class="${cls}">${esc(content)}</text>`;
}

/** Cota horizontal entre x1 e x2, na altura y, com linhas de chamada opcionais até `fromY`. */
export function dimH(x1: number, x2: number, y: number, label: string, fromY?: number): string {
  const ext =
    fromY === undefined ? '' : line(x1, fromY, x1, y + Math.sign(y - fromY) * 6, 'dg-ext') + line(x2, fromY, x2, y + Math.sign(y - fromY) * 6, 'dg-ext');
  return `${ext}<line x1="${n(x1)}" y1="${n(y)}" x2="${n(x2)}" y2="${n(y)}" class="dg-dim" marker-start="url(#dg-arrow)" marker-end="url(#dg-arrow)"/>${text((x1 + x2) / 2, y - 7, label)}`;
}

/** Cota vertical entre y1 e y2, na posição x. O rótulo fica do lado indicado. */
export function dimV(x: number, y1: number, y2: number, label: string, side: 'left' | 'right'): string {
  const tx = side === 'left' ? x - 8 : x + 8;
  return `<line x1="${n(x)}" y1="${n(y1)}" x2="${n(x)}" y2="${n(y2)}" class="dg-dim" marker-start="url(#dg-arrow)" marker-end="url(#dg-arrow)"/>${text(tx, (y1 + y2) / 2 + 4, label, side === 'left' ? 'end' : 'start')}`;
}
