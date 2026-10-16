/** Utilitários só para testes (não são importados pelo app). */

/** Confere que as tags do SVG estão balanceadas e bem aninhadas. Lança Error se não estiverem. */
export function assertWellFormed(svg: string): void {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) throw new Error(`Tag </${name}> fecha <${open ?? 'nada'}>`);
    } else {
      stack.push(name!);
    }
  }
  if (stack.length > 0) throw new Error(`Tags sem fechar: ${stack.join(', ')}`);
}

/** Texto visível do SVG (conteúdo dos <text>), para conferir rótulos. */
export function svgTexts(svg: string): string[] {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c))));
}
