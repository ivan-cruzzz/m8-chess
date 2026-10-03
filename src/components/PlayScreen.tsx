import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Users, Flag } from 'lucide-react';
import { Chess } from 'chess.js';
import { useI18n } from '../contexts/I18nContext';
import { useEngine } from '../hooks/useEngine';
import { CoachTip } from './CoachTip';
import { StaticBoard } from './StaticBoard';
import type { GameRecord } from '../types';

interface PlayScreenProps {
  history: GameRecord[];
  onGameFinished: (rec: Omit<GameRecord, 'id' | 'date'>) => void;
}

const FILES = 'abcdefgh';
const RANKS = '87654321';
const pieceImg = (color: string, type: string) => `pieces/${color}${type.toUpperCase()}.svg`;

type Mode = 'menu' | 'ai' | 'hotseat';

export function PlayScreen({ history, onGameFinished }: PlayScreenProps) {
  const { t } = useI18n();
  const { findBestMove } = useEngine();
  const [mode, setMode] = useState<Mode>('menu');
  const [level, setLevel] = useState(3);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [san, setSan] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [finished, setFinished] = useState<null | 'w' | 'b' | 'draw'>(null);
  const [viewGame, setViewGame] = useState<GameRecord | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const gameRef = useRef(new Chess());
  const recordedRef = useRef(false);

  const startGame = (m: Mode) => {
    gameRef.current = new Chess();
    recordedRef.current = false;
    setFen(gameRef.current.fen());
    setSan([]);
    setSelected(null);
    setFinished(null);
    setMode(m);
  };

  const finish = useCallback((result: 'w' | 'b' | 'draw') => {
    setFinished(result);
    if (!recordedRef.current) {
      recordedRef.current = true;
      onGameFinished({ mode: mode === 'ai' ? 'ai' : 'hotseat', level: mode === 'ai' ? level : undefined, color: mode === 'ai' ? color : undefined, result, moves: [...sanRef.current] });
    }
  }, [mode, level, color, onGameFinished]);

  const sanRef = useRef<string[]>([]);
  useEffect(() => { sanRef.current = san; }, [san]);

  // Завершение партии по состоянию доски
  useEffect(() => {
    if (mode === 'menu') return;
    const g = gameRef.current;
    if (g.isCheckmate()) {
      finish(g.turn() === 'w' ? 'b' : 'w');
    } else if (g.isDraw() || g.isStalemate() || g.isInsufficientMaterial()) {
      finish('draw');
    }
  }, [fen, mode, finish]);

  // Ход ИИ: поиск в Web Worker. thinking живёт в ref (НЕ в зависимостях),
  // иначе setThinking(true) перезапускает эффект, cleanup отменяет поиск —
  // и партия зависает в «Компьютер думает…». Плюс watchdog: даже если
  // что-то зависло, через 12с делается легальный ход и игра продолжается.
  const thinkingRef = useRef(false);

  useEffect(() => {
    if (mode !== 'ai' || finished) return;
    if (gameRef.current.turn() === color) return;
    if (thinkingRef.current) return;
    thinkingRef.current = true;
    setThinking(true);

    const applyAiMove = (mv: string | null) => {
      thinkingRef.current = false;
      setThinking(false);
      if (!mv) {
        // Fallback: случайный легальный ход (движок недоступен, но партия продолжается)
        const legal = gameRef.current.moves();
        mv = legal.length ? legal[Math.floor(Math.random() * legal.length)] : null;
      }
      if (mv) {
        try {
          const res = gameRef.current.move(mv);
          if (res) {
            setFen(gameRef.current.fen());
            setSan((s) => [...s, res.san]);
          }
        } catch { /* не легально — пропускаем */ }
      }
    };

    const watchdog = window.setTimeout(() => applyAiMove(null), 12000);

    findBestMove(gameRef.current.fen(), level)
      .then((mv) => {
        window.clearTimeout(watchdog);
        applyAiMove(mv);
      })
      .catch(() => {
        window.clearTimeout(watchdog);
        applyAiMove(null);
      });

    return () => window.clearTimeout(watchdog);
  }, [fen, mode, color, level, finished, findBestMove]);

  const applyMove = (from: string, to: string) => {
    const g = gameRef.current;
    let res;
    try {
      res = g.move({ from, to, promotion: 'q' });
    } catch {
      return;
    }
    if (!res) return;
    setFen(g.fen());
    setSan((s) => [...s, res.san]);
    setSelected(null);
  };

  const onSquareClick = (sq: string) => {
    if (finished || thinking) return;
    if (mode === 'ai' && gameRef.current.turn() !== color) return;
    const g = new Chess(fen);
    const piece = g.get(sq as never);
    if (selected) {
      if (selected === sq) return setSelected(null);
      if (piece && piece.color === g.turn()) return setSelected(sq);
      return applyMove(selected, sq);
    }
    if (piece && piece.color === g.turn()) setSelected(sq);
  };

  const resign = () => {
    if (finished) return;
    finish(mode === 'ai' ? (color === 'w' ? 'b' : 'w') : gameRef.current.turn() === 'w' ? 'b' : 'w');
  };

  const orientation = mode === 'ai' ? (color === 'w' ? 'white' : 'black') : 'white';
  const renderRanks = orientation === 'white' ? RANKS.split('') : RANKS.split('').reverse();
  const renderFiles = orientation === 'white' ? FILES.split('') : FILES.split('').reverse();
  const g2 = new Chess(fen);
  const legalTargets = selected ? g2.moves({ square: selected as never, verbose: true }).map((m) => m.to as string) : [];
  const lastMove = san.length ? (() => { const gg = new Chess(); let last = null as null | { from: string; to: string }; for (const s of san) { last = gg.move(s) as never; } return last; })() : null;

  const resultText = finished === 'draw' ? t('draw') : mode === 'ai'
    ? (finished === color ? `🏆 ${t('won')}` : `💀 ${t('lost')}`)
    : `🏆 ${finished === 'w' ? t('playWhite') : t('playBlack')}`;

  /* ---------- Просмотр партии из истории ---------- */
  const openGame = (rec: GameRecord) => {
    setViewGame(rec);
    setViewIdx(0);
  };
  const viewFen = (() => {
    if (!viewGame) return null;
    const g = new Chess();
    for (let i = 0; i < viewIdx; i++) {
      try { g.move(viewGame.moves[i]); } catch { break; }
    }
    return g.fen();
  })();

  /* ---------- Меню ---------- */
  if (mode === 'menu' && !viewGame) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
        <h2 className="display-title text-center mb-2" style={{ color: 'var(--text-primary)' }}>{t('play')}</h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>♟</p>

        <div className="flex flex-col gap-3 mb-8">
          <div className="glass-card p-5">
            <p className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>🤖 {t('playVsAi')}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{t('levelStrength')}</span>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: l === level ? 'var(--text-primary)' : 'var(--bg-tertiary)',
                      color: l === level ? 'var(--bg-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {(['w', 'b'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: color === c ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: `2px solid ${color === c ? 'var(--text-primary)' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  {c === 'w' ? `♔ ${t('playWhite')}` : `♚ ${t('playBlack')}`}
                </button>
              ))}
            </div>
            <button
              onClick={() => startGame('ai')}
              className="w-full py-3.5 rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #d4a017, #f97316)', color: '#fff', boxShadow: '0 8px 18px -6px rgba(245,158,11,0.4)' }}
            >
              {t('newGame')}
            </button>
          </div>

          <button
            onClick={() => startGame('hotseat')}
            className="glass-card p-5 text-left font-bold w-full flex items-center gap-2 text-ink"
          >
            <Users size={20} strokeWidth={2.2} className="text-muted" aria-hidden="true" />
            {t('playHotseat')}
          </button>
        </div>

        {/* История */}
        <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('gameHistory')} · {history.length}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('noGames')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((rec) => (
              <button
                key={rec.id}
                onClick={() => openGame(rec)}
                className="glass-card p-3.5 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
              >
                <span className="text-lg" aria-hidden="true">
                  {rec.result === 'draw' ? '🤝' : (rec.mode === 'ai' ? (rec.result === rec.color ? '🏆' : '💀') : '♟')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {rec.mode === 'ai' ? `${t('playVsAi')} ${t('vsLevel')} ${rec.level}` : t('playHotseat')}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {rec.date.split('T')[0]} · {rec.moves.length} {t('nextTask').toLowerCase() === 'далее' ? 'ходов' : 'moves'}
                  </p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>{t('reviewMoves')} →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Просмотр истории ---------- */
  if (viewGame && viewFen) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
        <button onClick={() => setViewGame(null)} className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{t('back')}</button>
        <div className="max-w-[360px] mx-auto mb-4">
          <StaticBoard fen={viewFen} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <button onClick={() => setViewIdx((i) => Math.max(0, i - 1))} className="glass-card px-4 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>←</button>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{viewIdx} / {viewGame.moves.length}</span>
          <button onClick={() => setViewIdx((i) => Math.min(viewGame.moves.length, i + 1))} className="glass-card px-4 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>→</button>
        </div>
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {viewGame.moves.slice(Math.max(0, viewIdx - 6), viewIdx).join(' ')}
        </p>
      </div>
    );
  }

  /* ---------- Партия ---------- */
  const board = new Chess(fen).board();
  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { setMode('menu'); }} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('back')}</button>
        <span className="flex items-center gap-1.5 text-caption font-semibold text-muted">
          {mode === 'ai' ? (
            <>
              <Bot size={15} strokeWidth={2.2} aria-hidden="true" />
              {t('vsLevel')} {level}
            </>
          ) : (
            <>
              <Users size={15} strokeWidth={2.2} aria-hidden="true" />
              {t('playHotseat')}
            </>
          )}
        </span>
        <button onClick={resign} className="btn btn-danger text-sm px-2 py-1">
          <Flag size={15} strokeWidth={2.2} aria-hidden="true" />
          {t('resign')}
        </button>
      </div>

      <div className="max-w-[400px] mx-auto mb-3">
        <div
          className="relative w-full aspect-square rounded-sm overflow-hidden shadow-lg"
          style={{ border: '2px solid var(--border-color)' }}
        >
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
            {renderRanks.map((rank, row) =>
              renderFiles.map((file, col) => {
                const fileIdx = FILES.indexOf(file);
                const rankIdx = RANKS.indexOf(rank);
                const isLight = (fileIdx + rankIdx) % 2 === 0;
                const sq = file + rank;
                const isSel = selected === sq;
                const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
                const isTarget = legalTargets.includes(sq);
                return (
                  <div
                    key={sq}
                    role="gridcell"
                    aria-label={sq}
                    onClick={() => onSquareClick(sq)}
                    style={{
                      background: isSel ? 'rgba(20, 85, 150, 0.5)' : isLast ? 'rgba(155, 199, 0, 0.41)' : isLight ? 'var(--board-light)' : 'var(--board-dark)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {col === 0 && (
                      <span className="absolute top-0.5 left-1 text-[10px] font-bold pointer-events-none" style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}>{rank}</span>
                    )}
                    {row === 7 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-bold pointer-events-none" style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}>{file}</span>
                    )}
                    {isTarget && (
                      <span className="absolute rounded-full pointer-events-none" style={{ width: '26%', height: '26%', background: 'rgba(20,85,150,0.45)', top: '37%', left: '37%' }} />
                    )}
                    {(() => {
                      const cell = board[rankIdx][fileIdx];
                      if (!cell) return null;
                      const draggableNow = !finished && !thinking && (mode === 'hotseat' || g2.turn() === color);
                      return (
                        <img
                          src={pieceImg(cell.color, cell.type)}
                          alt=""
                          draggable={false}
                          onClick={() => onSquareClick(sq)}
                          className="absolute inset-[4%] w-[92%] h-[92%] select-none"
                          style={{ pointerEvents: draggableNow ? 'auto' : 'none', cursor: draggableNow ? 'grab' : 'default' }}
                        />
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className="text-center mb-3 text-sm font-bold text-ink flex items-center justify-center gap-2">
        {finished
          ? resultText
          : thinking
          ? <span className="flex items-center gap-1.5"><Bot size={16} strokeWidth={2.2} className="animate-pulse" aria-hidden="true" />{t('aiThinking')}</span>
          : mode === 'hotseat'
          ? `${g2.turn() === 'w' ? '♔' : '♚'} ${t('yourMove')}`
          : t('yourMove')}
      </div>

      {/* Ходы */}
      <div className="glass-card p-3 max-h-28 overflow-y-auto no-scrollbar mb-4">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {san.map((s, i) => (
            <span key={i} className="font-mono">
              {i % 2 === 0 && <span className="opacity-50 mr-1">{i / 2 + 1}.</span>}
              {s}
            </span>
          ))}
          {san.length === 0 && <span className="opacity-50">—</span>}
        </div>
      </div>

      {finished && (
        <button
          onClick={() => setMode('menu')}
          className="w-full py-3.5 rounded-xl font-bold animate-bounce-in"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
        >
          {t('gameHistory')} →
        </button>
      )}

      {finished && san.length > 0 && (
        <CoachTip buildRequest={(lang) => ({ action: 'review', moves: san, lang })} />
      )}
    </div>
  );
}
