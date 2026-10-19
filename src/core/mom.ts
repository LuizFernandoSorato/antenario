/**
 * Método dos momentos para fios finos no espaço livre (funções puras, sem DOM).
 *
 * Usado para obter o padrão de irradiação de antenas feitas de fios com elementos parasitas (Yagi, quadra): não existe
 * fórmula fechada, e o padrão depende das correntes induzidas em cada elemento.
 *
 * Formulação (Harrington, "Field Computation by Moment Methods", 1968; a mesma da teoria do NEC, Burke & Poggio, NOSC TD 116, 1981):
 * equação integral do campo elétrico (EFIE) com potenciais mistos, Galerkin e funções-base triangulares (corrente linear por
 * trechos, nula nas pontas livres), núcleo reduzido G = e^{-jkR}/(4πR) com R² = |r − r'|² + a² (a = raio do fio):
 *
 *   Z_mn = jωμ [ ∬ (t·t') f_m f_n G dl dl'  −  (1/k²) ∬ f_m' f_n' G dl dl' ],   Z·I = V.
 *
 * Fonte de tensão: gap delta no nó escolhido (V_m = V). Fios abertos (pontas livres) ou fechados (laços, como a quadra).
 * Os fios não se tocam: sem junções (cada fio é uma cadeia independente).
 *
 * A parte singular 1/R das integrais internas é feita analiticamente; o resto, por Gauss-Legendre.
 * Campo distante: E(r̂) ∝ Σ I ∫ f(l') [t' − (t'·r̂) r̂] e^{+jk r̂·r'} dl'. Só as razões entre direções importam aqui
 * (padrão normalizado e diretividade), então as constantes são omitidas.
 */

export type Vec3 = readonly [number, number, number];

export interface Wire {
  /** Vértices do fio. Fio aberto: M+1 pontos formam M trechos; fechado: M pontos formam M trechos (o último volta ao primeiro). */
  points: readonly Vec3[];
  /** Raio do fio, em metros. */
  radius: number;
  closed?: boolean;
}

export interface Source {
  /** Índice do fio. */
  wire: number;
  /** Índice do vértice onde fica o gap (fio aberto: nó interior, de 1 a M−1). */
  node: number;
  /** Tensão do gap (V), componente real e imaginária. */
  volts: { re: number; im: number };
}

export interface Complex3 {
  re: [number, number, number];
  im: [number, number, number];
}

const C0 = 299.792458; // m·MHz
const MU0 = 4e-7 * Math.PI;

interface Segment {
  p0: Vec3;
  t: Vec3;
  len: number;
  radius: number;
}

