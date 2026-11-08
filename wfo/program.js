/* WFO All Hands, November 9, 2026: the live activities. Shared by the phone page and the presenter screen. */
window.WFO = {
  room: 'wfo-1109',
  short: 'qourlite.xyz/wfo',
  acts: [
    { id: 'debate', label: 'Warm-up debate', kind: 'multi', title: 'Settle it: three friendly debates', sub: 'No wrong answers. You can change your pick.',
      qs: [
        { q: 'What is the best way to eat Thanksgiving leftovers?', opts: ['The next-day sandwich', 'Cold pie for breakfast', 'Reheated full plate', 'Leftovers are overrated'] },
        { q: 'What is the worst holiday chore?', opts: ['Untangling the lights', 'Dishes after the big meal', 'Holiday traffic', 'Wrapping gifts'] },
        { q: 'Which meeting phrase should be banned in 2027?', opts: ['"Let\'s circle back"', '"Per my last email"', '"Can everyone see my screen?"', '"You\'re on mute"'] },
      ] },
    { id: 'vision', label: 'Your 2027 answer', kind: 'text', title: 'It is December 2027, and we are looking back on our best year.', q: 'What did this team do that you are proudest of?',
      sub: 'One or two sentences. Anonymous: no name is collected. Keep names and anything confidential out. Up to three answers.',
      cats: ['How we grew', 'How we served', 'How we transformed', 'How we stuck together'] },
    { id: 'hh', label: 'Happy hour vote', kind: 'multi', title: 'Team happy hour: pick a day and a place', sub: 'Everyone is welcome. Non-alcoholic options available.',
      qs: [
        { q: 'Which day?', opts: ['Wed, Dec 2, after the volunteer event (about 4:30 PM)', 'Thu, Dec 3, after the holiday party (about 4:30 PM)', 'Another evening that week'] },
        { q: 'Which place?', opts: ["Laseter's Tavern, Vinings: closest, cheap drinks, pool tables", 'Taco Mac Cumberland: all-day drink specials', "Varner's Tavern, Smyrna: pool and darts", 'Viking Alchemist Meadery, Smyrna'] },
      ] },
    { id: 'real', label: 'Make it real', kind: 'single', title: 'Which part of our 2027 story do we make real first?', sub: 'The top theme goes on the next All Hands agenda.', opts: [] },
  ],
};
