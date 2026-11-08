/* WFO All Hands, November 9, 2026: the live activities. Shared by the phone page and the presenter screen. */
window.WFO = {
  room: 'wfo-1109',
  short: 'qourlite.xyz/wfo',
  acts: [
    { id: 'debate', label: 'Warm-up debate', kind: 'multi', title: 'Settle it: three friendly debates', sub: 'No wrong answers. You can change your pick.',
      qs: [
        { q: 'What is the best Thanksgiving food?', opts: ['Turkey', 'Stuffing', 'Mashed potatoes and gravy', 'Pie'] },
        { q: 'When can holiday decorations go up?', opts: ['Before Halloween', 'The day after Halloween', 'After Thanksgiving', 'December 1 or later'] },
        { q: 'What is the best holiday movie?', opts: ['Elf', 'Home Alone', 'Die Hard', 'Christmas Vacation'] },
      ] },
    { id: 'vision', label: 'Your 2027 answer', kind: 'text', title: 'It is December 2027, and we are looking back on our best year.', q: 'What did this team do that you are proudest of?',
      sub: 'One or two sentences. Anonymous: no name is collected. Keep names and anything confidential out. Up to three answers.',
      cats: ['How we grew', 'How we served', 'How we transformed', 'How we stuck together'] },
    { id: 'voa', label: 'VOA poll', kind: 'single', title: 'Which of these would you sign up for first?', sub: 'Then we take two minutes of open discussion.',
      opts: ['Pitch a speaker', 'Shape the social group', 'Own your development'] },
    { id: 'hh', label: 'Happy hour vote', kind: 'single', title: 'Team happy hour: which works best?', sub: 'Everyone is welcome. Non-alcoholic options available.',
      opts: ['Wed, Dec 2, after the volunteer event (about 5:00 PM)', 'Thu, Dec 3, after the holiday party (about 4:30 PM)', 'Another evening that week'] },
    { id: 'real', label: 'Make it real', kind: 'single', title: 'Which part of our 2027 story do we make real first?', sub: 'The top theme goes on the next All Hands agenda.', opts: [] },
  ],
};