interface Piece {
  seg: number;
  /** true: f = l/Δ (cresce até o fim do trecho); false: f = 1 − l/Δ. */
  rising: boolean;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Nós e pesos de Gauss-Legendre em [0, 1]. */
function gauss(n: number): { x: number[]; w: number[] } {
  const x: number[] = [];
  const w: number[] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let dp = 1;
    for (let it = 0; it < 100; it++) {
      let p0 = 1;
      let p1 = z;
      for (let k = 2; k <= n; k++) {
        const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k;
        p0 = p1;
        p1 = p2;
      }
      dp = (n * (z * p1 - p0)) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x.push((1 - z) / 2);
    w.push(1 / ((1 - z * z) * dp * dp));
  }
  return { x, w };
}

const GN = 8;
const GF = 3;
const gNear = gauss(GN);
const gFar = gauss(GF);

export interface MomSolution {
  frequencyMHz: number;
  /** Impedância de entrada (V/I no gap) de cada fonte, em ohms. */
  inputImpedance: (sourceIndex: number) => { re: number; im: number };
  /** Corrente (A) no nó `node` do fio `wire` (a função-base daquele nó). */
  current: (wire: number, node: number) => { re: number; im: number };
  /** Campo distante (vetor complexo, sem constantes) na direção unitária `dir`. */
  farField: (dir: Vec3) => Complex3;
  /** Densidade de potência relativa |E|² na direção `dir`. */
  power: (dir: Vec3) => number;
  /** Diretividade (razão) por integração numérica na esfera; `power` pode ser substituída para combinar soluções. */
  directivity: (peak?: Vec3) => number;
  /** Cópia com a geometria girada (as correntes não mudam): útil para antenas formadas por estruturas iguais giradas. */
  rotated: (rotate: (v: Vec3) => Vec3) => MomSolution;
}

/** Soma de campos de soluções (cada uma com um fator complexo), por exemplo dois Yagis em quadratura. */
export function combinedPower(parts: { solution: MomSolution; factor: { re: number; im: number } }[]): (dir: Vec3) => number {
  return (dir) => {
    const re = [0, 0, 0];
    const im = [0, 0, 0];
    for (const { solution, factor } of parts) {
      const f = solution.farField(dir);
      for (let i = 0; i < 3; i++) {
        re[i]! += factor.re * f.re[i]! - factor.im * f.im[i]!;
        im[i]! += factor.re * f.im[i]! + factor.im * f.re[i]!;
      }
    }
    return re[0]! ** 2 + re[1]! ** 2 + re[2]! ** 2 + im[0]! ** 2 + im[1]! ** 2 + im[2]! ** 2;
  };
}

/** Diretividade (razão) de uma função de potência `p(dir)` por integração na esfera (θ a partir de z). */
export function directivityOf(p: (dir: Vec3) => number, peak?: Vec3, nTheta = 90, nPhi = 72): number {
  let total = 0;
  let max = 0;
  for (let i = 0; i < nTheta; i++) {
    const theta = (Math.PI * (i + 0.5)) / nTheta;
    const st = Math.sin(theta);
    let row = 0;
    for (let j = 0; j < nPhi; j++) {
      const phi = (2 * Math.PI * (j + 0.5)) / nPhi;
      const v = p([st * Math.cos(phi), st * Math.sin(phi), Math.cos(theta)]);
      row += v;
      if (v > max) max = v;
    }
    total += row * st * (Math.PI / nTheta) * ((2 * Math.PI) / nPhi);
  }
  // O máximo da grade pode perder o pico estreito: com `peak` (direção conhecida do máximo) usa-se esse valor.
  if (peak) max = Math.max(max, p(peak));
  return (4 * Math.PI * max) / total;
}

export function solveWires(wires: readonly Wire[], frequencyMHz: number, sources: readonly Source[]): MomSolution {
  const k = (2 * Math.PI * frequencyMHz) / C0;
  const omega = 2 * Math.PI * frequencyMHz * 1e6;

  // --- trechos e funções-base ---
  const segs: Segment[] = [];
  const segsOfWire: number[][] = [];
  wires.forEach((w) => {
    const n = w.points.length;
    const count = w.closed ? n : n - 1;
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      const a = w.points[i]!;
      const b = w.points[(i + 1) % n]!;
      const d = sub(b, a);
      const len = Math.hypot(d[0], d[1], d[2]);
      if (!(len > 0)) throw new RangeError('Trecho de fio com comprimento zero.');
      ids.push(segs.length);
      segs.push({ p0: a, t: [d[0] / len, d[1] / len, d[2] / len], len, radius: w.radius });
    }
    segsOfWire.push(ids);
  });

  const bases: [Piece, Piece][] = [];
  const baseIndex: Map<string, number> = new Map();
  wires.forEach((w, wi) => {
    const ids = segsOfWire[wi]!;
    const m = ids.length;
    const first = w.closed ? 0 : 1;
    for (let j = first; j <= m - 1; j++) {
      const left = ids[(j - 1 + m) % m]!;
      const right = ids[j % m]!;
      baseIndex.set(`${wi}:${j}`, bases.length);
      bases.push([
        { seg: left, rising: true },
        { seg: right, rising: false },
      ]);
    }
  });
  const nb = bases.length;
  if (nb === 0) throw new RangeError('Sem funções-base: os fios precisam de pelo menos 2 trechos.');

  // --- blocos por par de trechos ---
  // A[a][b] = ∬ f_a f_b G ; P = ∬ G, com a, b ∈ {0: rising, 1: falling}.
  // Parte real/imag de G integrada: calculada por par de trechos, guardada em blocos.
  const blkRe = new Float64Array(segs.length * segs.length * 5);
  const blkIm = new Float64Array(segs.length * segs.length * 5);

