import React, { useState } from 'react';
import { Shuffle, RefreshCw, Play, Skull, GripVertical } from 'lucide-react';
import { pickRandom, pickWeighted } from './helpers.js';
import RankingShell from './RankingShell.jsx';

const DEMON_API = 'https://pointercrate.com/api/v2/demons/listed/';

const YEAR_CONFIG = {
  2017: { maxId: 130,   fetchMax: 500  },
  2018: { maxId: 420,   fetchMax: 750  },
  2019: { maxId: 950,   fetchMax: 1000 },
  2020: { maxId: 2200,  fetchMax: 1000 },
  2021: { maxId: 4800,  fetchMax: 1000 },
  2022: { maxId: 8500,  fetchMax: 1000 },
  2023: { maxId: 13000, fetchMax: 1000 },
  2024: { maxId: 19000, fetchMax: 1000 },
};

async function fetchDemonRange(start, end) {
  const out = [];
  let after = null;
  const limit = 100;
  const maxPages = Math.ceil(end / limit) + 2;
  for (let i = 0; i < maxPages; i++) {
    const url = new URL(DEMON_API);
    url.searchParams.set('limit', String(limit));
    if (after !== null) url.searchParams.set('after', String(after));
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`pointercrate ${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    out.push(...page);
    const maxPos = Math.max(...page.map(d => d.position));
    if (maxPos >= end) break;
    after = page[page.length - 1].id;
  }
  return out.filter(d => d.position >= start && d.position <= end);
}

function levelThumb(d) {
  if (d.thumbnail) return d.thumbnail;
  if (d.video) {
    const m = d.video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return null;
}

function diffClass(err) {
  if (err === 0) return 'good';
  if (err === 1) return 'ok';
  return 'bad';
}

export default function LevelMode({ onPlayVideo }) {
  const [mode, setMode] = useState('weighted');
  const [poolMax, setPoolMax] = useState(150);
  const [count, setCount] = useState(8);
  const [year, setYear] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startNewRound() {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      let picked;
      const yearCfg = year ? YEAR_CONFIG[year] : null;
      if (mode === 'topN') {
        const top = await fetchDemonRange(1, count);
        picked = top.sort((a, b) => a.position - b.position).slice(0, count);
      } else {
        const fetchMax = yearCfg ? yearCfg.fetchMax : poolMax;
        let pool = await fetchDemonRange(1, fetchMax);
        if (yearCfg) pool = pool.filter(d => d.id <= yearCfg.maxId);
        if (!pool.length) throw new Error(`No demons found for ${year} — try a later year.`);
        if (pool.length < count) throw new Error(`Only ${pool.length} demons found for ${year}. Lower the level count.`);
        if (mode === 'uniform') {
          picked = pickRandom(pool, Math.min(count, pool.length));
        } else {
          const effectivePool = yearCfg ? pool.length : poolMax;
          const ratio = count / effectivePool;
          const bias = Math.max(0.1, 0.7 - ratio * 2);
          picked = pickWeighted(pool, Math.min(count, pool.length), bias);
        }
      }
      const shuffled = pickRandom(picked, picked.length);
      setItems(shuffled.map(d => ({ ...d, sortKey: d.position })));
    } catch (e) {
      setError(e.message || 'failed to load demons');
    } finally {
      setLoading(false);
    }
  }

  function renderCard(item, { userIndex, revealed, err, isFirst, isLast, moveUp, moveDown }) {
    const thumb = levelThumb(item);
    return (
      <>
        {thumb
          ? <img className="gd-thumb" src={thumb} alt={item.name} loading="lazy" />
          : <div className="gd-thumb-placeholder"><Skull size={20} /></div>
        }

        <div className="gd-meta">
          <div className="gd-name">
            <span className="gd-name-rank">#{userIndex + 1}</span> – {item.name}
          </div>
          <div className="gd-by">
            published by {item.publisher?.name || '?'}
            {item.verifier?.name && item.verifier.name !== item.publisher?.name &&
              <> · verified by {item.verifier.name}</>
            }
          </div>
          {revealed && (
            <div className="gd-actual">
              actually #{item.position}
              <span className={`gd-diff ${diffClass(err)}`}>
                {err === 0 ? ' ✓ exact' : ` off by ${err}`}
              </span>
            </div>
          )}
        </div>

        <div className="gd-play-col">
          {item.video && (
            <button
              className="gd-play-btn"
              title="Watch completion video"
              onClick={e => { e.stopPropagation(); onPlayVideo({ url: item.video, name: item.name }); }}
            >
              <Play size={22} />
            </button>
          )}
        </div>

        <div className="gd-arrows-col">
          <button
            className={`gd-icon-btn ${revealed || isFirst ? 'disabled' : ''}`}
            onClick={moveUp}
            disabled={revealed || isFirst}
            title="Move up"
          >▲</button>
          <button
            className={`gd-icon-btn ${revealed || isLast ? 'disabled' : ''}`}
            onClick={moveDown}
            disabled={revealed || isLast}
            title="Move down"
          >▼</button>
        </div>

        <div className="gd-grip"><GripVertical size={20} /></div>
      </>
    );
  }

  const controls = (
    <div className="gd-controls">
      <div className="gd-field">
        <label className="gd-label">Mode</label>
        <select className="gd-select" value={mode} onChange={e => setMode(e.target.value)} disabled={loading}>
          <option value="weighted">Random (harder bias)</option>
          <option value="uniform">Random (uniform)</option>
          <option value="topN">Just the top N</option>
        </select>
      </div>

      <div className="gd-field">
        <label className="gd-label">Era</label>
        <select
          className="gd-select"
          value={year ?? ''}
          onChange={e => setYear(e.target.value ? Number(e.target.value) : null)}
          disabled={loading}
        >
          <option value="">Current list</option>
          {Object.keys(YEAR_CONFIG).reverse().map(y => (
            <option key={y} value={y}>{y} era</option>
          ))}
        </select>
      </div>

      <div className="gd-field">
        <label className="gd-label">Pool (top N)</label>
        <select
          className="gd-select"
          value={poolMax}
          onChange={e => setPoolMax(Number(e.target.value))}
          disabled={loading || mode === 'topN' || !!year}
        >
          <option value={75}>Top 75 (main list)</option>
          <option value={150}>Top 150</option>
          <option value={250}>Top 250</option>
          <option value={500}>Top 500</option>
          <option value={1000}>Top 1000</option>
        </select>
      </div>

      <div className="gd-field">
        <label className="gd-label">{mode === 'topN' ? 'Top how many' : 'Levels per round'}</label>
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
          {loading ? <RefreshCw size={14} className="spin" /> : <Shuffle size={14} />}
          New round
        </button>
      </div>
    </div>
  );

  return (
    <RankingShell
      items={items}
      loading={loading}
      error={error}
      onNewRound={startNewRound}
      renderCard={renderCard}
      controls={controls}
      emptyMessage="Pick your pool size and number of levels, then hit New Round."
    />
  );
}
