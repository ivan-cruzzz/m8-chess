import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, BadgeCheck, RotateCcw } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { openings, type Opening } from '../data/openings';
import type { UserProgress } from '../types';

/** Бонус XP за первое прохождение дебюта (noteOpeningDone начисляет его один раз) */
export const OPENING_BONUS_XP = 30;

const FILES = 'abcdefgh';
const RANKS = '87654321';
const pieceImg = (color: string, type: string) => `pieces/${color}${type.toUpperCase()}.svg`;

interface OpeningsTrainerProps {
  progress: UserProgress;
  /** Завершение линии: hook сам не начислит XP за повторное прохождение */
  onOpeningDone: (id: string, xp: number) => void;
  onExit: () => void;
}

export function OpeningsTrainer({ progress, onOpeningDone, onExit }: OpeningsTrainerProps) {
  const { t, lang } = useI18n();
  const [opening, setOpening] = useState<Opening | null>(null);
  // fen — только триггер перерисовки: доска каждый раз читается из gameRef
  const [, setFen] = useState(new Chess().fen());
  const [played, setPlayed] = useState<string[]>([]);
  const [ply, setPly] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const gameRef = useMemo(() => new Chess(), []);

  /** Начать линию заново (или с нуля) */
  const startLine = (o: Opening) => {
    gameRef.reset();
    setFen(gameRef.fen());
    setPlayed([]);
    setPly(0);
    setWrong(false);
    setSelected(null);
    setDone(false);
    setOpening(o);
  };

  const backToList = () => {
    gameRef.reset();
    setFen(gameRef.fen());
    setPlayed([]);
    setPly(0);
    setWrong(false);
    setSelected(null);
    setDone(false);
    setOpening(null);
  };

  /** Финал линии: бонус XP (однократно — решает useProgress) */
  useEffect(() => {
    if (done && opening) onOpeningDone(opening.id, OPENING_BONUS_XP);
  }, [done, opening, onOpeningDone]);

  /** Автоход соперника: игрок двигает только свою сторону, ответы линии подставляются сами */
  useEffect(() => {
    if (!opening || done) return;
    const userIsWhite = opening.side === 'w';
    if ((gameRef.turn() === 'w') === userIsWhite) return; // сейчас ход игрока
    const id = window.setTimeout(() => {
      try {
        const res = gameRef.move(opening.moves[ply]);
        if (res) {
          setFen(gameRef.fen());
          setPlayed((p) => [...p, res.san]);
          const next = ply + 1;
          setPly(next);
          if (next >= opening.moves.length) setDone(true);
        }
      } catch {
        /* линия проверена тестом — не бывает */
      }
    }, 550);
    return () => window.clearTimeout(id);
  }, [opening, ply, done, gameRef]);

  /** Квадрат ожидаемого хода (from/to) для подсветки подсказки; пересчёт на каждый рендер дешёв */
  let expected: { from: string; to: string } | null = null;
  if (opening && !done) {
    const san = opening.moves[ply];
    const found = gameRef.moves({ verbose: true }).find((m) => m.san === san);
    if (found) expected = { from: found.from, to: found.to };
  }

  const onSquareClick = (sq: string) => {
    if (!opening || done) return;
    const userIsWhite = opening.side === 'w';
    if ((gameRef.turn() === 'w') !== userIsWhite) return; // очередь соперника
    const piece = gameRef.get(sq as never);
    if (selected) {
      if (selected === sq) return setSelected(null);
      if (piece && piece.color === gameRef.turn()) return setSelected(sq);
      // ищем легальный ход выбранной фигуры на эту клетку и сверяем SAN с линией
      const candidate = gameRef
        .moves({ square: selected as never, verbose: true })
        .find((m) => m.to === sq);
      if (!candidate) return setSelected(null);
      if (candidate.san === opening.moves[ply]) {
        gameRef.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
        setFen(gameRef.fen());
        setPlayed((p) => [...p, candidate.san]);
        setSelected(null);
        setWrong(false);
        const next = ply + 1;
        setPly(next);
        if (next >= opening.moves.length) setDone(true);
      } else {
        // неверный ход — позиция не меняется, игрок повторяет
        setWrong(true);
        setSelected(null);
      }
      return;
    }
    if (piece && piece.color === gameRef.turn()) setSelected(sq);
  };

  /* ---------- Список дебютов ---------- */
  if (!opening) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 animate-fade-in">
        <h2 className="display-title text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          {t('openingsTitle')}
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
          {t('openingsDesc')}
        </p>

        <div className="flex flex-col gap-3">
          {openings.map((o) => {
            const studied = progress.openingsStudied.includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => startLine(o)}
                className="glass-card p-4 text-left w-full transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-bold text-ink flex items-center gap-2 min-w-0">
                    <span aria-hidden="true">{o.side === 'w' ? '♔' : '♚'}</span>
                    <span className="truncate">{o.name[lang]}</span>
                  </p>
                  {studied && (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-success">
                      <BadgeCheck size={14} strokeWidth={2.4} aria-hidden="true" />
                      {t('openingsStudied')}
                    </span>
                  )}
                </div>
                <p className="text-caption text-muted line-clamp-2 mb-3">{o.idea[lang]}</p>
                <span className="text-xs font-semibold text-gold-accent inline-flex items-center gap-1">
                  {t('openingsStart')}
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={onExit} className="w-full mt-6 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('exitPractice')}
        </button>
      </div>
    );
  }

  /* ---------- Линия: доска и пошаговый ввод ---------- */
  const board = gameRef.board();
  const orientation = opening.side === 'w' ? 'white' : 'black';
  const renderRanks = orientation === 'white' ? RANKS.split('') : RANKS.split('').reverse();
  const renderFiles = orientation === 'white' ? FILES.split('') : FILES.split('').reverse();
  const userTurn = (gameRef.turn() === 'w') === (opening.side === 'w');

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <button onClick={backToList} className="text-sm" style={{ color: 'var(--text-muted)' }}>
          ← {t('openingsList')}
        </button>
        <span className="text-caption font-semibold text-muted">
          {done
            ? t('openingsDone')
            : t('openingsStep').replace('{n}', String(ply + 1)).replace('{total}', String(opening.moves.length))}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-black text-ink" aria-hidden="true">{opening.side === 'w' ? '♔' : '♚'}</span>
        <p className="font-bold text-ink flex-1 min-w-0 truncate">
          {opening.name[lang]}
          <span className="text-caption font-semibold text-muted"> · {opening.side === 'w' ? t('openingsSideWhite') : t('openingsSideBlack')}</span>
        </p>
      </div>

      <div className="max-w-[400px] mx-auto mb-3">
        <div
          className="relative w-full aspect-square rounded-sm overflow-hidden shadow-lg"
          style={{ border: '2px solid var(--border-color)' }}
        >
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
            {renderRanks.map((rank) =>
              renderFiles.map((file) => {
                const fileIdx = FILES.indexOf(file);
                const rankIdx = RANKS.indexOf(rank);
                const isLight = (fileIdx + rankIdx) % 2 === 0;
                const sq = file + rank;
                const isSel = selected === sq;
                const isExpected =
                  expected !== null && (expected.from === sq || expected.to === sq);
                return (
                  <div
                    key={sq}
                    role="gridcell"
                    aria-label={sq}
                    onClick={() => onSquareClick(sq)}
                    style={{
                      background: isSel
                        ? 'rgba(20, 85, 150, 0.5)'
                        : isExpected
                        ? 'rgba(245, 158, 11, 0.35)'
                        : isLight
                        ? 'var(--board-light)'
                        : 'var(--board-dark)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {(() => {
                      const cell = board[rankIdx][fileIdx];
                      if (!cell) return null;
                      return (
                        <img
                          src={pieceImg(cell.color, cell.type)}
                          alt=""
                          draggable={false}
                          className="absolute inset-[4%] w-[92%] h-[92%] select-none pointer-events-none"
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

      {/* Статус линии: подсказка хода / ошибка / финал */}
      <div className="text-center mb-3 text-sm font-bold flex items-center justify-center gap-2 min-h-6">
        {done ? (
          <span className="text-gold-accent">{t('openingsDone')}</span>
        ) : wrong ? (
          <span style={{ color: 'var(--danger)' }}>{t('wrong')}</span>
        ) : (
          <span className="text-muted">
            {userTurn ? (
              <>
                {t('openingsExpected')}:{' '}
                <b className="text-gold-accent font-mono" dir="ltr">
                  {opening.moves[ply]}
                </b>
              </>
            ) : (
              t('instructClick')
            )}
          </span>
        )}
      </div>

      {/* Идея дебюта — пояснение линии */}
      <div className="glass-card p-4 mb-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {opening.idea[lang]}
        </p>
      </div>

      {/* Сделанные ходы линии */}
      <div className="glass-card p-3 mb-4">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {played.map((s, i) => (
            <span key={i} className="font-mono">
              {i % 2 === 0 && <span className="opacity-50 mr-1">{i / 2 + 1}.</span>}
              {s}
            </span>
          ))}
          {played.length === 0 && <span className="opacity-50">—</span>}
        </div>
      </div>

      {done && (
        <div className="flex flex-col gap-2 animate-bounce-in">
          <p className="text-center text-sm font-bold text-gold-accent mb-1">
            {progress.openingsStudied.includes(opening.id)
              ? t('openingsAlready')
              : t('openingsBonus').replace('{xp}', String(OPENING_BONUS_XP))}
          </p>
          <button
            onClick={() => startLine(opening)}
            className="btn btn-gold w-full py-3.5"
          >
            <RotateCcw size={18} strokeWidth={2.4} aria-hidden="true" />
            {t('openingsReplay')}
          </button>
          <button onClick={backToList} className="btn btn-secondary w-full py-3.5">
            {t('openingsList')}
          </button>
        </div>
      )}
    </div>
  );
}