  function fillBlock(si: number, sj: number): void {
    const S = segs[si]!;
    const T = segs[sj]!;
    const mid = (g: Segment): Vec3 => [g.p0[0] + (g.t[0] * g.len) / 2, g.p0[1] + (g.t[1] * g.len) / 2, g.p0[2] + (g.t[2] * g.len) / 2];
    const dm = sub(mid(S), mid(T));
    const dist = Math.hypot(dm[0], dm[1], dm[2]);
    const far = dist > 3 * (S.len + T.len);
    const g = far ? gFar : gNear;
    const a2 = T.radius * T.radius;
    // acumuladores: AA[a][b] (re/im), PP (re/im)
    const aRe = [0, 0, 0, 0];
    const aIm = [0, 0, 0, 0];
    let pRe = 0;
    let pIm = 0;
    for (let q = 0; q < g.x.length; q++) {
      const lq = g.x[q]! * S.len;
      const wq = g.w[q]! * S.len;
      const r: Vec3 = [S.p0[0] + S.t[0] * lq, S.p0[1] + S.t[1] * lq, S.p0[2] + S.t[2] * lq];
      let i0Re = 0;
      let i0Im = 0;
      let i1Re = 0;
      let i1Im = 0;
      if (far) {
        for (let p = 0; p < g.x.length; p++) {
          const lp = g.x[p]! * T.len;
          const wp = g.w[p]! * T.len;
          const rp: Vec3 = [T.p0[0] + T.t[0] * lp, T.p0[1] + T.t[1] * lp, T.p0[2] + T.t[2] * lp];
          const d = sub(r, rp);
          const R = Math.sqrt(dot(d, d) + a2);
          const gr = Math.cos(k * R) / (4 * Math.PI * R);
          const gi = -Math.sin(k * R) / (4 * Math.PI * R);
          i0Re += wp * gr;
          i0Im += wp * gi;
          i1Re += wp * gr * g.x[p]!;
          i1Im += wp * gi * g.x[p]!;
        }
      } else {
        // parte singular 1/(4πR), analítica
        const d0 = sub(r, T.p0);
        const u = dot(d0, T.t);
        const rho2 = Math.max(dot(d0, d0) - u * u, 0) + a2;
        const rho = Math.sqrt(rho2);
        const sA = Math.asinh((T.len - u) / rho);
        const sB = Math.asinh(u / rho);
        const S0 = sA + sB;
        const R1 = Math.sqrt((T.len - u) ** 2 + rho2);
        const R0 = Math.sqrt(u * u + rho2);
        const S1 = (R1 - R0 + u * S0) / T.len;
        i0Re = S0 / (4 * Math.PI);
        i1Re = S1 / (4 * Math.PI);
        // parte suave (e^{-jkR} − 1)/(4πR)
        for (let p = 0; p < g.x.length; p++) {
          const lp = g.x[p]! * T.len;
          const wp = g.w[p]! * T.len;
          const rp: Vec3 = [T.p0[0] + T.t[0] * lp, T.p0[1] + T.t[1] * lp, T.p0[2] + T.t[2] * lp];
          const d = sub(r, rp);
          const R = Math.sqrt(dot(d, d) + a2);
          let gr: number;
          let gi: number;
          const x = k * R;
          if (x < 1e-4) {
            gr = (-k * k * R) / 2;
            gi = -k + (k * k * k * R * R) / 6;
          } else {
            gr = (Math.cos(x) - 1) / R;
            gi = -Math.sin(x) / R;
          }
          gr /= 4 * Math.PI;
          gi /= 4 * Math.PI;
          i0Re += wp * gr;
          i0Im += wp * gi;
          i1Re += wp * gr * g.x[p]!;
          i1Im += wp * gi * g.x[p]!;
        }
      }
      // pesos de teste: rising (l/Δ) e falling (1 − l/Δ)
      const fr = g.x[q]!;
      const ff = 1 - fr;
      // fonte rising: I1 ; falling: I0 − I1
      aRe[0]! += wq * fr * i1Re; //  a=rising, b=rising
      aIm[0]! += wq * fr * i1Im;
      aRe[1]! += wq * fr * (i0Re - i1Re); // a=rising, b=falling
      aIm[1]! += wq * fr * (i0Im - i1Im);
      aRe[2]! += wq * ff * i1Re; // a=falling, b=rising
      aIm[2]! += wq * ff * i1Im;
      aRe[3]! += wq * ff * (i0Re - i1Re);
      aIm[3]! += wq * ff * (i0Im - i1Im);
      pRe += wq * i0Re;
      pIm += wq * i0Im;
    }
    const o = (si * segs.length + sj) * 5;
    for (let i = 0; i < 4; i++) {
      blkRe[o + i] = aRe[i]!;
      blkIm[o + i] = aIm[i]!;
    }
    blkRe[o + 4] = pRe;
    blkIm[o + 4] = pIm;
  }

