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
    { t: 'prop', c: 'yellow', n: 'Yard Truck Row', p: 260 },
    { t: 'prop', c: 'yellow', n: 'AMR Alley', p: 260 },
    { t: 'util', n: 'Robot Charging Dock', p: 150 },
    { t: 'prop', c: 'yellow', n: 'Pack Station', p: 280 },
    { t: 'corner', n: 'Go to Damage Cage', sub: 'Unscanned pallet' },
    { t: 'prop', c: 'green', n: 'Recycling Boulevard', p: 300 },
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

  // One question per section of the November 2026 all-hands, asked as the transition into that section.
  // Six rolls make one full lap: 8 + 8 + 6 + 4 + 5 + 9 = 40 spaces, so the last roll lands back on GO.
  // `at` is the space the token lands on, `dice` the two dice shown. a = index of the right answer.
  // Facts come from the November 2026 AHM deck.
  quiz: [
    {
      id: 'q1', section: 'HR Update', at: 8, dice: [3, 5], tag: 'HR UPDATE',
      q: '2027 benefits enrollment is open now. What is happening to medical rates for 2027?',
      opts: ['Up about 5%', 'Staying flat', 'Down about 3%', 'Paid in Monopoly money'], a: 1,
      fact: 'Medical rates stay flat for 2027. Enroll Nov. 5-19 at livetheorangelife.com; benefits start Jan. 1.',
    },
    {
      id: 'q2', section: 'VOA Update', at: 16, dice: [4, 4], tag: 'VOA UPDATE',
      q: 'How many events has our SC Ops VOA team facilitated?',
      opts: ['5+', '12+', '30+', '100+'], a: 2,
      fact: '30+ events, and 1,850 student readiness kits packed. Next up: Factor II: Results (Nov 18) and Fall Trivia (Nov 24).',
    },
    {
      id: 'q3', section: 'Guest Speaker: SBD', at: 22, dice: [2, 4], tag: 'CHANCE', double: true,
      q: 'Our guest speaker, Stephen Frankiewicz, leads SBD. What does SBD stand for?',
      opts: ['Strategic Business Development', 'Supply-chain Big Data', 'Store Bulk Delivery', 'Shipping, Boxing & Distribution'], a: 0,
      fact: 'Strategic Business Development. Over to Stephen Frankiewicz, Sr. Manager.',
    },
    {
      id: 'q4', section: 'HD Yard Driver & EV', at: 26, dice: [1, 3], tag: 'YARD DRIVER & EV',
      q: 'Our electric yard-truck pilot at the Ontario and Redlands RDCs: projected savings vs. diesel over 7 years?',
      opts: ['$900K', '$3.5 million', '$9.0 million', '$25 million'], a: 2,
      fact: '$9.0M projected over 7 years at both sites. All 3 vendors passed (Kalmar Ottawa, Tesla Semi, Orange EV). Next: Sacramento FDC.',
    },
    {
      id: 'q5', section: 'Drywall Recycling', at: 31, dice: [2, 3], tag: 'RECYCLING',
      q: 'In 2025, how many pounds of material did The Home Depot recycle?',
      opts: ['4.5 million', '45 million', '454 million', '4.5 billion'], a: 2,
      fact: '454M lbs across 164 locations: 36,750 truckloads worth $63M. The FDC drywall pilot in Baltimore cut waste 27%.',
    },
    {
      id: 'q6', section: 'Final Thoughts', at: 0, dice: [6, 3], tag: 'BACK TO GO', double: true,
      q: 'Fill in our team mission: "Run Today. ______ Tomorrow."',
      opts: ['Win', 'Reinvent', 'Own', 'Rest'], a: 1,
      fact: '"Our job is to run today while reinventing tomorrow." - Joanna Kronberg',
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
