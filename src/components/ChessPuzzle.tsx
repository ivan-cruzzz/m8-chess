import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { Chess } from 'chess.js';
import type { Puzzle } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { CoachTip } from './CoachTip';

interface ChessPuzzleProps {
  puzzle: Puzzle;
  onComplete: (xp: number, meta?: { mistakes: number; hintUsed: boolean }) => void;
  onSkip: () => void;
  onWrongMove?: (info: { fen: string; playedSan: string; expectedSan: string }) => void;
}

const FILES = 'abcdefgh';
const RANKS = '87654321';

// Lichess-палитра доски
const LAST_MOVE = 'rgba(155, 199, 0, 0.41)';
const SELECTED = 'rgba(20, 85, 150, 0.5)';
const LEGAL_MOVE = 'rgba(20, 85, 150, 0.5)';
const CHECK = 'radial-gradient(ellipse at center, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0.2) 70%, rgba(255,0,0,0) 100%)';

const pieceImg = (color: string, type: string) => `/pieces/${color}${type.toUpperCase()}.svg`;

function getMoveUci(san: string, game: Chess): { from: string; to: string; promotion?: string } | null {
  const moves = game.moves({ verbose: true });
  const normalize = (s: string) => s.replace(/[+#!?]/g, '').replace(/=([QRBN])/g, '$1');
  for (const m of moves) {
    if (m.san === san) return { from: m.from, to: m.to, promotion: m.promotion };
  }
  for (const m of moves) {
    if (normalize(m.san) === normalize(san)) {
      return { from: m.from, to: m.to, promotion: m.promotion };
    }
  }
  return null;
}

function fenToBoard(fen: string): Record<string, { type: string; color: string }> {
  const board: Record<string, { type: string; color: string }> = {};
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
    let fileIdx = 0;
    for (const char of rows[rankIdx]) {
      if (/\d/.test(char)) {
        fileIdx += parseInt(char, 10);
      } else {
        const square = FILES[fileIdx] + RANKS[rankIdx];
        board[square] = {
          type: char.toLowerCase(),
          color: char === char.toUpperCase() ? 'w' : 'b',
        };
        fileIdx++;
      }
    }
  }
  return board;
}

function playTone(type: 'correct' | 'wrong' | 'complete') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }
  } catch { /* ignore */ }
}

/** Фигура доски со стабильным id — для анимации скольжения */
interface BoardPiece {
  id: string;
  sq: string;
  color: string;
  type: string;
}

/**
 * Сопоставляет фигуры новой позиции с прежней: совпавшие сохраняют id
 * (та же фигура на новой клетке → плавное скольжение).
 */
function trackPieces(
  board: Record<string, { type: string; color: string }>,
  prev: Map<string, { id: string; code: string }>
): { pieces: BoardPiece[]; next: Map<string, { id: string; code: string }> } {
  const used = new Set<string>();
  const next = new Map<string, { id: string; code: string }>();
  const pieces: BoardPiece[] = [];
  let counter = 0;

  const takeFromPrev = (code: string): string | null => {
    for (const [sq, info] of prev) {
      if (used.has(sq)) continue;
      if (info.code === code) {
        used.add(sq);
        return info.id;
      }
    }
    return null;
  };

  for (const [sq, piece] of Object.entries(board)) {
    const code = piece.color + piece.type;
    let id: string | null = null;
    const prevHere = prev.get(sq);
    if (prevHere && prevHere.code === code) {
      id = prevHere.id;
      used.add(sq);
    } else {
      id = takeFromPrev(code);
    }
    if (!id) id = `p${Date.now()}_${counter++}_${sq}`;
    next.set(sq, { id, code });
    pieces.push({ id, sq, color: piece.color, type: piece.type });
  }
  return { pieces, next };
}

