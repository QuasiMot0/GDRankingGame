export function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Weighted sample: lower position (harder) gets higher weight.
// `bias` 0 = uniform, higher = stronger pull toward the top.
export function pickWeighted(arr, n, bias) {
  if (bias <= 0) return pickRandom(arr, n);
  const pool = [...arr];
  const picked = [];
  while (picked.length < n && pool.length) {
    const weights = pool.map(d => 1 / Math.pow(d.position, bias));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export function youtubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&modestbranding=1&rel=0` : null;
}

export function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  const A = 0x1F1E6;
  const base = 65;
  const upper = code.toUpperCase();
  return (
    String.fromCodePoint(upper.charCodeAt(0) - base + A) +
    String.fromCodePoint(upper.charCodeAt(1) - base + A)
  );
}
