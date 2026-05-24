import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Trophy, Shuffle, Skull } from 'lucide-react';

export default function RankingShell({
  items,
  loading,
  error,
  onNewRound,
  renderCard,
  controls,
  emptyMessage,
}) {
  const [ordered, setOrdered] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(null);
  const [guessedIdxById, setGuessedIdxById] = useState({});

  const dragId = useRef(null);
  const dragOverId = useRef(null);
  const [, force] = useState(0);
  const cardRefs = useRef({});
  const [pendingFlip, setPendingFlip] = useState(null);

  const orderedRef = useRef([]);
  const revealedRef = useRef(false);
  const touchStartPos = useRef(null);
  const dragStartOrderRef = useRef(null);
  const dropHappenedRef = useRef(false);

  useEffect(() => { orderedRef.current = ordered; }, [ordered]);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);

  useEffect(() => {
    setOrdered(items);
    setRevealed(false);
    setScore(null);
    setGuessedIdxById({});
  }, [items]);

  // Non-passive touchmove — must be a window listener so we can preventDefault
  useEffect(() => {
    function onTouchMove(e) {
      if (!dragId.current || revealedRef.current) return;
      const touch = e.touches[0];
      if (touchStartPos.current) {
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        if (dy < 8 && dx < 8) return;
        touchStartPos.current = null;
      }
      e.preventDefault();
      const y = touch.clientY;
      let targetId = null;
      for (const item of orderedRef.current) {
        const el = cardRefs.current[item.id];
        if (!el || item.id === dragId.current) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) { targetId = item.id; break; }
      }
      if (targetId === null || dragOverId.current === targetId) return;
      dragOverId.current = targetId;
      const rects = captureRects();
      setOrdered(prev => {
        const fromIdx = prev.findIndex(d => d.id === dragId.current);
        const toIdx = prev.findIndex(d => d.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next;
      });
      setPendingFlip(rects);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => window.removeEventListener('touchmove', onTouchMove);
  }, []);

  useLayoutEffect(() => {
    if (!pendingFlip) return;
    const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const duration = 220;
    const toClean = [];
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
    void moved[0].offsetHeight;
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
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const rects = captureRects();
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrdered(next);
    setPendingFlip(rects);
  }

  function handleDragStart(e, id) {
    if (revealed) { e.preventDefault(); return; }
    dragId.current = id;
    dragStartOrderRef.current = [...ordered];
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e, targetId) {
    if (revealed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const fromId = dragId.current;
    if (!fromId || fromId === targetId || dragOverId.current === targetId) return;
    dragOverId.current = targetId;
    const rects = captureRects();
    setOrdered(prev => {
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
  function handleDragLeave() { dragOverId.current = null; }
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
      setOrdered(dragStartOrderRef.current);
    }
    dropHappenedRef.current = false;
    dragStartOrderRef.current = null;
    dragId.current = null;
    dragOverId.current = null;
    force(n => n + 1);
  }
  function handleTouchStart(e, id) {
    if (revealed) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    dragId.current = id;
    dragStartOrderRef.current = [...orderedRef.current];
  }
  function handleTouchEnd() {
    dragId.current = null;
    dragOverId.current = null;
    touchStartPos.current = null;
    dragStartOrderRef.current = null;
    force(n => n + 1);
  }

  function reveal() {
    const guessedMap = {};
    ordered.forEach((item, i) => { guessedMap[item.id] = i; });

    const sorted = [...ordered].sort((a, b) => a.sortKey - b.sortKey);
    let totalErr = 0, exact = 0;
    ordered.forEach((item, i) => {
      const correctIdx = sorted.findIndex(x => x.id === item.id);
      const err = Math.abs(i - correctIdx);
      totalErr += err;
      if (err === 0) exact++;
    });
    setScore({ totalErr, exact, total: ordered.length });
    setGuessedIdxById(guessedMap);

    const rects = captureRects();
    setOrdered(sorted);
    setPendingFlip(rects);
    setRevealed(true);
  }

  return (
    <>
      {controls}

      {error && <div className="gd-error">⚠ {error}</div>}

      {loading && (
        <div className="gd-status">
          <span className="spinner" />
          Loading from Pointercrate...
        </div>
      )}

      {!loading && ordered.length === 0 && !error && (
        <div className="gd-empty">
          <div className="gd-empty-icon"><Skull size={48} /></div>
          <div>{emptyMessage}</div>
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

      {ordered.length > 0 && (
        <div className="gd-list">
          {ordered.map((item, i) => {
            const isDragging = dragId.current === item.id;
            const isOver = dragOverId.current === item.id && dragId.current !== item.id;
            const err = revealed ? Math.abs(i - guessedIdxById[item.id]) : null;
            const cardClass = [
              'gd-card',
              isDragging ? 'dragging' : '',
              isOver ? 'drag-over' : '',
              revealed && err === 0 ? 'reveal-correct' : '',
              revealed && err === 1 ? 'reveal-close' : '',
              revealed && err > 1 ? 'reveal-wrong' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={item.id}
                ref={el => { cardRefs.current[item.id] = el; }}
                className={cardClass}
                draggable={!revealed}
                onDragStart={e => handleDragStart(e, item.id)}
                onDragOver={e => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onTouchStart={e => handleTouchStart(e, item.id)}
                onTouchEnd={handleTouchEnd}
              >
                {renderCard(item, {
                  userIndex: i,
                  guessedIndex: revealed ? guessedIdxById[item.id] : null,
                  revealed,
                  err,
                  isFirst: i === 0,
                  isLast: i === ordered.length - 1,
                  moveUp: () => move(i, -1),
                  moveDown: () => move(i, 1),
                })}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {!revealed && (
              <button className="gd-btn gd-btn-success" onClick={reveal}>
                <Trophy size={14} /> Reveal ranks
              </button>
            )}
            {revealed && (
              <button className="gd-btn" onClick={onNewRound}>
                <Shuffle size={14} /> Next round
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
