/* Content for the Monopoly all-hands game: the board, the quiz, the prize lots.
   Edit this file to change questions. Each question lands the token on board space `at`. */
window.MONO = {
  // Colour groups, same order as the classic board.
  colors: {
    brown: '#8b4f2b', lightblue: '#9fd4f2', pink: '#d63c96', orange: '#f7941d',
    red: '#e2231a', yellow: '#fef200', green: '#1fb25a', darkblue: '#0072bb',
  },

  // 40 spaces, index 0 = GO, counter-clockwise from the bottom-right corner like the real board.
  board: [
    { t: 'corner', n: 'GO', sub: 'Collect $200' },
    { t: 'prop', c: 'brown', n: 'Bucket Boulevard', p: 60 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'brown', n: 'Tape Measure Terrace', p: 60 },
    { t: 'tax', n: 'Shrink Tax', sub: 'Pay $200' },
    { t: 'rail', n: 'Forklift Railroad', p: 200 },
    { t: 'prop', c: 'lightblue', n: 'Paint Aisle Avenue', p: 100 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'lightblue', n: 'Caulk Court', p: 100 },
    { t: 'prop', c: 'lightblue', n: 'Grout Street', p: 120 },
    { t: 'corner', n: 'Jail', sub: 'Just visiting' },
    { t: 'prop', c: 'pink', n: 'Plumbing Place', p: 140 },
    { t: 'util', n: 'Electric Aisle', p: 150 },
    { t: 'prop', c: 'pink', n: 'Pipe Fitting Parkway', p: 140 },
    { t: 'prop', c: 'pink', n: 'Faucet Avenue', p: 160 },
    { t: 'rail', n: 'Pallet Jack Railroad', p: 200 },
    { t: 'prop', c: 'orange', n: 'Orange Apron Avenue', p: 180 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'orange', n: 'Lumber Lane', p: 180 },
    { t: 'prop', c: 'orange', n: 'Plywood Place', p: 200 },
    { t: 'corner', n: 'Free Parking', sub: 'Pro lot' },
    { t: 'prop', c: 'red', n: 'Flooring Freeway', p: 220 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'red', n: 'Tile Trail', p: 220 },
    { t: 'prop', c: 'red', n: 'Hardwood Heights', p: 240 },
    { t: 'rail', n: 'Cycle Count Line', p: 200 },
    { t: 'prop', c: 'yellow', n: 'Garden Center Gardens', p: 260 },
    { t: 'prop', c: 'yellow', n: 'Mulch Mile', p: 260 },
    { t: 'util', n: 'Hose Aisle Water Works', p: 150 },
    { t: 'prop', c: 'yellow', n: 'Sunflower Street', p: 280 },
    { t: 'corner', n: 'Go to Jail', sub: 'Unscanned item' },
    { t: 'prop', c: 'green', n: 'Tool Rental Road', p: 300 },
    { t: 'prop', c: 'green', n: 'Power Tool Place', p: 300 },
    { t: 'chest', n: 'Community Chest' },
    { t: 'prop', c: 'green', n: 'Drill Bit Drive', p: 320 },
    { t: 'rail', n: 'Short Line Pallet Express', p: 200 },
    { t: 'chance', n: 'Chance' },
    { t: 'prop', c: 'darkblue', n: 'Pro Desk Place', p: 350 },
    { t: 'tax', n: 'Overstock Tax', sub: 'Pay $100' },
    { t: 'prop', c: 'darkblue', n: 'Appliance Boardwalk', p: 400 },
  ],

  // Starting cash from the Bank, and what a right answer pays.
  start: 500,
  pay: { base: 200, speed: 200 }, // $200 for right, up to +$200 for speed; doubled on double questions
  limit: 20, // seconds per question

  // a = index of the right answer. Facts are from public sources; review before the event.
  quiz: [
    {
      id: 'q1', at: 6, tag: 'WARM-UP',
      q: 'You pass GO. How much does the Bank pay you?',
      opts: ['$100', '$200', '$400', 'A firm handshake'], a: 1,
      fact: '$200 a lap since 1935. Today, every right answer pays you rent, and rent buys prizes at the end.',
    },
    {
      id: 'q2', at: 13, tag: 'LOOK CLOSER',
      q: 'Mr. Monopoly has NEVER had one of these. Which one?',
      opts: ['Top hat', 'Mustache', 'Cane', 'Monocle'], a: 3,
      fact: 'No monocle, ever. Millions of people remember one anyway, a famous "Mandela effect". (You may be thinking of Mr. Peanut.)',
    },
    {
      id: 'q3', at: 22, tag: 'CHANCE', double: true,
      q: 'In 2017, fans voted a classic token off the board. Which one?',
      opts: ['Thimble', 'Top hat', 'Race car', 'Scottie dog'], a: 0,
      fact: 'The thimble went (with the boot and the wheelbarrow). In came the T-rex, the rubber duck and the penguin.',
    },
    {
      id: 'q4', at: 31, tag: 'ORANGE HISTORY',
      q: 'The Home Depot opened its first two stores, in Atlanta, in which year?',
      opts: ['1969', '1979', '1989', '1999'], a: 1,
      fact: '1979. Bernie Marcus and Arthur Blank (with Ken Langone and Pat Farrah) started with 2 stores. Today: 2,300+.',
    },
    {
      id: 'q5', at: 37, tag: 'REAL ESTATE',
      q: 'About how big is an average Home Depot store, not counting the garden center?',
      opts: ['35,000 sq ft', '105,000 sq ft', '250,000 sq ft', '1,000,000 sq ft'], a: 1,
      fact: 'About 104,000 sq ft indoors, plus roughly 24,000 sq ft of garden. That is a lot of hotels.',
    },
    {
      id: 'q6', at: 39, tag: 'BOARDWALK', double: true,
      q: 'Monopoly began as "The Landlord\'s Game" (Lizzie Magie, 1904). What was it designed to do?',
      opts: ['Teach kids to save money', 'Show how land monopolies hurt tenants', 'Train real estate agents', 'Advertise Atlantic City hotels'], a: 1,
      fact: 'Magie built it as a warning about landlords hoarding land. Players loved bankrupting each other anyway.',
    },
  ],

  // Prize lots for the auction. The presenter can rename them in the Menu on the day.
  prizes: ['Mystery Prize #1', 'Mystery Prize #2', 'Mystery Prize #3'],
  bidSeconds: 25,

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

  // Bingo squares. Each phone gets its own shuffle of these, plus two squares
  // built from the player's own deed answers. Centre square is Free Parking.
  bingo: [
    '"Synergy"', '"Can you see my screen?"', '"You\'re on mute"', 'A pet or kid cameo on Teams', 'Slide with way too much text',
    '"Let\'s circle back"', 'Applause for a promotion', 'Mic feedback squeal', '"Next slide, please"', 'Someone joins late',
    'Chart with an arrow going up', '"Let\'s take it offline"', 'Acronym nobody explains', '"Headwinds"', 'Token lands on Chance',
    'Most of the room misses a question', 'Sad trombone plays', 'Confetti on the big screen', '"Orange-blooded"', '"Quick update"',
    'Meeting runs over time', '"Double-click on that"', 'Someone thanks the team', 'Free food is mentioned', 'A bid over $1,000',
    '"Low-hanging fruit"', '"Move the needle"', 'Someone says "Q4"', 'A pun gets a groan', 'Tech issue with the screen share',
    'Someone shouts "Bingo!" (not you)', '"Customer first"',
  ],

  tokens: ['🎩', '🏎️', '🐕', '🐈', '🚢', '👢', '🦖', '🦆', '🐧', '🧵', '🛞', '💰', '🏠', '🏨', '🔨', '🎲'],
};
