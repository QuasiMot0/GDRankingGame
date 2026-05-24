import React, { useState } from 'react';
import { Shuffle, RefreshCw, Play, GripVertical } from 'lucide-react';
import { track } from '@vercel/analytics';
import { pickRandom, countryFlag } from './helpers.js';
import RankingShell from './RankingShell.jsx';

const PLAYER_RANKING_API = 'https://pointercrate.com/api/v1/players/ranking/';
const PLAYER_API = 'https://pointercrate.com/api/v1/players/';

async function fetchPlayerPool(maxCount) {
  const out = [];
  let after = null;
  const pageSize = 100;
  while (out.length < maxCount) {
    const url = new URL(PLAYER_RANKING_API);
    url.searchParams.set('limit', String(Math.min(pageSize, maxCount - out.length)));
    if (after !== null) url.searchParams.set('after', String(after));
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`pointercrate ${res.status}`);
    const page = await res.json();
    if (!page.length) break;
    out.push(...page.filter(p => !p.banned));
    if (page.length < pageSize) break;
    after = page[page.length - 1].rank;
  }
  return out.slice(0, maxCount);
}

async function fetchPlayerDetails(id) {
  try {
    const res = await fetch(`${PLAYER_API}${id}/`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    // v1 wraps the player in a { data: {...} } envelope
    return json.data ?? json;
  } catch {
    return null;
  }
}

// Merge records + verified into a deduped map by demon id.
// Records take priority over verified because they carry a video URL.
function mergeCompletions(records, verified) {
  const byId = new Map();
  for (const v of (verified || [])) {
    byId.set(v.id, { id: v.id, name: v.name, position: v.position, video: null });
  }
  for (const r of (records || []).filter(r => r.status === 'approved' && r.progress === 100)) {
    byId.set(r.demon.id, { id: r.demon.id, name: r.demon.name, position: r.demon.position, video: r.video ?? null });
  }
  return [...byId.values()];
}

function getRecordCounts(records, verified) {
  const all = mergeCompletions(records, verified);
  return {
    main: all.filter(d => d.position <= 75).length,
    extended: all.filter(d => d.position > 75 && d.position <= 150).length,
    legacy: all.filter(d => d.position > 150).length,
  };
}

function getHardestDemon(records, verified) {
  const all = mergeCompletions(records, verified);
  if (!all.length) return null;
  return all.reduce((best, d) => (!best || d.position < best.position) ? d : best, null);
}

function diffClass(err) {
  if (err === 0) return 'good';
  if (err === 1) return 'ok';
  return 'bad';
}

export default function PlayerMode({ onPlayVideo }) {
  const [poolMax, setPoolMax] = useState(100);
  const [count, setCount] = useState(8);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startNewRound() {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const pool = await fetchPlayerPool(poolMax);
      if (pool.length < count) throw new Error(`Only ${pool.length} players found. Lower the player count.`);
      const picked = pickRandom(pool, count);

      const details = await Promise.all(picked.map(p => fetchPlayerDetails(p.id)));

      const enriched = picked.map((p, idx) => {
        const detail = details[idx];
        const records = detail?.records || [];
        const verified = detail?.verified || [];
        return {
          ...p,
          sortKey: p.rank,
          counts: getRecordCounts(records, verified),
          hardest: getHardestDemon(records, verified),
        };
      });

      setItems(pickRandom(enriched, enriched.length));
      track('game_started', { mode: 'players', poolMax, count });
    } catch (e) {
      setError(e.message || 'failed to load players');
    } finally {
      setLoading(false);
    }
  }

  function renderCard(item, { userIndex, guessedIndex, revealed, err, isFirst, isLast, moveUp, moveDown }) {
    const flag = countryFlag(item.nationality?.country_code);
    const { counts, hardest } = item;

    return (
      <>
        <div className="gd-meta">
          <div className="gd-name">
            <span className="gd-name-rank">#{userIndex + 1}</span> – {item.name}
            {flag && (
              <span className="gd-flag" title={item.nationality?.nation}> {flag}</span>
            )}
          </div>
          <div className="gd-split">
            <span className="gd-split-main">{counts.main} main</span>
            {' · '}
            <span className="gd-split-ext">{counts.extended} extended</span>
            {' · '}
            <span className="gd-split-leg">{counts.legacy} legacy</span>
          </div>
          {hardest && (
            <div className="gd-player-sub">
              <span className="gd-player-sub-rank">#{hardest.position}</span>
              <span className="gd-player-sub-name">{hardest.name}</span>
              {hardest.video && (
                <button
                  className="gd-icon-btn gd-player-play"
                  title="Watch hardest demon video"
                  onClick={e => { e.stopPropagation(); onPlayVideo({ url: hardest.video, name: hardest.name }); }}
                >
                  <Play size={11} />
                </button>
              )}
            </div>
          )}
          {revealed && (
            <div className="gd-actual">
              ranked #{item.rank} · you guessed #{guessedIndex + 1}
              <span className={`gd-diff ${diffClass(err)}`}>
                {err === 0 ? ' ✓ exact' : ` ${guessedIndex < userIndex ? '↓' : '↑'} ${err}`}
              </span>
            </div>
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
        <label className="gd-label">Pool (top N players)</label>
        <select
          className="gd-select"
          value={poolMax}
          onChange={e => setPoolMax(Number(e.target.value))}
          disabled={loading}
        >
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
          <option value={200}>Top 200</option>
        </select>
      </div>

      <div className="gd-field">
        <label className="gd-label">Players per round</label>
        <input
          className="gd-input"
          type="number" min={2} max={12}
          value={count}
          onChange={e => setCount(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
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
      emptyMessage="Pick your pool size and number of players, then hit New Round."
    />
  );
}
