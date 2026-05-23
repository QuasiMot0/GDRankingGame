import React, { useState } from 'react';
import LevelMode from './LevelMode.jsx';
import PlayerMode from './PlayerMode.jsx';
import { youtubeEmbedUrl } from './helpers.js';

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
    display: flex; align-items: center; justify-content: space-between;
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

  .gd-mode-toggle {
    display: flex;
    background: rgba(6,18,40,.75);
    border: 2px solid var(--line);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
    backdrop-filter: blur(4px);
  }
  .gd-mode-btn {
    font-family: 'Russo One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: transparent;
    border: none;
    color: var(--ink-dim);
    padding: 8px 18px;
    border-radius: 5px;
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .gd-mode-btn:hover { color: var(--ink); }
  .gd-mode-btn.active {
    background: var(--accent);
    color: #1a1000;
    box-shadow: 0 2px 0 var(--accent-shadow);
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
  .spin { animation: spin 0.8s linear infinite; }
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
    display: flex;
    align-items: stretch;
    gap: 10px;
    cursor: grab;
    transition: border-color .15s, box-shadow .15s;
    -webkit-user-select: none;
    user-select: none;
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
    flex-shrink: 0;
  }
  .gd-thumb-placeholder {
    width: 144px; height: 81px;
    background: #e5e7eb;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: #9ca3af;
    align-self: center;
    flex-shrink: 0;
  }

  .gd-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
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
  .gd-flag { font-size: 18px; }
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

  .gd-split {
    font-size: 12px;
    color: #6b7280;
    letter-spacing: 0.02em;
    margin-bottom: 4px;
  }
  .gd-split-main { color: #1d6fb8; font-weight: 700; }
  .gd-split-ext  { color: #7c3aed; font-weight: 700; }
  .gd-split-leg  { color: #9ca3af; }

  .gd-player-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1a1a2e;
    border-radius: 4px;
    padding: 4px 8px;
    margin-top: 4px;
    max-width: fit-content;
  }
  .gd-player-sub-rank {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    flex-shrink: 0;
  }
  .gd-player-sub-name {
    font-size: 11px;
    color: #e5e7eb;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }
  .gd-player-play {
    width: 22px !important;
    height: 22px !important;
    flex-shrink: 0;
    padding: 0;
    background: rgba(255,255,255,.1) !important;
    border-color: rgba(255,255,255,.2) !important;
    color: #e5e7eb !important;
    border-radius: 3px !important;
  }
  .gd-player-play:hover {
    background: rgba(255,204,0,.2) !important;
    border-color: var(--accent) !important;
    color: var(--accent) !important;
  }

  .gd-play-col {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
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

  .gd-arrows-col { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
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
    flex-shrink: 0;
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
    .gd-card { gap: 6px; padding: 8px; }
    .gd-thumb, .gd-thumb-placeholder { width: 96px; height: 54px; }
    .gd-name { font-size: 15px; }
    .gd-play-btn { width: 40px; }
    .gd-player-sub-name { max-width: 120px; }
  }

  .gd-modal-backdrop {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0, 0, 0, 0.82);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .gd-modal {
    background: #0a1628;
    border: 2px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    width: 100%; max-width: 900px;
    box-shadow: 0 24px 60px rgba(0,0,0,.8);
    display: flex; flex-direction: column;
  }
  .gd-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px;
    background: rgba(0,0,0,.3);
    border-bottom: 1px solid var(--line);
  }
  .gd-modal-title {
    font-family: 'Russo One', sans-serif;
    font-size: 15px;
    color: var(--ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .gd-modal-close {
    background: rgba(255,255,255,.08);
    border: 1px solid var(--line);
    color: var(--ink-dim);
    width: 30px; height: 30px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all .12s;
  }
  .gd-modal-close:hover { color: var(--ink); border-color: var(--danger); background: rgba(255,68,68,.15); }
  .gd-modal-video {
    position: relative; width: 100%;
    padding-top: calc(56.25% - 60px);
    overflow: hidden;
  }
  .gd-modal-video iframe {
    position: absolute;
    top: -60px;
    left: 0; width: 100%;
    height: calc(100% + 60px);
    border: none;
  }
`;

export default function App() {
  const [gameMode, setGameMode] = useState('level');
  const [activeVideo, setActiveVideo] = useState(null);

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
            <div className="gd-mode-toggle">
              <button
                className={`gd-mode-btn ${gameMode === 'level' ? 'active' : ''}`}
                onClick={() => setGameMode('level')}
              >
                Levels
              </button>
              <button
                className={`gd-mode-btn ${gameMode === 'player' ? 'active' : ''}`}
                onClick={() => setGameMode('player')}
              >
                Players
              </button>
            </div>
          </div>

          {gameMode === 'level'
            ? <LevelMode onPlayVideo={setActiveVideo} />
            : <PlayerMode onPlayVideo={setActiveVideo} />
          }

          <div style={{ marginTop: 32, fontSize: 11, color: 'var(--ink-dim)', textAlign: 'center', letterSpacing: '0.1em' }}>
            data from pointercrate.com · drag cards or use ▲▼ to rank top → bottom (hardest → easiest)
          </div>
        </div>
      </div>

      {activeVideo && (
        <div className="gd-modal-backdrop" onClick={() => setActiveVideo(null)}>
          <div className="gd-modal" onClick={e => e.stopPropagation()}>
            <div className="gd-modal-header">
              <span className="gd-modal-title">{activeVideo.name}</span>
              <button className="gd-modal-close" onClick={() => setActiveVideo(null)}>✕</button>
            </div>
            <div className="gd-modal-video">
              {youtubeEmbedUrl(activeVideo.url)
                ? <iframe
                    src={youtubeEmbedUrl(activeVideo.url)}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                : <div style={{ padding: 40, color: 'var(--ink-dim)', textAlign: 'center' }}>
                    Video unavailable for embed.
                  </div>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}
