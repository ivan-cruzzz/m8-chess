// Главная линия каждого дебюта записана SAN-ходами от начальной позиции.
// Каждая линия проверена движком chess.js на легальность (src/data/__tests__/openings.test.ts):
// ход за ходом от начальной расстановки, каноническая SAN.

export interface Opening {
  /** Стабильный id: хранится в progress.openingsStudied для бонуса XP один раз */
  id: string;
  name: { ru: string; en: string };
  /** За какую сторону учится игрок: дебют — 'w', защита — 'b' */
  side: 'w' | 'b';
  /** SAN главной линии, 8–12 полуходов, от начальной позиции */
  moves: string[];
  idea: { ru: string; en: string };
}

export const openings: Opening[] = [
  {
    id: 'italian-game',
    name: { ru: 'Итальянская партия', en: 'Italian Game' },
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'],
    idea: {
      ru: 'Слон выходит на c4 — на самый слабый пункт чёрных f7. Белые строят тихую игру с d3 и c3, готовя d4.',
      en: 'The bishop lands on c4, aiming at the weakest black square f7. White plays quietly with d3 and c3, preparing d4.',
    },
  },
  {
    id: 'ruy-lopez',
    name: { ru: 'Испанская партия', en: 'Ruy Lopez' },
    side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
    idea: {
      ru: 'Слон b5 давит на коня c6, защищающего пешку e5. После a6 слон отходит на a4 и белые рокируются — классика на 150 лет вперёд.',
      en: 'The b5-bishop pins pressure on c6, the defender of e5. After a6 it retreats to a4 and White castles — a classic played for 150 years.',
    },
  },
  {
    id: 'queens-gambit',
    name: { ru: 'Ферзевый гамбит', en: "Queen's Gambit" },
    side: 'w',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O'],
    idea: {
      ru: 'Пешка c4 предлагает размен: если чёрные возьмут, белые завладеют центром. Жертва временная — отсюда «гамбит».',
      en: 'The c4-pawn offers an exchange: if Black captures, White seizes the centre. The pawn is only temporarily offered — hence "gambit".',
    },
  },
  {
    id: 'sicilian-defense',
    name: { ru: 'Сицилианская защита', en: 'Sicilian Defense' },
    side: 'b',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
    idea: {
      ru: 'Ход c5 создаёт асимметрию: чёрные меняют фигуру c на пешку d и получают полуоткрытую линию c для контригры. Вариант a6 — знаменитая защита Найдорфа.',
      en: 'c5 creates asymmetry: Black trades a flank pawn for a centre pawn and gets the semi-open c-file for counterplay. a6 is the famous Najdorf.',
    },
  },
  {
    id: 'french-defense',
    name: { ru: 'Французская защита', en: 'French Defense' },
    side: 'b',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'],
    idea: {
      ru: 'Чёрные строят крепкую пешечную цепь и готовят удар d5 по центру. Связка Bb4 (Винавер) давит на коня c3, держащего центр.',
      en: 'Black builds a solid pawn chain and prepares the central strike d5. The pin Bb4 (Winawer) pressures c3, the keeper of the centre.',
    },
  },
  {
    id: 'scandinavian-defense',
    name: { ru: 'Скандинавская защита', en: 'Scandinavian Defense' },
    side: 'b',
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6'],
    idea: {
      ru: 'Чёрные сразу бросают вызов центру: после размена ферзь выходит на d5 с вилкой и отступает на a5, не теряя темпа. Быстрая и понятная защита.',
      en: 'Black challenges the centre at once: after the trade the queen lands on d5 with tempo and steps back to a5 safely. A quick, clear defence.',
    },
  },
];
