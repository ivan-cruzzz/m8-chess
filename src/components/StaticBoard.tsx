import { Chess } from 'chess.js';

const FILES = 'abcdefgh';
const RANKS = '87654321';
const pieceImg = (color: string, type: string) => `pieces/${color}${type.toUpperCase()}.svg`;

interface StaticBoardProps {
  fen: string;
  size?: number; // px, по умолчанию адаптив
  orientation?: 'white' | 'black';
  className?: string;
  lastMove?: { from: string; to: string } | null;
}

/** Статичная доска без интерактива: для теории, курса, истории партий */
export function StaticBoard({ fen, size, orientation = 'white', className = '', lastMove = null }: StaticBoardProps) {
  const game = new Chess(fen);
  const board = game.board();
  const renderRanks = orientation === 'white' ? RANKS.split('') : RANKS.split('').reverse();
  const renderFiles = orientation === 'white' ? FILES.split('') : FILES.split('').reverse();

  return (
    <div
      className={`relative rounded-md overflow-hidden shadow-md ${className}`}
      style={{ width: size ? `${size}px` : '100%', aspectRatio: '1 / 1', border: '2px solid var(--border-color)' }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {renderRanks.map((rank) =>
          renderFiles.map((file) => {
            const fileIdx = FILES.indexOf(file);
            const rankIdx = RANKS.indexOf(rank);
            const isLight = (fileIdx + rankIdx) % 2 === 0;
            const sq = file + rank;
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            return (
              <div
                key={sq}
                style={{
                  background: isLast ? 'rgba(155, 199, 0, 0.41)' : isLight ? 'var(--board-light)' : 'var(--board-dark)',
                  position: 'relative',
                }}
              >
                {/* фигуры берём из chess.js-матрицы по индексам экрана */}
                {(() => {
                  const cell = board[rankIdx][fileIdx];
                  if (!cell) return null;
                  return (
                    <img
                      src={pieceImg(cell.color, cell.type)}
                      alt=""
                      draggable={false}
                      className="absolute inset-[6%] w-[88%] h-[88%] select-none pointer-events-none"
                    />
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
