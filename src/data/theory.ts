/** Теория по темам уроков (RU/EN) с примером-диаграммой */
export interface TheoryEntry {
  theme: string;
  title: { ru: string; en: string };
  text: { ru: string; en: string };
  exampleFen: string;
}

export const theory: TheoryEntry[] = [
  {
    theme: 'Мат в 1',
    title: { ru: 'Мат в один ход', en: 'Mate in one' },
    text: {
      ru: 'Мат — атака короля, от которой нет защиты: король не может уйти, закрыться или взять атакующую фигуру. Ищите незащищённые поля рядом с королём соперника и фигуры, которые могут туда ударить. Чаще всего мат бывает на последних горизонталях и возле пешек короля.',
      en: 'Checkmate is an attack on the king with no defense: it cannot move, block, or capture the attacker. Look for undefended squares near the enemy king and pieces that can strike there. Most mates happen on the back rank and near the king\'s pawns.',
    },
    exampleFen: 'r4rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
  },
  {
    theme: 'Вилка',
    title: { ru: 'Вилка', en: 'Fork' },
    text: {
      ru: 'Вилка — одна фигура атакует сразу две цели. Особенно опасны кони: их прыжки не всегда заметны. Целься в самые ценные фигуры соперника — ферзя и короля.',
      en: 'A fork is one piece attacking two targets at once. Knights are especially dangerous: their jumps are easy to miss. Aim at the most valuable pieces — the queen and the king.',
    },
    exampleFen: 'r3k2r/ppp2ppp/8/3N4/8/8/PPP2PPP/R3K2R w - - 0 1',
  },
  {
    theme: 'Связка',
    title: { ru: 'Связка', en: 'Pin' },
    text: {
      ru: 'Связка — фигура не может ходить, потому что за ней стоит более ценная (часто король). Связанная фигура не защищает и не атакует — напирайте на неё.',
      en: 'A pin: a piece cannot move because a more valuable piece (often the king) stands behind it. A pinned piece neither defends nor attacks — press on it.',
    },
    exampleFen: 'r3k2r/ppp2ppp/2n5/3N4/8/8/PPP2PPP/R3K2R w - - 0 1',
  },
  {
    theme: 'Сквозной удар',
    title: { ru: 'Сквозной удар (рентген)', en: 'Skewer' },
    text: {
      ru: 'Сквозной удар — дальнобойная фигура атакует две цели по одной линии: первая вынуждена уйти, и вторая погибает. Король и ферзь соперника на одной линии — ищите рентген!',
      en: 'A skewer: a long-range piece attacks two targets on one line; the first must move and the second falls. King and queen of the opponent on one line — look for a skewer!',
    },
    exampleFen: '3q2k1/8/8/3R4/8/8/8/6K1 w - - 0 1',
  },
  {
    theme: 'Открытый удар',
    title: { ru: 'Открытый удар', en: 'Discovered attack' },
    text: {
      ru: 'Открытый удар: фигура уходит с линии и «открывает» огонь дальнобойной фигуры позади себя. Уходящая фигура может одновременно брать материал или давать шах — двойной удар.',
      en: 'Discovered attack: a piece moves off a line and "opens" fire of a long-range piece behind it. The moving piece can capture or check at the same time — a double blow.',
    },
    exampleFen: 'r3k3/8/8/3B4/8/3N4/8/4K3 w - - 0 1',
  },
  {
    theme: 'Мат в 2',
    title: { ru: 'Мат в два хода', en: 'Mate in two' },
    text: {
      ru: 'Комбинация из двух ходов: первый ход (часто с жертвой или шахом) заставляет соперника сделать единственный ответ, после чего следует мат. Считайте на ход вперёд.',
      en: 'A two-move combination: the first move (often a sacrifice or check) forces a single reply, then mate follows. Calculate one move ahead.',
    },
    exampleFen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
  },
  {
    theme: 'Двойной шах',
    title: { ru: 'Двойной шах', en: 'Double check' },
    text: {
      ru: 'Двойной шах дают две фигуры одновременно. От него нельзя закрыться и нельзя взять обе — король обязан уйти. Это самое разрушительное начало атаки.',
      en: 'Double check: two pieces give check at once. You cannot block it or capture both — the king must move. The most destructive way to start an attack.',
    },
    exampleFen: 'r1bqk2r/pppp1ppp/2n5/2b1n3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
  },
  {
    theme: 'Отвлечение',
    title: { ru: 'Отвлечение', en: 'Deflection' },
    text: {
      ru: 'Отвлечение — заставить защитника покинуть пост: жертвой или нападением. Защитник уходит — и защищаемое поле или фигура становятся уязвимы.',
      en: 'Deflection: force a defender to leave its post by a sacrifice or an attack. The defender leaves — and the square or piece it guarded becomes vulnerable.',
    },
    exampleFen: '3r2k1/5ppp/8/8/8/8/5PPP/2R2RK1 w - - 0 1',
  },
  {
    theme: 'Освобождение линии',
    title: { ru: 'Освобождение линии', en: 'Line clearance' },
    text: {
      ru: 'Иногда собственная фигура мешает бить по линии. Освободите линию — уведите фигуру с выгодом (шахом или взятием), открыв дорогу дальнобойной артиллерии.',
      en: 'Sometimes your own piece blocks a line. Clear it — move the piece with gain (check or capture), opening the road for your long-range artillery.',
    },
    exampleFen: 'r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K1QR w - - 0 1',
  },
  {
    theme: 'Промежуточный ход',
    title: { ru: 'Промежуточный ход (Цвишенцуг)', en: 'Zwischenzug (intermediate move)' },
    text: {
      ru: 'Вместо ожидаемого размена или отступления сыграйте неожиданный промежуточный ход — обычно с шахом. Соперник обязан ответить, и картина меняется в вашу пользу.',
      en: 'Instead of the expected exchange or retreat, play an unexpected intermediate move — usually with check. The opponent must respond, and the picture changes in your favor.',
    },
    exampleFen: 'r1bqk2r/pppp1ppp/2n5/2b1n3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
  },
  {
    theme: 'Жертва',
    title: { ru: 'Жертва', en: 'Sacrifice' },
    text: {
      ru: 'Жертва — отдача материала ради атаки, темпа или позиции. Самые красивые маты начинаются с жертвы: ферзя или ладьи, открывающей короля соперника.',
      en: 'A sacrifice gives up material for an attack, tempo, or position. The most beautiful mates begin with a sacrifice: a queen or rook that opens the enemy king.',
    },
    exampleFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 3',
  },
  {
    theme: 'Завлечение',
    title: { ru: 'Завлечение', en: 'Attraction (decoy)' },
    text: {
      ru: 'Завлечение — заманить фигуру соперника на невыгодное поле, где она попадает под удар или разрывает связь с защитой. Шахи и жертвы — главные приманки.',
      en: 'Attraction lures an enemy piece to a bad square where it comes under attack or loses contact with the defense. Checks and sacrifices are the main baits.',
    },
    exampleFen: 'r1bqk2r/pppp1ppp/2n5/2b1n3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R b KQkq - 0 1',
  },
  {
    theme: 'Эндшпиль',
    title: { ru: 'Эндшпиль', en: 'Endgame' },
    text: {
      ru: 'В эндшпиле король становится активной фигурой. Главные техники: отрезание короля по горизонтали (лесенка ладьи) и «мост» для превращения пешки. Точность важнее красоты.',
      en: 'In the endgame the king becomes an active piece. Key techniques: cutting the king off along a rank (rook ladder) and building a "bridge" to promote a pawn. Precision beats beauty.',
    },
    exampleFen: '7k/8/8/4K3/8/8/8/6R1 w - - 0 1',
  },
];

export const getTheory = (theme: string) => theory.find((t) => t.theme === theme);
