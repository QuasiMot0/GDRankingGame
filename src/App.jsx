import React, { useState, useEffect, useRef } from "react";
import { Shuffle, Play, Eye, EyeOff, RefreshCw, Trophy, Skull, GripVertical, Settings } from "lucide-react";

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
    --bg: #0a0612;
    --bg-2: #15091f;
    --ink: #f5e6ff;
    --ink-dim: #9b8bb0;
    --accent: #ff2e88;
    --accent-2: #00ffd1;
    --warn: #ffcc00;
    --danger: #ff3d3d;
    --card: #1a0d2e;
    --card-2: #240f3d;
    --line: #3d1f5c;
  }

  * { box-sizing: border-box; }

  .gd-root {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at top left, rgba(255,46,136,.15), transparent 50%),
      radial-gradient(ellipse at bottom right, rgba(0,255,209,.1), transparent 50%),
      var(--bg);
    color: var(--ink);
    font-family: 'JetBrains Mono', monospace;
    padding: 24px;
    position: relative;
    overflow-x: hidden;
  }

  .gd-root::before {
    content: "";
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(255,46,136,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,46,136,.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .gd-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; }

  .gd-header {
    display: flex; align-items: baseline; justify-content: space-between;
    margin-bottom: 8px; flex-wrap: wrap; gap: 12px;
  }
  .gd-title {
    font-family: 'Russo One', sans-serif;
    font-size: clamp(28px, 5vw, 48px);
    letter-spacing: -0.02em;
    margin: 0;
    background: linear-gradient(135deg, var(--accent), var(--warn));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 40px rgba(255,46,136,.3);
  }
  .gd-subtitle {
    font-size: 12px; color: var(--ink-dim);
    text-transform: uppercase; letter-spacing: 0.2em;
  }

  .gd-controls {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    align-items: end;
  }
  .gd-field { display: flex; flex-direction: column; gap: 4px; }
  .gd-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em;
    color: var(--ink-dim); font-weight: 700;
  }
  .gd-input, .gd-select {
    background: var(--bg-2);
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 8px 10px;
    font-family: inherit;
    font-size: 14px;
    border-radius: 4px;
  }
  .gd-input:focus, .gd-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(255,46,136,.25);
  }

  .gd-btn {
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 10px 16px;
    font-family: 'Russo One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 4px;
    display: inline-flex; align-items: center; gap: 8px;
    transition: transform .1s, box-shadow .2s;
    box-shadow: 0 4px 0 #b01a5e;
  }
  .gd-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 0 #b01a5e; }
  .gd-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #b01a5e; }
  .gd-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; transform: none; }
  .gd-btn-ghost {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line);
    box-shadow: none;
  }
  .gd-btn-ghost:hover { border-color: var(--accent); box-shadow: 0 0 16px rgba(255,46,136,.2); }
  .gd-btn-success { background: var(--accent-2); color: #001712; box-shadow: 0 4px 0 #00997d; }
  .gd-btn-success:hover { box-shadow: 0 5px 0 #00997d; }
  .gd-btn-success:active { box-shadow: 0 2px 0 #00997d; }

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
    background: rgba(255,61,61,.1);
    border: 1px solid var(--danger);
    color: #ffaaaa;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .gd-list {
    display: flex; flex-direction: column; gap: 8px;
  }

  .gd-card {
    background: linear-gradient(90deg, var(--card), var(--card-2));
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 12px;
    display: grid;
    grid-template-columns: 40px 80px 1fr auto;
    gap: 12px;
    align-items: center;
    cursor: grab;
    transition: border-color .15s, transform .15s;
    position: relative;
  }
  .gd-card:hover { border-color: var(--accent); }
  .gd-card.dragging { opacity: 0.4; cursor: grabbing; }
  .gd-card.drag-over { border-color: var(--accent-2); transform: scale(1.01); }
  .gd-card.reveal-correct { border-color: var(--accent-2); box-shadow: 0 0 20px rgba(0,255,209,.3); }
  .gd-card.reveal-close { border-color: var(--warn); }
  .gd-card.reveal-wrong { border-color: var(--danger); }

  .gd-rank {
    font-family: 'Russo One', sans-serif;
    font-size: 24px;
    color: var(--accent);
    text-align: center;
    text-shadow: 0 0 12px rgba(255,46,136,.4);
  }

  .gd-thumb {
    width: 80px; height: 45px;
    background: var(--bg-2);
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid var(--line);
  }
  .gd-thumb-placeholder {
    width: 80px; height: 45px;
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: var(--ink-dim);
  }

  .gd-meta { min-width: 0; }
  .gd-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 0.05em;
    color: var(--ink);
    margin: 0 0 2px;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gd-by {
    font-size: 11px; color: var(--ink-dim);
    text-transform: uppercase; letter-spacing: 0.1em;
  }
  .gd-actual {
    font-size: 11px;
    color: var(--accent-2);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 2px;
  }
  .gd-diff { color: var(--ink-dim); margin-left: 8px; }
  .gd-diff.bad { color: var(--danger); }
  .gd-diff.ok { color: var(--warn); }
  .gd-diff.good { color: var(--accent-2); }

  .gd-actions { display: flex; align-items: center; gap: 8px; }
  .gd-icon-btn {
    background: transparent;
    border: 1px solid var(--line);
    color: var(--ink-dim);
    width: 32px; height: 32px;
    border-radius: 4px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
  }
  .gd-icon-btn:hover { color: var(--accent); border-color: var(--accent); }
  .gd-icon-btn.disabled { opacity: 0.3; cursor: not-allowed; }
  .gd-grip { color: var(--ink-dim); display: flex; }

  .gd-empty {
    text-align: center; padding: 80px 20px;
    border: 2px dashed var(--line);
    border-radius: 8px;
    color: var(--ink-dim);
  }
  .gd-empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.4; }

  .gd-score {
    background: linear-gradient(135deg, var(--accent), var(--warn));
    color: #1a0808;
    padding: 16px 20px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-family: 'Russo One', sans-serif;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 8px;
  }
  .gd-score-num { font-size: 32px; }
  .gd-score-detail { font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.7; }

  @media (max-width: 600px) {
    .gd-card { grid-template-columns: 32px 60px 1fr auto; gap: 8px; padding: 8px; }
    .gd-thumb, .gd-thumb-placeholder { width: 60px; height: 34px; }
    .gd-name { font-size: 18px; }
    .gd-rank { font-size: 18px; }
  }
`;

// ---------- main ----------
export default function App() {
  // defaults: top 150 pool, names + thumbs + video link visible
  const [mode, setMode] = useState("weighted"); // "weighted" | "topN" | "uniform"
  const [poolMax, setPoolMax] = useState(150);
  const [count, setCount] = useState(8);
  const [hideNames, setHideNames] = useState(false);
  const [demons, setDemons] = useState([]); // current display order
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(null);

  const dragId = useRef(null);
  const dragOverId = useRef(null);
  const [, force] = useState(0);

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

  function move(idx, dir) {
    if (revealed) return;
    const next = [...demons];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDemons(next);
  }

  function handleDragStart(e, id) {
    if (revealed) { e.preventDefault(); return; }
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e, id) {
    if (revealed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId.current !== id) {
      dragOverId.current = id;
      force(n => n + 1);
    }
  }
  function handleDragLeave() {
    dragOverId.current = null;
    force(n => n + 1);
  }
  function handleDrop(e, dropId) {
    if (revealed) return;
    e.preventDefault();
    const fromId = dragId.current;
    if (fromId == null || fromId === dropId) return;
    const fromIdx = demons.findIndex(d => d.id === fromId);
    const toIdx = demons.findIndex(d => d.id === dropId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...demons];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDemons(next);
    dragId.current = null;
    dragOverId.current = null;
  }
  function handleDragEnd() {
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
              <label className="gd-label">Spoiler mode</label>
              <button
                className="gd-btn gd-btn-ghost"
                onClick={() => setHideNames(v => !v)}
                disabled={loading}
              >
                {hideNames ? <><EyeOff size={14}/> Names hidden</> : <><Eye size={14}/> Names shown</>}
              </button>
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
                    className={cardClass}
                    draggable={!revealed}
                    onDragStart={e => handleDragStart(e, d.id)}
                    onDragOver={e => handleDragOver(e, d.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, d.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="gd-rank">#{i + 1}</div>

                    {thumb
                      ? <img className="gd-thumb" src={thumb} alt={d.name} loading="lazy"/>
                      : <div className="gd-thumb-placeholder"><Skull size={20}/></div>
                    }

                    <div className="gd-meta">
                      <div className="gd-name">
                        {hideNames && !revealed ? `??? #${i+1}` : d.name}
                      </div>
                      <div className="gd-by">
                        by {d.publisher?.name || "?"}
                        {d.verifier?.name && d.verifier.name !== d.publisher?.name &&
                          <> · verified by {d.verifier.name}</>
                        }
                      </div>
                      {revealed && (
                        <div className="gd-actual">
                          actually #{d.position}
                          <span className={`gd-diff ${diffClass(err)}`}>
                            {err === 0 ? "✓ exact" : `off by ${err}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="gd-actions">
                      {d.video && (
                        <a
                          href={d.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gd-icon-btn"
                          title="Watch completion video"
                          onClick={e => e.stopPropagation()}
                        >
                          <Play size={14}/>
                        </a>
                      )}
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
                      <div className="gd-grip"><GripVertical size={16}/></div>
                    </div>
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