  for (let i = 0; i < segs.length; i++) for (let j = 0; j < segs.length; j++) fillBlock(i, j);

  // --- matriz Z ---
  const zRe = new Float64Array(nb * nb);
  const zIm = new Float64Array(nb * nb);
  const wmu = omega * MU0;
  for (let m = 0; m < nb; m++) {
    for (let n = 0; n < nb; n++) {
      let sRe = 0;
      let sIm = 0;
      for (const pm of bases[m]!) {
        const S = segs[pm.seg]!;
        const dm = pm.rising ? 1 / S.len : -1 / S.len;
        const a = pm.rising ? 0 : 1;
        for (const pn of bases[n]!) {
          const T = segs[pn.seg]!;
          const dn = pn.rising ? 1 / T.len : -1 / T.len;
          const b = pn.rising ? 0 : 1;
          const o = (pm.seg * segs.length + pn.seg) * 5;
          const tt = dot(S.t, T.t);
          const idx = a * 2 + b;
          sRe += tt * blkRe[o + idx]! - ((dm * dn) / (k * k)) * blkRe[o + 4]!;
          sIm += tt * blkIm[o + idx]! - ((dm * dn) / (k * k)) * blkIm[o + 4]!;
        }
      }
      // jωμ·(sRe + j sIm) = ωμ·(−sIm + j sRe)
      zRe[m * nb + n] = -wmu * sIm;
      zIm[m * nb + n] = wmu * sRe;
    }
  }

  // --- excitação e solução (eliminação de Gauss com pivô parcial, complexa) ---
  const bRe = new Float64Array(nb);
  const bIm = new Float64Array(nb);
  const srcBasis: number[] = [];
  sources.forEach((s) => {
    const idx = baseIndex.get(`${s.wire}:${s.node}`);
    if (idx === undefined) throw new RangeError('Fonte em um nó sem função-base (nó de ponta de fio aberto?).');
    bRe[idx]! += s.volts.re;
    bIm[idx]! += s.volts.im;
    srcBasis.push(idx);
  });
  const aRe = zRe.slice();
  const aIm = zIm.slice();
  const xRe = bRe.slice();
  const xIm = bIm.slice();
  for (let c = 0; c < nb; c++) {
    let piv = c;
    let best = -1;
    for (let r = c; r < nb; r++) {
      const mag = aRe[r * nb + c]! ** 2 + aIm[r * nb + c]! ** 2;
      if (mag > best) {
        best = mag;
        piv = r;
      }
    }
    if (!(best > 0)) throw new RangeError('Matriz singular no método dos momentos.');
    if (piv !== c) {
      for (let j = 0; j < nb; j++) {
        [aRe[c * nb + j], aRe[piv * nb + j]] = [aRe[piv * nb + j]!, aRe[c * nb + j]!];
        [aIm[c * nb + j], aIm[piv * nb + j]] = [aIm[piv * nb + j]!, aIm[c * nb + j]!];
      }
      [xRe[c], xRe[piv]] = [xRe[piv]!, xRe[c]!];
      [xIm[c], xIm[piv]] = [xIm[piv]!, xIm[c]!];
    }
    const pr = aRe[c * nb + c]!;
    const pi = aIm[c * nb + c]!;
    const den = pr * pr + pi * pi;
    for (let r = c + 1; r < nb; r++) {
      const er = aRe[r * nb + c]!;
      const ei = aIm[r * nb + c]!;
      if (er === 0 && ei === 0) continue;
      const fr = (er * pr + ei * pi) / den;
      const fi = (ei * pr - er * pi) / den;
      for (let j = c; j < nb; j++) {
        const ur = aRe[c * nb + j]!;
        const ui = aIm[c * nb + j]!;
        aRe[r * nb + j]! -= fr * ur - fi * ui;
        aIm[r * nb + j]! -= fr * ui + fi * ur;
      }
      xRe[r]! -= fr * xRe[c]! - fi * xIm[c]!;
      xIm[r]! -= fr * xIm[c]! + fi * xRe[c]!;
    }
  }
  for (let r = nb - 1; r >= 0; r--) {
    let sr = xRe[r]!;
    let si = xIm[r]!;
    for (let j = r + 1; j < nb; j++) {
      sr -= aRe[r * nb + j]! * xRe[j]! - aIm[r * nb + j]! * xIm[j]!;
      si -= aRe[r * nb + j]! * xIm[j]! + aIm[r * nb + j]! * xRe[j]!;
    }
    const pr = aRe[r * nb + r]!;
    const pi = aIm[r * nb + r]!;
    const den = pr * pr + pi * pi;
    xRe[r] = (sr * pr + si * pi) / den;
    xIm[r] = (si * pr - sr * pi) / den;
  }

