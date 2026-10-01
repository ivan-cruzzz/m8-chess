/** Курс новичка: слайды с текстом и диаграммой */
export interface CourseSlide {
  icon: string;
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  fen?: string;
}

export const courseSlides: CourseSlide[] = [
  {
    icon: '♟',
    title: { ru: 'Доска и поля', en: 'Board and squares' },
    text: {
      ru: 'Доска 8×8. Буквы a–h — вертикали, цифры 1–8 — горизонтали. Белые всегда внизу. Запомните: угловое поле справа от вас — всегда светлое.',
      en: 'The board is 8×8. Letters a–h are files, numbers 1–8 are ranks. White sits at the bottom. Remember: the corner square on your right is always light.',
    },
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    icon: '♙',
    title: { ru: 'Пешка', en: 'Pawn' },
    text: {
      ru: 'Ходит на 1 поле вперёд (с начальной — может на 2), бьёт по диагонали на 1. Дойдя до последней горизонтали, превращается в любую фигуру (обычно ферзя!).',
      en: 'Moves 1 square forward (2 from its start), captures 1 square diagonally. Reaching the last rank, it promotes to any piece (usually a queen!).',
    },
    fen: '8/1P6/8/8/8/8/6p1/8 w - - 0 1',
  },
  {
    icon: '♘',
    title: { ru: 'Конь', en: 'Knight' },
    text: {
      ru: 'Ходит буквой «Г»: 2 поля в одну сторону и 1 в перпендикулярную. Единственная фигура, перепрыгивающая другие. В замкнутых позициях конь силён.',
      en: 'Moves in an "L": 2 squares one way and 1 perpendicular. The only piece that jumps over others. Knights thrive in closed positions.',
    },
    fen: '8/8/8/3N4/8/8/8/8 w - - 0 1',
  },
  {
    icon: '♗',
    title: { ru: 'Слон', en: 'Bishop' },
    text: {
      ru: 'Ходит по диагоналям любое число полей. Слоны бывают «белопольные» и «чернопольные» — один слон всю партию ходит только по своему цвету.',
      en: 'Moves any number of squares diagonally. Bishops are light-squared or dark-squared — one bishop stays on its color for the whole game.',
    },
    fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
  },
  {
    icon: '♖',
    title: { ru: 'Ладья', en: 'Rook' },
    text: {
      ru: 'Ходит по вертикалям и горизонталям любое число полей. Сильна на открытых линиях и 7-й горизонтали. Участвует в рокировке.',
      en: 'Moves any number of squares along files and ranks. Strong on open files and the 7th rank. Takes part in castling.',
    },
    fen: 'R7/8/8/8/8/8/8/7R w - - 0 1',
  },
  {
    icon: '♕',
    title: { ru: 'Ферзь', en: 'Queen' },
    text: {
      ru: 'Самая сильная фигура: ходит как ладья и слон вместе — по линиям и диагоналям. Берегите её: потеря ферзя обычно решает партию.',
      en: 'The most powerful piece: moves like a rook and bishop combined — along lines and diagonals. Keep her safe: losing the queen usually decides the game.',
    },
    fen: '8/8/8/8/4Q3/8/8/8 w - - 0 1',
  },
  {
    icon: '♔',
    title: { ru: 'Король', en: 'King' },
    text: {
      ru: 'Ходит на 1 поле в любую сторону. Не может ходить под шах. В дебюте прячется рокировкой, в эндшпиле — идёт в центр и помогает пешкам.',
      en: 'Moves 1 square any direction. Cannot move into check. Hide it by castling early; in the endgame march it to the center to support pawns.',
    },
    fen: '8/8/8/3K4/8/8/8/7k w - - 0 1',
  },
  {
    icon: '⚔️',
    title: { ru: 'Шах и мат', en: 'Check and mate' },
    text: {
      ru: 'Шах — атака на короля: надо уйти, закрыться или взять атакующего. Мат — шах, от которого нет спасения. Цель партии — поставить мат.',
      en: 'Check is an attack on the king: move, block, or capture the attacker. Mate is a check with no escape. The goal of the game is checkmate.',
    },
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
  },
  {
    icon: '🤝',
    title: { ru: 'Рокировка и ничья', en: 'Castling and draws' },
    text: {
      ru: 'Рокировка: король на 2 поля к ладье, ладья перепрыгивает его — король в безопасности. Ничья бывает по пату (ходов нет, шаха нет), вечному шаху и недостатку материала.',
      en: 'Castling: king moves 2 squares toward a rook, the rook jumps over — the king is safe. Draws happen by stalemate (no moves, no check), perpetual check, or insufficient material.',
    },
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
  },
  {
    icon: '🚀',
    title: { ru: 'Что дальше?', en: 'What next?' },
    text: {
      ru: 'Пройдите урок «Мат в 1» на карте — научитесь видеть финальные удары. Решайте задачи каждый день: 5 минут практики сильнее часа теории. Удачи!',
      en: 'Take the "Mate in 1" lesson on the map — learn to spot finishing blows. Solve puzzles daily: 5 minutes of practice beat an hour of theory. Good luck!',
    },
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
];
