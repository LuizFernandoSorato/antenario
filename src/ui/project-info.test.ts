import { describe, expect, it } from 'vitest';
import { REPO_URL, creditsHtml, parseStarCount } from './project-info';

describe('autor e repositório no cabeçalho', () => {
  it('lê o número de estrelas da resposta da API do GitHub', () => {
    expect(parseStarCount({ stargazers_count: 12 })).toBe(12);
    expect(parseStarCount({ stargazers_count: 0 })).toBe(0);
  });

  it('resposta sem o campo (erro, limite de consultas) não mostra número', () => {
    expect(parseStarCount({ message: 'API rate limit exceeded' })).toBeNull();
    expect(parseStarCount({ stargazers_count: '12' })).toBeNull();
    expect(parseStarCount(null)).toBeNull();
  });

  it('o botão de estrela leva ao repositório e o contador começa escondido', () => {
    const html = creditsHtml();
    expect(html).toContain(`class="star-button" href="${REPO_URL}"`);
    expect(html).toMatch(/class="star-count" hidden/);
  });
});
