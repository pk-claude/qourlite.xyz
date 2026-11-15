// REPLY ALL -- QUESTION FILE
// This is the only file you need to edit to change the game's content.
// Rules for editing:
//   - Keep every quote mark, comma and bracket exactly where it is.
//   - Each answer is ["Answer text", points, "other words to accept", "optional line for Chip"].
//     Only the first two are required. Put the most popular answer first.
//     "Other words to accept" is shown only to the scorekeeper, to make judging easy.
//   - mult is the round multiplier: 1 = normal, 2 = double, 3 = triple.
//   - If the game shows "question file problem" after an edit, undo your last change.
//   - Apostrophes are fine: "Let's take it offline". Do not put a double quote (") inside any text.
window.GAME = {
  title: "REPLY ALL",
  subtitle: "The all-hands survey showdown",
  tagline: "This meeting could not have been an email",
  teams: ["Team Synergy", "Team Bandwidth"],
  lightningTarget: 200,
  finalStakes: "200 points and the whole room wins. No action items.",

  // THE SHOW: rounds 1 to 3, then the live "You said" round (triple), then the final.
  // Round 4 is the backup triple round if phones are not working.
  // Rounds 5 to 10 are spares for swaps and tie-breakers.
  rounds: [
    { id: "r01", mult: 1, q: "Name something people write in a work email that really means 'I am furious.'",
      a: [["Per my last email", 36, "as I said, as stated, as mentioned, as previously noted, see below", "Translation: I have receipts. They are attached."], ["Just following up", 20, "follow up, bumping this, gentle reminder, friendly reminder, checking in"], ["As discussed", 14, "per our conversation, as agreed, as we talked about"],
          ["Thanks in advance", 12, "thanks, thank you, regards, best, kindly", "The thanks is a deadline wearing a nice hat."], ["Going forward", 9, "in future, next time, moving forward, for future reference"], ["CC'ing your manager", 9, "cc, copying, looping in, adding your boss", "That is not a CC. That is a witness."]] },
    { id: "r02", mult: 1, q: "Name something people are really doing when their camera is off.",
      a: [["Eating", 26, "lunch, breakfast, snacking, cooking, making food", "Camera off, crunch on. We can all hear the chips."], ["Still in bed", 21, "sleeping, napping, lying down, pajamas, not dressed"], ["Laundry", 17, "chores, dishes, cleaning, vacuuming, folding"],
          ["Scrolling their phone", 15, "phone, texting, social media, shopping, videos"], ["Their actual job", 12, "working, emails, other work, another meeting, multitasking", "Working during a meeting. A bold productivity hack."], ["Walking the dog", 9, "outside, driving, errands, walking, gym"]] },
    { id: "r03", mult: 2, q: "Name a meeting that should have been an email.",
      a: [["The weekly status update", 30, "status, weekly, check-in, team meeting, update", "Status: unchanged. See you next week."], ["The all-hands", 20, "town hall, company meeting, all hands", "I feel attacked. This all-hands is load-bearing."], ["The meeting about the meeting", 17, "pre-meeting, prep, planning meeting, alignment, debrief"],
          ["The daily stand-up", 14, "standup, daily, scrum, huddle", "Everyone is standing. Nobody is up."], ["The brainstorm", 10, "ideation, workshop, blue sky, kickoff"], ["All of them", 9, "every meeting, this one, any"]] },
    { id: "r04", mult: 3, q: "Name something a boss says that means your weekend is in danger.",
      a: [["Got a minute?", 30, "quick chat, do you have a sec, can we talk, quick call, quick question", "It is never a minute. I have run the numbers."], ["One small favor", 21, "quick favor, tiny ask, small thing, can you help"], ["The client called", 16, "client, customer, urgent request, something came up"],
          ["By Monday", 15, "deadline, end of day, EOD, ASAP, first thing Monday", "By Monday is just Sunday with better branding."], ["Are you around Saturday?", 10, "weekend plans, are you free, around this weekend"], ["No pressure, but", 8, "no rush, when you get a chance, only if you have time", "There was pressure. I measured it."]] },

    // SPARE ROUNDS
    { id: "r05", mult: 1, q: "If the office printer could talk, what would it say?",
      a: [["Paper jam", 34, "jammed, stuck", "It has been jammed since the last reorg."], ["No", 22, "nope, not today, I refuse, error"], ["Feed me toner", 15, "toner, paper, ink, low on, cyan"], ["Try the other printer", 12, "use another one, not my job, go upstairs"], ["I only work for IT", 9, "works when IT comes, fine when tech arrives", "Classic. Performs only when observed."], ["I quit", 8, "help me, I am tired, I need a break, unplug me"]] },
    { id: "r06", mult: 1, q: "Name something people do to look busy at work.",
      a: [["Walk fast with a laptop", 27, "walk around, carry papers, carry a laptop, rush, pace", "Destination unknown. Urgency: maximum."], ["Type loudly", 22, "typing, keyboard, clicking"], ["Sigh at the screen", 15, "sigh, frown, stare at screen, look stressed"], ["Book a meeting with themselves", 14, "block calendar, fake meeting, focus time, full calendar", "Attendance was perfect. No decisions were made."], ["Keep the status dot green", 13, "wiggle the mouse, stay active, online status, jiggle"], ["Send an email at 11 p.m.", 9, "late email, scheduled send, weekend email"]] },
    { id: "r07", mult: 1, q: "Name something people say in a meeting that really means 'I was not listening.'",
      a: [["Can you repeat that?", 36, "say that again, repeat the question, sorry what, come again"], ["I agree", 22, "what they said, same, sounds good, plus one", "With what? Nobody knows. Not even them."], ["Sorry, I was on mute", 16, "mute, bad connection, you cut out, froze"], ["Great point", 12, "good point, interesting, love that"], ["Let's take it offline", 9, "circle back, follow up later, park that", "Offline is where questions go to retire."], ["Nothing from me", 5, "no questions, all good, I am fine"]] },
    { id: "r08", mult: 1, q: "Name something in the shared fridge that has been there since the last reorg.",
      a: [["A mystery container", 32, "tupperware, leftovers, unlabeled box, old lunch", "It has outlasted three managers."], ["Yogurt", 20, "expired yogurt, dairy"], ["Condiments", 16, "ketchup, mustard, mayo, salad dressing, hot sauce, sauce"], ["Milk", 13, "creamer, oat milk, cream", "It is cheese now. It has earned a new title."], ["A lunch with a name on it", 10, "labeled lunch, sandwich, someone's lunch, do not touch"], ["Birthday cake", 9, "cake, half a cake, leftover cake, cupcakes"]] },
    { id: "r09", mult: 1, q: "Name something people say at the end of a meeting that keeps everyone 15 more minutes.",
      a: [["One more thing", 34, "one last thing, just one thing, real quick", "It was not one thing. It was a whole agenda."], ["Quick question", 24, "question, can I ask, just curious"], ["Can you go back a slide?", 14, "previous slide, go back, scroll up"], ["Before we wrap up", 12, "before we go, before we end, while I have you"], ["Anything else from anyone?", 9, "any other business, any questions, anyone else"], ["Sorry, I joined late", 7, "what did I miss, can you recap, catch me up", "Great. A rerun. I love reruns."]] },
    { id: "r10", mult: 1, q: "Name something in an open-plan office you can hear from across the floor.",
      a: [["A call on speakerphone", 30, "speaker, loud call, video call, no headphones, meeting", "Thank you for sharing. With the entire building."], ["Angry typing", 20, "typing, keyboard, loud keyboard, clicking"], ["Someone's lunch", 16, "chewing, crunching, eating, chips, apple, slurping"], ["A personal phone call", 14, "dentist, doctor, family call, private call, arguing", "We all know about the dentist now. Good luck."], ["Dramatic sighing", 11, "sigh, groaning, muttering, complaining"], ["The microwave beeping", 9, "microwave, popcorn, beeping, coffee machine"]] }
  ],

  // "YOU SAID" ROUND. The audience answers one of these on their phones, live,
  // and the board is built from what this room actually said. Keep them answerable in one or two words.
  room: [
    "In one or two words: translate 'per my last email'.",
    "In one or two words: what does 'let's circle back' really mean?",
    "In one or two words: rename the Monday morning meeting.",
    "One word that should be banned from every meeting."
  ],

  // FINAL ROUND ("The 4:59 Friday Rush"). Two sets. Each set must have exactly 5 questions.
  lightning: [
    { name: "Set A", qs: [
      { id: "a1", q: "Name a piece of office jargon that should be banned.", a: [["Synergy", 27], ["Circle back", 22], ["Bandwidth", 15], ["Low-hanging fruit", 13], ["Touch base", 12], ["Move the needle", 11]] },
      { id: "a2", q: "Name something that gets said on every video call.", a: [["You're on mute", 42], ["Can you hear me?", 22], ["Can you see my screen?", 16], ["Sorry, go ahead", 10], ["I have a hard stop", 6], ["Bye, bye, bye", 4]] },
      { id: "a3", q: "Name something free that gets people to show up to any meeting.", a: [["Pizza", 38], ["Donuts", 22], ["Coffee", 16], ["Cake", 10], ["A T-shirt", 9], ["Leaving early", 5]] },
      { id: "a4", q: "Name the worst possible time for a meeting.", a: [["Friday afternoon", 36], ["Monday morning", 26], ["Lunchtime", 18], ["8 a.m.", 10], ["5 p.m.", 6], ["Any time", 4]] },
      { id: "a5", q: "Name something that gets blamed when work is late.", a: [["The other team", 26], ["The system", 22], ["A lost email", 17], ["Too many meetings", 14], ["The client", 12], ["The Wi-Fi", 9]] }
    ] },
    { name: "Set B", qs: [
      { id: "b1", q: "Name something everyone at work pretends to have read.", a: [["The pre-read", 27], ["The policy", 21], ["The long email", 20], ["The handbook", 14], ["The meeting notes", 11], ["The strategy deck", 7]] },
      { id: "b2", q: "Name a chat status that really means 'leave me alone.'", a: [["In a meeting", 30], ["Do not disturb", 24], ["Focus time", 18], ["Away", 12], ["Out sick", 9], ["Presenting", 7]] },
      { id: "b3", q: "Name something that breaks only when you are presenting.", a: [["Screen share", 30], ["Wi-Fi", 24], ["Projector", 18], ["Clicker", 11], ["Microphone", 10], ["The demo", 7]] },
      { id: "b4", q: "Name something in every out-of-office reply.", a: [["Limited email access", 34], ["A return date", 26], ["Ask someone else", 18], ["On vacation", 12], ["Sorry for the delay", 6], ["A palm tree", 4]] },
      { id: "b5", q: "Name something a reorg always changes.", a: [["Your boss", 34], ["The org chart", 22], ["The team name", 16], ["Your desk", 12], ["Job titles", 10], ["Nothing", 6]] }
    ] }
  ],

  // CHIP, THE AI INTERN. Chip picks a line from the matching list and never repeats one until the list runs out.
  // Add, remove or rewrite lines freely. Keep them short and kind.
  chip: {
    hello: ["Hi. I am Chip, the AI intern. I was told there would be snacks.", "Welcome. This meeting is mandatory. So is the fun. I checked.", "I have reviewed the agenda. It is one item. The item is winning.", "Hello. I will be taking notes. I will also be losing them.", "Hope this game finds you well. If not, please reply all.", "Thanks for joining. You are all on mute. I prefer it."],
    round: ["New agenda item. Please hold your questions until never.", "Moving on. I have a hard stop at fun o'clock.", "Next item. Somebody take notes. Not me, I am an intern.", "Let's double-click on the next one. I do not have a mouse.", "Next slide, please. I have always wanted to say that.", "New item. Per my last round, points still matter."],
    top: ["Number one answer. Somebody promote this person.", "Top of the board. That moved the needle. I watched it move.", "Nailed it. I am adding that to your performance review.", "Number one. Synergy achieved. I do not know what that means.", "Number one. I would high five you, but I have no hands.", "Top answer. Exceeds expectations. Raise not included.", "Top answer. Please update your profile to thought leader.", "Number one. Put it in the all-hands deck. Slide one.", "Number one. I am telling everyone I know. It is three people.", "Top answer. You have peaked. Enjoy it.", "Best in class. I have notified the class.", "Number one. That is a key result. Possibly the only one."],
    good: ["On the board. Low-hanging fruit, picked. Where is the fruit?", "Approved. No further sign-off required.", "Correct. Looping in the team. I cannot find the loop.", "That tracks. Great alignment, everyone.", "Nice. Adding it to the slide deck. Slide 94.", "Confirmed. The data agrees with you.", "Solid. That is a deliverable.", "Correct. Morale is up two percent.", "That works. Ship it.", "On the board. Meets expectations. That is the highest praise.", "Yes. I will circle back to congratulate you. Circling now.", "Valid. You clearly have the bandwidth.", "Logged as a quick win. It was quick. It was a win."],
    strike: ["Bold. Wrong, but bold.", "Let's put a pin in that. Forever.", "I checked with the team. The team said no.", "Thank you for your input. It was input.", "That goes in the parking lot. It is a very full parking lot.", "I love the confidence. The board does not.", "Close. In the sense that it was also words.", "Let's take that answer offline. And leave it there.", "Per my last board, no.", "Noted as an action item. Nobody will action it.", "Not on the board. Have you tried turning it off and on?", "That answer is out of office with limited access to points.", "We do not have the bandwidth for that answer.", "Great energy. Wrong deliverable."],
    takeover: ["Hostile takeover time. Legal has been notified.", "The other team smells opportunity. And budget.", "Three strikes. The other side would like a quick sync.", "Takeover attempt. Everyone act natural.", "This item has been reassigned. Effective immediately."],
    stolen: ["Takeover complete. The budget has a new owner.", "Stolen. They are calling it a strategic realignment.", "And just like that, the budget changes desks.", "Reorg complete. Your points report to them now."],
    kept: ["Takeover denied. Please return to your seats.", "The budget stays put. Nice try.", "Defense holds. Somebody get them a trophy. A small one.", "Request declined. Please resubmit never."],
    award: ["Budget approved.", "Funds transferred. Spend it on snacks.", "Approved. Finance has left the chat.", "Budget released. No receipts required.", "Points allocated. Expense report waived. Just this once."],
    sweep: ["A clean sweep. I did not know that was allowed.", "Every answer. Show-offs. I mean that warmly.", "The whole board. Name a conference room after this team.", "All of them. One hundred percent of OKRs. That never happens."],
    rest: ["Here is what the board was hiding.", "Let's see what got away.", "Now the answers nobody had the bandwidth for.", "Full transparency. This is what you missed."],
    survey: ["Phones out. This round, the answers come from you.", "Your turn, audience. No pressure. Some pressure.", "Phones out. Yes, in a meeting. I am as shocked as you are.", "This is your one approved reply all. Use it wisely."],
    win: ["Congratulations. Your reward is this certificate and my respect.", "Winners, see me about your certificate. Everyone else, cake.", "What a game. I laughed. I cried. I am a rectangle.", "Meeting adjourned. This one could not have been an email."]
  }
};