export function ChessPuzzle({ puzzle, onComplete, onSkip, onWrongMove }: ChessPuzzleProps) {
  const { t } = useI18n();
  const [fen, setFen] = useState(puzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'wrong' | 'completed'>('playing');
  const [message, setMessage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [kingInCheck, setKingInCheck] = useState<string | null>(null);
  const [waitingReply, setWaitingReply] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number | null>(null);
  const [ghostPiece, setGhostPiece] = useState<{ img: string; x: number; y: number } | null>(null);

  // Ориентация фиксирована на стороне, которая ходит первой в задаче,
  // и НЕ переворачивается после каждого хода
  const orientation = useMemo(
    () => (new Chess(puzzle.fen).turn() === 'w' ? 'white' : 'black'),
    [puzzle.fen]
  );

  // Точная однократная отправка onComplete: замыкание на конкретное решение
  const fireCompleteRef = useRef<(() => void) | null>(null);

  // Трекинг фигур для анимации (объявлены здесь, чтобы сбросить при смене задачи)
  const prevPiecesRef = useRef<Map<string, { id: string; code: string }>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Синхронный сброс при смене задачи: каждая задача полностью независима —
  // без этого фигуры «переезжали» с предыдущей доски и позиция выглядела изменённой
  const puzzleIdRef = useRef(puzzle.id);
  if (puzzleIdRef.current !== puzzle.id) {
    puzzleIdRef.current = puzzle.id;
    if (replyTimerRef.current !== null) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    setWaitingReply(false);
    setFen(puzzle.fen);
    setMoveIndex(0);
    setStatus('playing');
    setMessage('');
    setShowHint(false);
    setAttempts(0);
    setSelectedSquare(null);
    setLastMove(null);
    setDragFrom(null);
    setDragOver(null);
    setKingInCheck(null);
    setGhostPiece(null);
    fireCompleteRef.current = null;
    prevPiecesRef.current = new Map();
    seenIdsRef.current = new Set();
  }

  // Detect check
  useEffect(() => {
    const g = new Chess(fen);
    if (g.inCheck()) {
      const board = fenToBoard(fen);
      const kingSquare = Object.entries(board).find(([, p]) => p.type === 'k' && p.color === g.turn())?.[0] || null;
      setKingInCheck(kingSquare);
    } else {
      setKingInCheck(null);
    }
  }, [fen]);

  // Таймер ответа соперника не должен пережить смену задачи или размонтирование
  useEffect(() => () => {
    if (replyTimerRef.current !== null) clearTimeout(replyTimerRef.current);
  }, []);

  const board = fenToBoard(fen);
  const game = new Chess(fen);
  const turn = game.turn();

  const legalTargets = selectedSquare
    ? game.moves({ square: selectedSquare as any, verbose: true }).map((m) => m.to as string)
    : [];

  const tryMove = useCallback(
    (from: string, to: string) => {
      if (status !== 'playing' || waitingReply) return;
      const expectedSan = puzzle.solution[moveIndex];
      const testGame = new Chess(fen);

      let moveResult;
      try {
        moveResult = testGame.move({ from, to, promotion: 'q' });
      } catch {
        return;
      }
      if (moveResult === null) return;

      const expectedUci = getMoveUci(expectedSan, new Chess(fen));
      let isCorrect =
        !!expectedUci &&
        expectedUci.from === from &&
        expectedUci.to === to &&
        (expectedUci.promotion || 'q') === (moveResult.promotion || 'q');
      // Мат в 1: принимается любой ход, дающий мат (канонический ответ не единственный)
      if (
        !isCorrect &&
        puzzle.solution.length === 1 &&
        expectedSan.includes('#') &&
        testGame.isCheckmate()
      ) {
        isCorrect = true;
      }

      if (isCorrect) {
        playTone('correct');
        const newFen = testGame.fen();
        setFen(newFen);
        setSelectedSquare(null);
        setLastMove({ from, to });
        const nextIdx = moveIndex + 1;

        if (nextIdx >= puzzle.solution.length) {
          setStatus('completed');
          setMessage(t('puzzleSolved'));
          playTone('complete');
          const meta = { mistakes: attempts, hintUsed: showHint };
          // Гарантируем ровно один вызов onComplete независимо от гонки кнопки и таймаута
          let fired = false;
          const fire = () => {
            if (fired) return;
            fired = true;
            fireCompleteRef.current = null;
            onComplete(puzzle.xp, meta);
          };
          fireCompleteRef.current = fire;
          setTimeout(fire, 1500);
        } else {
          setStatus('playing');
          setMessage(t('correct'));
          setMoveIndex(nextIdx);
          // Пока соперник «думает», ввод заблокирован — позиция не может рассинхронизироваться
          setWaitingReply(true);
          if (replyTimerRef.current !== null) clearTimeout(replyTimerRef.current);
          replyTimerRef.current = window.setTimeout(() => {
            replyTimerRef.current = null;
            const g2 = new Chess(newFen);
            const responseSan = puzzle.solution[nextIdx];
            const responseUci = getMoveUci(responseSan, g2);
            if (responseUci) {
              g2.move(responseUci);
              setFen(g2.fen());
              setLastMove({ from: responseUci.from, to: responseUci.to });
              setMoveIndex(nextIdx + 1);
            }
            setMessage('');
            setWaitingReply(false);
          }, 700);
        }
      } else {
        playTone('wrong');
        onWrongMove?.({ fen, playedSan: moveResult.san, expectedSan });
        setAttempts((a) => a + 1);
        setStatus('wrong');
        setMessage(t('wrong'));
        setLastMove({ from, to });
        setSelectedSquare(null);
        setTimeout(() => {
          setStatus('playing');
          setMessage('');
          setLastMove(null);
        }, 1200);
      }
    },
    [fen, moveIndex, puzzle, status, waitingReply, attempts, showHint, onComplete, onWrongMove, t]
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (status !== 'playing' || waitingReply) return;
      const piece = board[square];

      if (!selectedSquare) {
        if (piece && piece.color === turn) {
          setSelectedSquare(square);
        }
        return;
      }
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
        return;
      }
      tryMove(selectedSquare, square);
    },
    [status, board, turn, selectedSquare, tryMove]
  );

  // Touch/Drag handlers
  const handleDragStart = (sq: string, e: React.DragEvent) => {
    const piece = board[sq];
    if (!piece || piece.color !== turn || status !== 'playing' || waitingReply) {
      e.preventDefault();
      return;
    }
    setDragFrom(sq);
    setSelectedSquare(sq);
    const img = document.createElement('img');
    img.src = pieceImg(piece.color, piece.type);
    img.style.width = '48px';
    img.style.position = 'absolute';
    img.style.top = '-1000px';
    document.body.appendChild(img);
    e.dataTransfer.setDragImage(img, 24, 24);
    setTimeout(() => document.body.removeChild(img), 0);
    e.dataTransfer.setData('text/plain', sq);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sq: string) => {
    e.preventDefault();
    setDragOver(sq);
  };

  const handleDrop = (e: React.DragEvent, sq: string) => {
    e.preventDefault();
    setDragOver(null);
    if (dragFrom && dragFrom !== sq) {
      tryMove(dragFrom, sq);
    }
    setDragFrom(null);
    setGhostPiece(null);
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
    setGhostPiece(null);
  };

  // Touch support for mobile
  const handleTouchStart = (sq: string, e: React.TouchEvent) => {
    const piece = board[sq];
    if (!piece || piece.color !== turn || status !== 'playing' || waitingReply) return;
    setDragFrom(sq);
    setSelectedSquare(sq);
    setGhostPiece({ img: pieceImg(piece.color, piece.type), x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (ghostPiece) {
      setGhostPiece({ ...ghostPiece, x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragFrom || !boardRef.current) return;
    const touch = e.changedTouches[0];
    const rect = boardRef.current.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    const relativeY = touch.clientY - rect.top;

    const squareSize = rect.width / 8;
    const fileIdx = Math.floor(relativeX / squareSize);
    const rankIdx = Math.floor(relativeY / squareSize);

    if (fileIdx >= 0 && fileIdx < 8 && rankIdx >= 0 && rankIdx < 8) {
      const targetSq = renderFiles[fileIdx] + renderRanks[rankIdx];
      if (targetSq && targetSq !== dragFrom) {
        tryMove(dragFrom, targetSq);
      }
    }
    setDragFrom(null);
    setGhostPiece(null);
  };

  // Render board
  const renderRanks = orientation === 'white' ? RANKS.split('') : RANKS.split('').reverse();
  const renderFiles = orientation === 'white' ? FILES.split('') : FILES.split('').reverse();

  // Фигуры со стабильными id для анимации внутри ОДНОЙ задачи
  const { pieces: trackedPieces } = useMemo(() => {
    const { pieces: list, next } = trackPieces(board, prevPiecesRef.current);
    prevPiecesRef.current = next;
    return { pieces: list };
    // puzzle.id в зависимостях: refs сбрасываются при смене задачи синхронно выше
  }, [fen, orientation, puzzle.id]);

  const getSquareStyle = (sq: string, isLight: boolean): React.CSSProperties => {
    const isSelected = selectedSquare === sq;
    const isLastFrom = lastMove?.from === sq;
    const isLastTo = lastMove?.to === sq;
    const isCheck = kingInCheck === sq;

    let background = isLight ? 'var(--board-light)' : 'var(--board-dark)';

    if (isSelected) {
      background = SELECTED;
    } else if (isLastFrom || isLastTo) {
      background = LAST_MOVE;
    }

    const style: React.CSSProperties = {
      background,
      position: 'relative',
      width: '100%',
      height: '100%',
    };

    if (isCheck) {
      style.background = CHECK;
    }

    return style;
  };

  const pieceAt = (sq: string) => board[sq];

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3">
        <button onClick={onSkip} className="text-sm px-2 py-1 transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          {t('back')}
        </button>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {puzzle.theme}
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>+{puzzle.xp} {t('xp')}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-3">
        {puzzle.solution.filter((_, i) => i % 2 === 0).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: i < Math.floor(moveIndex / 2) ? 'var(--color-success)' : i === Math.floor(moveIndex / 2) ? 'var(--text-primary)' : 'var(--border-color)',
            }}
          />
        ))}
      </div>

      {/* Status Message */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="w-full text-center py-2.5 px-4 rounded-xl mb-3 font-medium text-sm animate-fade-in"
          style={{
            background: status === 'wrong' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            color: status === 'wrong' ? 'var(--color-danger)' : 'var(--color-success)',
          }}
        >
          {message}
        </div>
      )}

      {/* Instruction */}
      {status === 'playing' && waitingReply && (
        <div className="text-xs mb-2 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
          {t('opponentThinking')}
        </div>
      )}
      {!selectedSquare && status === 'playing' && !waitingReply && (
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {t('instructDrag')}
        </div>
      )}

      {/* Lichess-style Board */}
      <div className={`w-full max-w-[400px] mb-3 ${status === 'wrong' ? 'animate-shake' : ''}`}>
        <div
          ref={boardRef}
          className="relative w-full aspect-square rounded-sm overflow-hidden shadow-lg"
          style={{ border: '2px solid var(--border-color)', touchAction: 'none' }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Слой клеток: цвета, подсветки, координаты, точки легальных ходов */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8" role="grid" aria-label={t('boardLabel')}>
            {renderRanks.map((rank, row) =>
              renderFiles.map((file, col) => {
                const sq = file + rank;
                const piece = pieceAt(sq);
                const fileIdx = FILES.indexOf(file);
                const rankIdx = RANKS.indexOf(rank);
                const isLight = (fileIdx + rankIdx) % 2 === 0;
                const isLegalTarget = legalTargets.includes(sq);
                const isDragTarget = dragOver === sq;

                return (
                  <div
                    key={sq}
                    data-square={sq}
                    role="gridcell"
                    aria-label={
                      piece
                        ? `${sq}, ${piece.color === 'w' ? t('whitePiece') : t('blackPiece')} ${piece.type}`
                        : sq
                    }
                    tabIndex={piece && piece.color === turn && status === 'playing' ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSquareClick(sq);
                      }
                    }}
                    style={getSquareStyle(sq, isLight)}
                    onClick={() => handleSquareClick(sq)}
                    onDragOver={(e) => handleDragOver(e, sq)}
                    onDrop={(e) => handleDrop(e, sq)}
                    onDragLeave={() => setDragOver(null)}
                    onTouchStart={(e) => handleTouchStart(sq, e)}
                  >
                    {/* Координаты в стиле lichess: ранги слева, файлы снизу */}
                    {col === 0 && (
                      <span
                        className="absolute top-0.5 left-1 text-[10px] font-bold select-none pointer-events-none"
                        style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}
                      >
                        {rank}
                      </span>
                    )}
                    {row === 7 && (
                      <span
                        className="absolute bottom-0.5 right-1 text-[10px] font-bold select-none pointer-events-none"
                        style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}
                      >
                        {file}
                      </span>
                    )}

                    {/* Точка легального хода */}
                    {isLegalTarget && !piece && (
                      <span
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: '28%',
                          height: '28%',
                          background: LEGAL_MOVE,
                          opacity: 0.45,
                          top: '36%',
                          left: '36%',
                        }}
                      />
                    )}
                    {/* Кольцо взятия */}
                    {isLegalTarget && piece && (
                      <span
                        className="absolute inset-[6%] rounded-full pointer-events-none"
                        style={{
                          border: '4px solid rgba(20, 85, 150, 0.45)',
                        }}
                      />
                    )}

                    {isDragTarget && (
                      <span className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.6)' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Слой фигур: скольжение при ходе, lichess-спрайты cburnett */}
          <div className="absolute inset-0 pointer-events-none">
            {trackedPieces.map((p) => {
              const file = p.sq[0];
              const rank = p.sq[1];
              const col = renderFiles.indexOf(file);
              const row = renderRanks.indexOf(rank);
              if (col < 0 || row < 0) return null;
              const canDrag = p.color === turn && status === 'playing' && !waitingReply;
              const isDragging = dragFrom === p.sq;
              const seen = seenIdsRef.current.has(p.id);
              return (
                <img
                  key={p.id}
                  src={pieceImg(p.color, p.type)}
                  alt=""
                  draggable={canDrag}
                  onDragStart={(e) => handleDragStart(p.sq, e)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSquareClick(p.sq)}
                  onTouchStart={(e) => handleTouchStart(p.sq, e)}
                  className="absolute top-0 left-0 w-[12.5%] h-[12.5%] select-none"
                  style={{
                    transform: `translate(${col * 100}%, ${row * 100}%) scale(${isDragging ? 1.08 : 1})`,
                    transition: seen
                      ? 'transform 160ms cubic-bezier(0.2, 0.8, 0.3, 1)'
                      : 'none',
                    pointerEvents: canDrag ? 'auto' : 'none',
                    cursor: canDrag ? 'grab' : 'default',
                    opacity: isDragging ? 0.35 : 1,
                    zIndex: isDragging ? 30 : 10,
                    willChange: 'transform',
                    filter: isDragging ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))' : undefined,
                  }}
                  onLoad={() => {
                    // после первого рендера фигура считается «виденной» → следующие перемещения анимируются
                    if (!seenIdsRef.current.has(p.id)) {
                      const id = p.id;
                      requestAnimationFrame(() => seenIdsRef.current.add(id));
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Ghost piece for touch drag */}
      {ghostPiece && (
        <div
          className="fixed pointer-events-none z-50 select-none"
          style={{
            left: ghostPiece.x - 25,
            top: ghostPiece.y - 25,
            width: 50,
            height: 50,
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
          }}
        >
          <img src={ghostPiece.img} alt="" className="w-full h-full" draggable={false} />
        </div>
      )}

      {/* Hint & Controls */}
      <div className="w-full flex flex-col gap-2 max-w-[400px]">
        <button
          onClick={() => setShowHint(!showHint)}
          className={`btn w-full py-3 px-4 text-sm font-medium border-2 ${showHint ? 'border-ink text-ink' : 'border-line text-ink-secondary'} bg-card`}
        >
          <Lightbulb size={16} strokeWidth={2.2} aria-hidden="true" />
          {showHint ? t('hintHide').replace('💡 ', '') : t('hintShow').replace('💡 ', '')}
        </button>

        {showHint && (
          <div
            className="w-full py-3 px-4 rounded-xl text-sm animate-fade-in"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {puzzle.hint}
          </div>
        )}

        {status === 'playing' && (
          <CoachTip buildRequest={(lang) => ({ action: 'hint', fen, puzzleId: puzzle.id, lang })} />
        )}

        <div className="flex items-center justify-between text-xs mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
          <span>{t('attempts')}: {attempts}</span>
          <span className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: i < puzzle.difficulty ? 'var(--color-gold)' : 'var(--border-color)' }}>★</span>
            ))}
          </span>
        </div>
      </div>

      {/* Success Overlay */}
      {status === 'completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div
            className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-bounce-in"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="text-5xl mb-4 animate-float">🏆</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('puzzleSolved')}</h3>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>+{puzzle.xp} {t('xpEarned')}</p>
            <div className="flex items-center justify-center gap-1 text-2xl mb-6" style={{ color: 'var(--color-gold)' }}>
              {'⭐'.repeat(puzzle.difficulty)}
            </div>
            <button
              onClick={() => fireCompleteRef.current?.()}
              className="w-full py-3 px-6 rounded-xl font-semibold transition-colors active:scale-95"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            >
              {t('continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
