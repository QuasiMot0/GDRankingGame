import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Shuffle, Play, RefreshCw, Trophy, Skull, GripVertical } from "lucide-react";

// ---------- helpers ----------
const PROXY = "https://pointercrate.com/api/v2/demons/listed/";

async function fetchRange(start, end) {
  // pointercrate paginates by id, not position, so we just pull pages and filter by position
  // grab pages of 100 starting from position 1 until we cover the range
  const out = [];
  let after = null;
  const limit = 100;
  const maxPages = Math.ceil(end / limit) + 2;
  for (let i = 0; i < maxPages; i++) {
    const url = new URL(PROXY);
    url.searchParams.set("limit", String(limit));
    if (after !== null) url.searchParams.set("after", String(after));
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`pointercrate ${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    out.push(...page);
    // pointercrate sorts /listed by position ascending, so once we have enough we can stop
    const maxPos = Math.max(...page.map(d => d.position));
    if (maxPos >= end) break;
    after = page[page.length - 1].id;
  }
  return out.filter(d => d.position >= start && d.position <= end);
}

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Weighted sample: lower position (harder) gets higher weight.
// `bias` 0 = uniform, higher = stronger pull toward the top.
function pickWeighted(arr, n, bias) {
  if (bias <= 0) return pickRandom(arr, n);
  const pool = [...arr];
  const picked = [];
  // weight = 1 / (position ^ bias) — position 1 dominates as bias grows
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

function levelThumb(d) {
  // pointercrate returns thumbnail field; fallback to youtube parse
  if (d.thumbnail) return d.thumbnail;
  if (d.video) {
    const m = d.video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return null;
}

// ---------- styles ----------
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Russo+One&family=JetBrains+Mono:wght@400;700&family=Bebas+Neue&display=swap');

  :root {
    --bg: #061228;
    --bg-2: #0a1c3e;
    --ink: #ffffff;
    --ink-dim: #5577aa;
    --accent: #ffcc00;
    --accent-shadow: #997700;
    --accent-2: #44aaff;
    --success: #44dd88;
    --success-shadow: #229955;
    --warn: #ff9900;
    --danger: #ff4444;
    --card: #0b1e42;
    --card-2: #0e254f;
    --line: #1a3a70;
    --line-bright: #2255bb;
  }

  * { box-sizing: border-box; }

  .gd-root {
    min-height: 100vh;
    background: url('/bg.png') center center / cover fixed;
    color: var(--ink);
    font-family: 'JetBrains Mono', monospace;
    padding: 24px;
    position: relative;
    overflow-x: hidden;
  }

  .gd-inner { max-width: 1100px; margin: 0 auto; }

  .gd-header {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 8px; flex-wrap: wrap; gap: 12px;
  }
  .gd-title {
    font-family: 'Russo One', sans-serif;
    font-size: clamp(28px, 5vw, 48px);
    letter-spacing: 0.02em;
    margin: 0;
    color: var(--accent);
    text-shadow: 0 3px 0 var(--accent-shadow), 0 0 30px rgba(255,204,0,.25);
  }
  .gd-subtitle {
    font-size: 12px; color: var(--ink-dim);
    text-transform: uppercase; letter-spacing: 0.2em;
  }

  .gd-controls {
    background: rgba(6, 18, 40, 0.75);
    border: 2px solid var(--line);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    align-items: end;
    backdrop-filter: blur(4px);
  }
  .gd-field { display: flex; flex-direction: column; gap: 4px; }
  .gd-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em;
    color: var(--accent); font-weight: 700;
  }
  .gd-input, .gd-select {
    background: var(--bg-2);
    border: 2px solid var(--line);
    color: var(--ink);
    padding: 8px 10px;
    font-family: inherit;
    font-size: 14px;
    border-radius: 4px;
  }
  .gd-input:focus, .gd-select:focus {
    outline: none;
    border-color: var(--accent-2);
    box-shadow: 0 0 0 2px rgba(68,170,255,.2);
  }
  .gd-select option { background: var(--bg-2); }

  .gd-btn {
    background: var(--accent);
    color: #1a1000;
    border: none;
    padding: 10px 16px;
    font-family: 'Russo One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 6px;
    display: inline-flex; align-items: center; gap: 8px;
    transition: transform .1s, box-shadow .1s;
    box-shadow: 0 5px 0 var(--accent-shadow);
  }
  .gd-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 0 var(--accent-shadow); }
  .gd-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--accent-shadow); }
  .gd-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; transform: none; }

  .gd-btn-ghost {
    background: rgba(6,18,40,.6);
    color: var(--ink);
    border: 2px solid var(--line);
    box-shadow: 0 4px 0 #081428;
  }
  .gd-btn-ghost:hover { border-color: var(--accent-2); box-shadow: 0 5px 0 #081428; }
  .gd-btn-ghost:active { box-shadow: 0 2px 0 #081428; }

  .gd-btn-success {
    background: var(--success);
    color: #001a0a;
    box-shadow: 0 5px 0 var(--success-shadow);
  }
  .gd-btn-success:hover { box-shadow: 0 6px 0 var(--success-shadow); }
  .gd-btn-success:active { box-shadow: 0 2px 0 var(--success-shadow); }

  .gd-status {
    text-align: center; padding: 60px 20px;
    font-size: 14px; color: var(--ink-dim);
  }
  .gd-status .spinner {
    display: inline-block;
    width: 24px; height: 24px;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 12px; vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .gd-error {
    background: rgba(255,68,68,.12);
    border: 2px solid var(--danger);
    color: #ffaaaa;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .gd-list { display: flex; flex-direction: column; gap: 6px; }

  .gd-card {
    background: rgba(255, 255, 255, 0.94);
    border: 2px solid rgba(200, 215, 240, 0.8);
    border-radius: 8px;
    padding: 10px;
    display: grid;
    grid-template-columns: 144px 1fr auto auto auto;
    gap: 10px;
    align-items: stretch;
    cursor: grab;
    transition: border-color .15s, box-shadow .15s;
  }
  .gd-card:hover { border-color: var(--line-bright); box-shadow: 0 4px 16px rgba(0,0,0,.3); }
  .gd-card.dragging { opacity: 0.35; cursor: grabbing; }
  .gd-card.drag-over { border-color: var(--line-bright); }
.gd-card.reveal-correct { border-color: var(--success); box-shadow: 0 0 16px rgba(68,221,136,.3); }
  .gd-card.reveal-close { border-color: var(--warn); }
  .gd-card.reveal-wrong { border-color: var(--danger); }

  .gd-thumb {
    width: 144px; height: 81px;
    background: #e5e7eb;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid #d1d5db;
    display: block;
    align-self: center;
  }
  .gd-thumb-placeholder {
    width: 144px; height: 81px;
    background: #e5e7eb;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: #9ca3af;
    align-self: center;
  }

  .gd-meta { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
  .gd-name {
    font-family: 'Russo One', sans-serif;
    font-size: 18px;
    letter-spacing: 0.01em;
    color: #111827;
    margin: 0 0 4px;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gd-name-rank { color: var(--accent-shadow); margin-right: 2px; }
  .gd-by {
    font-size: 12px; color: #6b7280;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
  }
  .gd-actual {
    font-size: 12px;
    color: #1d6fb8;
    font-weight: 700;
    letter-spacing: 0.03em;
    margin-top: 4px;
  }
  .gd-diff { color: #9ca3af; margin-left: 8px; }
  .gd-diff.bad { color: var(--danger); }
  .gd-diff.ok { color: var(--warn); }
  .gd-diff.good { color: #16a34a; }

  .gd-play-col {
    display: flex; align-items: center; justify-content: center;
  }
  .gd-play-btn {
    background: #f3f4f6;
    border: 2px solid #d1d5db;
    color: #6b7280;
    width: 52px;
    height: 100%;
    border-radius: 6px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .12s;
    text-decoration: none;
  }
  .gd-play-btn:hover { color: var(--accent-shadow); border-color: var(--accent); background: #fffbeb; }

  .gd-arrows-col { display: flex; flex-direction: column; gap: 4px; }
  .gd-icon-btn {
    background: #f3f4f6;
    border: 2px solid #d1d5db;
    color: #6b7280;
    width: 36px;
    flex: 1;
    border-radius: 4px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .12s;
  }
  .gd-icon-btn:hover { color: var(--accent-shadow); border-color: var(--accent); background: #fffbeb; }
  .gd-icon-btn.disabled { opacity: 0.25; cursor: not-allowed; }
  .gd-grip {
    color: #9ca3af;
    display: flex; align-items: center; justify-content: center;
  }

  .gd-empty {
    text-align: center; padding: 80px 20px;
    border: 2px dashed var(--line);
    border-radius: 8px;
    color: var(--ink-dim);
    background: rgba(6,18,40,.5);
  }
  .gd-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.35; }

  .gd-score {
    background: linear-gradient(90deg, rgba(6,18,40,.9), rgba(10,30,66,.9));
    border: 2px solid var(--accent);
    border-radius: 6px;
    color: var(--ink);
    padding: 16px 20px;
    margin-bottom: 16px;
    font-family: 'Russo One', sans-serif;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 8px;
    box-shadow: 0 0 24px rgba(255,204,0,.15);
  }
  .gd-score-num { font-size: 32px; color: var(--accent); text-shadow: 0 2px 0 var(--accent-shadow); }
  .gd-score-detail { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ink-dim); margin-top: 4px; }

  @media (max-width: 600px) {
    .gd-card { grid-template-columns: 96px 1fr auto auto auto; gap: 6px; padding: 8px; }
    .gd-thumb, .gd-thumb-placeholder { width: 96px; height: 54px; }
    .gd-name { font-size: 15px; }
    .gd-play-btn { width: 40px; height: 36px; }
  }
`;

// ---------- main ----------
export default function App() {
  // defaults: top 150 pool, names + thumbs + video link visible
  const [mode, setMode] = useState("weighted"); // "weighted" | "topN" | "uniform"
  const [poolMax, setPoolMax] = useState(150);
  const [count, setCount] = useState(8);
  const [demons, setDemons] = useState([]); // current display order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(null);

  const dragId = useRef(null);
  const dragOverId = useRef(null);
  const [, force] = useState(0);
  const cardRefs = useRef({});
  const [pendingFlip, setPendingFlip] = useState(null);

  async function startNewRound() {
    setLoading(true);
    setError(null);
    setRevealed(false);
    setScore(null);
    setDemons([]);
    try {
      let picked;
      if (mode === "topN") {
        // exact top N — no randomness, no pool
        const top = await fetchRange(1, count);
        picked = top.sort((a, b) => a.position - b.position).slice(0, count);
      } else {
        const pool = await fetchRange(1, poolMax);
        if (!pool.length) throw new Error("no demons returned");
        if (mode === "uniform") {
          picked = pickRandom(pool, Math.min(count, pool.length));
        } else {
          // weighted: scale bias by how many you're pulling relative to pool size.
          // smaller pulls → stronger top bias. ~0.6 for tiny pulls, ~0.15 for big pulls.
          const ratio = count / poolMax;
          const bias = Math.max(0.1, 0.7 - ratio * 2);
          picked = pickWeighted(pool, Math.min(count, pool.length), bias);
        }
      }
      // shuffle display order so it's not pre-sorted
      const shuffled = pickRandom(picked, picked.length);
      setDemons(shuffled);
    } catch (e) {
      setError(e.message || "failed to load demons");
    } finally {
      setLoading(false);
    }
  }

  // pendingFlip: map of { [cardId]: DOMRect } captured before a reorder
  useLayoutEffect(() => {
    if (!pendingFlip) return;
    const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const duration = 220;
    const toClean = [];

    // Apply inverse transforms (move cards back to old positions)
    const moved = [];
    for (const [id, oldRect] of Object.entries(pendingFlip)) {
      const el = cardRefs.current[id];
      if (!el) continue;
      const newRect = el.getBoundingClientRect();
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dy) < 1) continue;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      moved.push(el);
    }

    if (!moved.length) { setPendingFlip(null); return; }
    void moved[0].offsetHeight; // force reflow

    // Animate to resting position
    for (const el of moved) {
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = '';
      const t = setTimeout(() => { if (el) el.style.transition = ''; }, duration + 20);
      toClean.push(t);
    }

    setPendingFlip(null);
    return () => toClean.forEach(clearTimeout);
  }, [pendingFlip]);

  function captureRects() {
    const rects = {};
    for (const [id, el] of Object.entries(cardRefs.current)) {
      if (el) rects[id] = el.getBoundingClientRect();
    }
    return rects;
  }

  function move(idx, dir) {
    if (revealed) return;
    const next = [...demons];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const rects = captureRects();
    [next[idx], next[target]] = [next[target], next[idx]];
    setDemons(next);
    setPendingFlip(rects);
  }

  const dragStartOrderRef = useRef(null);
  const dropHappenedRef = useRef(false);

  function handleDragStart(e, id) {
    if (revealed) { e.preventDefault(); return; }
    dragId.current = id;
    dragStartOrderRef.current = [...demons];
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e, targetId) {
    if (revealed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const fromId = dragId.current;
    if (!fromId || fromId === targetId || dragOverId.current === targetId) return;
    dragOverId.current = targetId;
    const rects = captureRects();
    setDemons(prev => {
      const fromIdx = prev.findIndex(d => d.id === fromId);
      const toIdx = prev.findIndex(d => d.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setPendingFlip(rects);
  }
  function handleDragLeave() {
    dragOverId.current = null;
  }
  function handleDrop(e) {
    if (revealed) return;
    e.preventDefault();
    dropHappenedRef.current = true;
    dragId.current = null;
    dragOverId.current = null;
    dragStartOrderRef.current = null;
  }
  function handleDragEnd() {
    if (!dropHappenedRef.current && dragStartOrderRef.current) {
      setDemons(dragStartOrderRef.current);
    }
    dropHappenedRef.current = false;
    dragStartOrderRef.current = null;
    dragId.current = null;
    dragOverId.current = null;
    force(n => n + 1);
  }

  function reveal() {
    // score: sum of absolute position errors. lower is better.
    const sortedByActual = [...demons].sort((a, b) => a.position - b.position);
    let totalErr = 0;
    let exact = 0;
    demons.forEach((d, i) => {
      const correctIdx = sortedByActual.findIndex(x => x.id === d.id);
      const err = Math.abs(i - correctIdx);
      totalErr += err;
      if (err === 0) exact++;
    });
    setScore({ totalErr, exact, total: demons.length });
    setRevealed(true);
  }

  function diffClass(err) {
    if (err === 0) return "good";
    if (err === 1) return "ok";
    return "bad";
  }

  // sorted-by-actual lookup for revealed coloring
  const correctIdxById = React.useMemo(() => {
    if (!revealed) return {};
    const sorted = [...demons].sort((a, b) => a.position - b.position);
    const map = {};
    sorted.forEach((d, i) => { map[d.id] = i; });
    return map;
  }, [revealed, demons]);

  return (
    <>
      <style>{css}</style>
      <div className="gd-root">
        <div className="gd-inner">
          <div className="gd-header">
            <div>
              <h1 className="gd-title">DEMON RANK</h1>
              <div className="gd-subtitle">Pointercrate Ranking Game</div>
            </div>
            <div className="gd-subtitle">drag · drop · guess · reveal</div>
          </div>

          <div className="gd-controls">
            <div className="gd-field">
              <label className="gd-label">Mode</label>
              <select
                className="gd-select"
                value={mode}
                onChange={e => setMode(e.target.value)}
                disabled={loading}
              >
                <option value="weighted">Random (harder bias)</option>
                <option value="uniform">Random (uniform)</option>
                <option value="topN">Just the top N</option>
              </select>
            </div>

            <div className="gd-field">
              <label className="gd-label">Pool (top N)</label>
              <select
                className="gd-select"
                value={poolMax}
                onChange={e => setPoolMax(Number(e.target.value))}
                disabled={loading || mode === "topN"}
              >
                <option value={75}>Top 75 (main list)</option>
                <option value={150}>Top 150</option>
                <option value={250}>Top 250</option>
                <option value={500}>Top 500</option>
                <option value={1000}>Top 1000</option>
              </select>
            </div>

            <div className="gd-field">
              <label className="gd-label">
                {mode === "topN" ? "Top how many" : "Levels per round"}
              </label>
              <input
                className="gd-input"
                type="number" min={2} max={20}
                value={count}
                onChange={e => setCount(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
                disabled={loading}
              />
            </div>

<div className="gd-field">
              <label className="gd-label">&nbsp;</label>
              <button className="gd-btn" onClick={startNewRound} disabled={loading}>
                {loading ? <RefreshCw size={14} className="spin"/> : <Shuffle size={14}/>}
                New round
              </button>
            </div>
          </div>

          {error && <div className="gd-error">⚠ {error}</div>}

          {loading && (
            <div className="gd-status">
              <span className="spinner"/>
              Loading demons from Pointercrate...
            </div>
          )}

          {!loading && demons.length === 0 && !error && (
            <div className="gd-empty">
              <div className="gd-empty-icon"><Skull size={48}/></div>
              <div>Pick your pool size and number of levels, then hit New Round.</div>
            </div>
          )}

          {score && (
            <div className="gd-score">
              <div>
                <div className="gd-score-num">{score.exact}/{score.total}</div>
                <div className="gd-score-detail">Exact placements</div>
              </div>
              <div>
                <div className="gd-score-num">{score.totalErr}</div>
                <div className="gd-score-detail">Total position error · lower = better</div>
              </div>
            </div>
          )}

          {demons.length > 0 && (
            <div className="gd-list">
              {demons.map((d, i) => {
                const thumb = levelThumb(d);
                const isDragging = dragId.current === d.id;
                const isOver = dragOverId.current === d.id && dragId.current !== d.id;
                const err = revealed ? Math.abs(i - correctIdxById[d.id]) : null;
                const cardClass = [
                  "gd-card",
                  isDragging ? "dragging" : "",
                  isOver ? "drag-over" : "",
                  revealed && err === 0 ? "reveal-correct" : "",
                  revealed && err === 1 ? "reveal-close" : "",
                  revealed && err > 1 ? "reveal-wrong" : "",
                ].filter(Boolean).join(" ");

                return (
                  <div
                    key={d.id}
                    ref={el => { cardRefs.current[d.id] = el; }}
                    className={cardClass}
                    draggable={!revealed}
                    onDragStart={e => handleDragStart(e, d.id)}
                    onDragOver={e => handleDragOver(e, d.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  >
                    {thumb
                      ? <img className="gd-thumb" src={thumb} alt={d.name} loading="lazy"/>
                      : <div className="gd-thumb-placeholder"><Skull size={20}/></div>
                    }

                    <div className="gd-meta">
                      <div className="gd-name">
                        <span className="gd-name-rank">#{i+1}</span> – {d.name}
                      </div>
                      <div className="gd-by">
                        published by {d.publisher?.name || "?"}
                        {d.verifier?.name && d.verifier.name !== d.publisher?.name &&
                          <> · verified by {d.verifier.name}</>
                        }
                      </div>
                      {revealed && (
                        <div className="gd-actual">
                          actually #{d.position}
                          <span className={`gd-diff ${diffClass(err)}`}>
                            {err === 0 ? " ✓ exact" : ` off by ${err}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="gd-play-col">
                      {d.video && (
                        <a
                          href={d.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gd-play-btn"
                          title="Watch completion video"
                          onClick={e => e.stopPropagation()}
                        >
                          <Play size={22}/>
                        </a>
                      )}
                    </div>

                    <div className="gd-arrows-col">
                      <button
                        className={`gd-icon-btn ${revealed || i === 0 ? "disabled" : ""}`}
                        onClick={() => move(i, -1)}
                        disabled={revealed || i === 0}
                        title="Move up"
                      >▲</button>
                      <button
                        className={`gd-icon-btn ${revealed || i === demons.length - 1 ? "disabled" : ""}`}
                        onClick={() => move(i, 1)}
                        disabled={revealed || i === demons.length - 1}
                        title="Move down"
                      >▼</button>
                    </div>

                    <div className="gd-grip"><GripVertical size={20}/></div>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {!revealed && (
                  <button className="gd-btn gd-btn-success" onClick={reveal}>
                    <Trophy size={14}/> Reveal ranks
                  </button>
                )}
                {revealed && (
                  <button className="gd-btn" onClick={startNewRound}>
                    <Shuffle size={14}/> Next round
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 32, fontSize: 11, color: "var(--ink-dim)", textAlign: "center", letterSpacing: "0.1em" }}>
            data from pointercrate.com · drag cards or use ▲▼ to rank top → bottom (hardest → easiest)
          </div>
        </div>
      </div>
    </>
  );
}
