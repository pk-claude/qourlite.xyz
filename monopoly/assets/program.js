/* Content for the Monopoly all-hands game: the board, the quiz, the prize lots.
   Edit this file to change questions. Each question lands the token on board space `at`. */
window.MONO = {
  // Colour groups, same order as the classic board.
  colors: {
    brown: '#8b4f2b', lightblue: '#9fd4f2', pink: '#d63c96', orange: '#f7941d',
    red: '#e2231a', yellow: '#fef200', green: '#1fb25a', darkblue: '#0072bb',
  },

  // 40 spaces, index 0 = GO, counter-clockwise from the bottom-right corner like the real board.
  // Themed as a box's trip through a distribution center: yard, receiving, putaway, storage, pick, pack, sort, ship.
  board: [
    { t: 'corner', n: 'GO', sub: 'Collect $200' },
    { t: 'prop', c: 'brown', n: 'Trailer Yard', p: 60 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'brown', n: 'Dock Door 12', p: 60 },
    { t: 'tax', n: 'Damage Claim', sub: 'Pay $200' },
    { t: 'rail', n: 'Inbound Conveyor', p: 200 },
    { t: 'prop', c: 'lightblue', n: 'Receiving Lane', p: 100 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'lightblue', n: 'ASN Avenue', p: 100 },
    { t: 'prop', c: 'lightblue', n: 'Unload Station', p: 120 },
    { t: 'corner', n: 'Damage Cage', sub: 'Just visiting' },
    { t: 'prop', c: 'pink', n: 'Putaway Path', p: 140 },
    { t: 'util', n: 'Forklift Battery Room', p: 150 },
    { t: 'prop', c: 'pink', n: 'Reach Truck Row', p: 140 },
    { t: 'prop', c: 'pink', n: 'Slotting Street', p: 160 },
    { t: 'rail', n: 'Sortation Conveyor', p: 200 },
    { t: 'prop', c: 'orange', n: 'Pallet Rack Row', p: 180 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'orange', n: 'Bulk Storage Bay', p: 180 },
    { t: 'prop', c: 'orange', n: 'Mezzanine Way', p: 200 },
    { t: 'corner', n: 'Break Room', sub: 'Free parking' },
    { t: 'prop', c: 'red', n: 'Pick Path', p: 220 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'red', n: 'Goods-to-Person Grid', p: 220 },
    { t: 'prop', c: 'red', n: 'Robot Pick Cell', p: 240 },
    { t: 'rail', n: 'Spiral Conveyor', p: 200 },
    { t: 'prop', c: 'yellow', n: 'AMR Alley', p: 260 },
    { t: 'prop', c: 'yellow', n: 'Tote Lane', p: 260 },
    { t: 'util', n: 'Robot Charging Dock', p: 150 },
    { t: 'prop', c: 'yellow', n: 'Pack Station', p: 280 },
    { t: 'corner', n: 'Go to Damage Cage', sub: 'Unscanned pallet' },
    { t: 'prop', c: 'green', n: 'Sorter Boulevard', p: 300 },
    { t: 'prop', c: 'green', n: 'Cross-Dock Court', p: 300 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'green', n: 'Load Planning Lane', p: 320 },
    { t: 'rail', n: 'Outbound Conveyor', p: 200 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'darkblue', n: 'Outbound Dock', p: 350 },
    { t: 'tax', n: 'Overtime Tax', sub: 'Pay $100' },
    { t: 'prop', c: 'darkblue', n: 'Last Mile Boardwalk', p: 400 },
  ],

  // Starting cash from the Bank, and what a right answer pays.
  start: 500,
  pay: { base: 200, speed: 200 }, // $200 for right, up to +$200 for speed; doubled on double questions
  limit: 20, // seconds per question
  chestDraws: 2, // Community Chest draws after the podium
  hand: 5, // properties dealt to each player; landing on one you own doubles your rent for that question

  // One question per section of the all-hands. Five rolls make one full lap:
  // 8 + 8 + 6 + 9 + 9 = 40 spaces, so the last roll lands back on GO.
  // `at` is the space the token lands on, `dice` the two dice shown for that roll.
  // a = index of the right answer. PLACEHOLDER questions: swap in the real section topics.
  quiz: [
    {
      id: 'q1', section: 'Section 1', at: 8, dice: [3, 5], tag: 'WARM-UP',
      q: 'You pass GO. How much does the Bank pay you?',
      opts: ['$100', '$200', '$400', 'A firm handshake'], a: 1,
      fact: '$200 a lap since 1935. Today, every right answer pays you rent.',
    },
    {
      id: 'q2', section: 'Section 2', at: 16, dice: [4, 4], tag: 'LOOK CLOSER',
      q: 'Mr. Monopoly has NEVER had one of these. Which one?',
      opts: ['Top hat', 'Mustache', 'Cane', 'Monocle'], a: 3,
      fact: 'No monocle, ever. Millions of people remember one anyway, a famous "Mandela effect".',
    },
    {
      id: 'q3', section: 'Section 3', at: 22, dice: [2, 4], tag: 'CHANCE', double: true,
      q: 'In 2017, fans voted a classic token off the board. Which one?',
      opts: ['Thimble', 'Top hat', 'Race car', 'Scottie dog'], a: 0,
      fact: 'The thimble went (with the boot and the wheelbarrow). In came the T-rex, the rubber duck and the penguin.',
    },
    {
      id: 'q4', section: 'Section 4', at: 31, dice: [4, 5], tag: 'ORANGE HISTORY',
      q: 'The Home Depot opened its first two stores, in Atlanta, in which year?',
      opts: ['1969', '1979', '1989', '1999'], a: 1,
      fact: '1979. Bernie Marcus and Arthur Blank (with Ken Langone and Pat Farrah) started with 2 stores. Today: 2,300+.',
    },
    {
      id: 'q5', section: 'Section 5', at: 0, dice: [6, 3], tag: 'BACK TO GO', double: true,
      q: 'Monopoly began as "The Landlord\'s Game" (Lizzie Magie, 1904). What was it designed to do?',
      opts: ['Teach kids to save money', 'Show how land monopolies hurt tenants', 'Train real estate agents', 'Advertise Atlantic City hotels'], a: 1,
      fact: 'Magie built it as a warning about landlords hoarding land. Players loved bankrupting each other anyway.',
    },
  ],

  // Phone questions that feed the AI property deed.
  deedQs: [
    { k: 'power', q: 'Your work superpower', ph: 'e.g. finding the one wrong cell in a 40-tab model' },
    { k: 'snack', q: 'A snack or drink you would defend with your life', ph: 'e.g. the last cold brew in the fridge' },
    { k: 'phrase', q: 'The phrase you say most in meetings', ph: 'e.g. "let\'s take that offline"' },
  ],
  deedIdeas: {
    power: ['Inbox zero by noon', 'Finding the typo in slide 47', 'Making Excel do things Excel should not do', 'Remembering everyone\'s birthday', 'Fixing the printer', 'Turning a 1-hour meeting into 20 minutes'],
    snack: ['Hot Cheetos', 'The last cold brew', 'Office donuts', 'Gummy bears', 'Popcorn from the break room', 'Dark chocolate, obviously'],
    phrase: ['"Let\'s take that offline"', '"Can you see my screen?"', '"You\'re on mute"', '"Quick question"', '"Per my last email"', '"Let\'s circle back"'],
  },

  // Game pieces, distribution-center style: robots, trucks, totes, safety gear.
  tokens: ['🤖', '📦', '🚚', '🚛', '🦺', '⛑️', '🔋', '🛒', '🏷️', '📋', '🔧', '🪜', '🧤', '🚧', '🧯', '🎲'],
};

// Each player's hand of properties, dealt from their player id. The phone and the big screen
// compute the same hand on their own, so nothing extra has to travel between them.
window.MONO.ownable = window.MONO.board.map((sp, i) => (['prop', 'rail', 'util'].includes(sp.t) ? i : -1)).filter(i => i > -1);
window.MONO.handFor = function (pid) {
  let h = 2166136261;
  for (const ch of 'hand:' + pid) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const deck = window.MONO.ownable.slice();
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck.slice(0, window.MONO.hand).sort((a, b) => a - b);
};
