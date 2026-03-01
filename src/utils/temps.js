export function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

export function normals(doy) {
  const ph = (doy - 205) / 365 * Math.PI * 2;
  return { avgH: 11.5 + 16.5 * Math.cos(ph), avgL: 3.0 + 14.5 * Math.cos(ph) };
}

export const toF  = c => c * 9 / 5 + 32;
export const disp = (c, u) => u === 'F' ? Math.round(toF(c)) : Math.round(c);