  return makeSolution(frequencyMHz, k, segs, bases, xRe, xIm, sources, srcBasis, baseIndex);
}

function makeSolution(
  frequencyMHz: number,
  k: number,
  segs: Segment[],
  bases: [Piece, Piece][],
  iRe: Float64Array,
  iIm: Float64Array,
  sources: readonly Source[],
  srcBasis: number[],
  baseIndex: Map<string, number>,
): MomSolution {
  // Corrente nos nós extremos de cada trecho: soma das contribuições das bases (valores nodais da corrente).
  const nodeStart = new Float64Array(segs.length * 2); // [re, im] da corrente no início
  const nodeEnd = new Float64Array(segs.length * 2);
  bases.forEach((b, n) => {
    for (const piece of b) {
      if (piece.rising) {
        nodeEnd[piece.seg * 2]! += iRe[n]!;
        nodeEnd[piece.seg * 2 + 1]! += iIm[n]!;
      } else {
        nodeStart[piece.seg * 2]! += iRe[n]!;
        nodeStart[piece.seg * 2 + 1]! += iIm[n]!;
      }
    }
  });

  const farField = (dir: Vec3): Complex3 => {
    const re: [number, number, number] = [0, 0, 0];
    const im: [number, number, number] = [0, 0, 0];
    for (let s = 0; s < segs.length; s++) {
      const S = segs[s]!;
      const i0r = nodeStart[s * 2]!;
      const i0i = nodeStart[s * 2 + 1]!;
      const i1r = nodeEnd[s * 2]!;
      const i1i = nodeEnd[s * 2 + 1]!;
      // ∫ I(l) e^{jk r̂·r'} dl por Gauss, com I linear entre os valores nodais
      let cr = 0;
      let ci = 0;
      for (let q = 0; q < gFar.x.length; q++) {
        const x = gFar.x[q]!;
        const l = x * S.len;
        const ph = k * (dir[0] * (S.p0[0] + S.t[0] * l) + dir[1] * (S.p0[1] + S.t[1] * l) + dir[2] * (S.p0[2] + S.t[2] * l));
        const c = Math.cos(ph);
        const sn = Math.sin(ph);
        const ir = i0r * (1 - x) + i1r * x;
        const ii = i0i * (1 - x) + i1i * x;
        const w = gFar.w[q]! * S.len;
        cr += w * (ir * c - ii * sn);
        ci += w * (ir * sn + ii * c);
      }
      const td = dot(S.t, dir);
      for (let c = 0; c < 3; c++) {
        const comp = S.t[c]! - td * dir[c]!;
        re[c]! += comp * cr;
        im[c]! += comp * ci;
      }
    }
    return { re, im };
  };
  const power = (dir: Vec3): number => {
    const f = farField(dir);
    return f.re[0] ** 2 + f.re[1] ** 2 + f.re[2] ** 2 + f.im[0] ** 2 + f.im[1] ** 2 + f.im[2] ** 2;
  };
  const inputImpedance = (index: number): { re: number; im: number } => {
    const idx = srcBasis[index];
    if (idx === undefined) throw new RangeError('Fonte inexistente.');
    const v = sources[index]!.volts;
    const cr = iRe[idx]!;
    const ci = iIm[idx]!;
    const den = cr * cr + ci * ci;
    return { re: (v.re * cr + v.im * ci) / den, im: (v.im * cr - v.re * ci) / den };
  };
  const solution: MomSolution = {
    frequencyMHz,
    inputImpedance,
    current: (wire, node) => {
      const idx = baseIndex.get(`${wire}:${node}`);
      if (idx === undefined) throw new RangeError('Nó sem corrente (ponta de fio aberto?).');
      return { re: iRe[idx]!, im: iIm[idx]! };
    },
    farField,
    power,
    directivity: (peak) => directivityOf(power, peak),
    rotated: (rotate) => {
      const rotSegs: Segment[] = segs.map((s) => ({ p0: rotate(s.p0), t: rotate(s.t), len: s.len, radius: s.radius }));
      return makeSolution(frequencyMHz, k, rotSegs, bases, iRe, iIm, sources, srcBasis, baseIndex);
    },
  };
  return solution;
}
