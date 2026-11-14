// REPLY ALL -- QUESTION FILE
// This is the only file you need to edit to change the game's content.
// Rules for editing:
//   - Keep every quote mark, comma and bracket exactly where it is.
//   - Each answer is ["Answer text", points]. Put the most popular answer first.
//   - mult is the round multiplier: 1 = normal, 2 = double, 3 = triple.
//   - If the game shows "question file problem" after an edit, undo your last change.
//   - Apostrophes are fine: "Let's take that offline". Do not put a double quote (") inside any text.
window.GAME = {
  title: "REPLY ALL",
  subtitle: "The all-hands survey showdown",
  tagline: "This meeting could not have been an email",
  teams: ["Team Synergy", "Team Bandwidth"],
  lightningTarget: 200,

  // MAIN ROUNDS. Play them in order, or pick any round from the host screen.
  rounds: [
    { id: "r01", mult: 1, q: "Translate 'per my last email' into what you really meant.",
      a: [["Can you read?", 34], ["I already told you this", 25], ["Scroll down", 15], ["I have receipts", 11], ["Do not make me say it again", 8], ["I am telling your boss", 5]] },
    { id: "r02", mult: 1, q: "If the office printer could talk, what would it say?",
      a: [["Paper jam. Again.", 33], ["No.", 24], ["Feed me toner", 16], ["I only break when you are late", 12], ["Have you tried turning me off?", 8], ["I have seen things", 5]] },
    { id: "r03", mult: 1, q: "Name a reason to fake a frozen screen on a video call.",
      a: [["Someone asked you a question", 35], ["You need a snack", 21], ["The meeting hit hour two", 16], ["You are still in pajamas", 12], ["Someone said 'any volunteers?'", 10], ["Your kid walked in", 4]] },
    { id: "r04", mult: 1, q: "Name something that is 'a quick five-minute call' but never is.",
      a: [["A status update", 30], ["Anything with tech support", 23], ["A brainstorm", 16], ["A call with the boss", 13], ["A project kickoff", 9], ["Anything that starts with small talk", 6]] },
    { id: "r05", mult: 2, q: "Name something people say in a meeting that really means 'I was not listening.'",
      a: [["Can you repeat the question?", 36], ["I agree with what they said", 22], ["Sorry, I was on mute", 15], ["Great point", 11], ["Let's take that offline", 9], ["Can you put that in an email?", 5]] },
    { id: "r06", mult: 2, q: "Name something in the office fridge that has been there longer than you have.",
      a: [["A mystery container", 32], ["Salad dressing", 22], ["Somebody's birthday cake", 16], ["One lonely yogurt", 13], ["Hot sauce", 9], ["A lunch labeled DO NOT TOUCH", 6]] },
    { id: "r07", mult: 3, q: "Name the real reason someone schedules a meeting at 4:30 on a Friday.",
      a: [["They forgot it was Friday", 31], ["Pure evil", 26], ["Their boss made them", 17], ["It was the only open slot", 12], ["They think it will be short", 8], ["Different time zone", 6]] },

    // SPARE ROUNDS. Use these as replacements or tie-breakers.
    { id: "r08", mult: 1, q: "Name something you do right after hitting 'reply all' by accident.",
      a: [["Panic", 38], ["Apologize to everyone", 22], ["Try to recall the email", 17], ["Pretend it was on purpose", 11], ["Blame autocorrect", 7], ["Update your resume", 5]] },
    { id: "r09", mult: 1, q: "Name something the office microwave has been through.",
      a: [["Fish", 36], ["Burnt popcorn", 27], ["A soup explosion", 15], ["A fork", 10], ["A nine-minute frozen dinner", 8], ["A line of twelve people", 4]] },
    { id: "r10", mult: 1, q: "Name a way to look busy when the boss walks by.",
      a: [["Type furiously", 31], ["Open a spreadsheet", 24], ["Pick up the phone", 16], ["Walk fast with a laptop", 13], ["Frown at the screen", 10], ["Sigh loudly", 6]] }
  ],

  // FINAL ROUND ("The 4:59 Friday Rush"). Two sets. Each set must have exactly 5 questions.
  lightning: [
    { name: "Set A", qs: [
      { id: "a1", q: "Name a snack that vanishes from the break room in under a minute.", a: [["Donuts", 41], ["Pizza", 24], ["Cookies", 14], ["Bagels", 10], ["Candy", 7], ["Free anything", 4]] },
      { id: "a2", q: "Name a word that should be banned from work emails.", a: [["Synergy", 26], ["ASAP", 21], ["Circle back", 18], ["Kindly", 13], ["Bandwidth", 12], ["Leverage", 10]] },
      { id: "a3", q: "Name an animal that would be the worst coworker.", a: [["Sloth", 27], ["Skunk", 21], ["Parrot", 17], ["Monkey", 14], ["Goose", 12], ["Cat", 9]] },
      { id: "a4", q: "Name the most dangerous day to set a deadline.", a: [["Friday", 44], ["Monday", 33], ["The day before vacation", 12], ["Wednesday", 6], ["Thursday", 5]] },
      { id: "a5", q: "Name something people pretend to understand at work.", a: [["Spreadsheet formulas", 29], ["The org chart", 22], ["Acronyms", 20], ["The strategy", 14], ["The new software", 10], ["The budget", 5]] }
    ] },
    { name: "Set B", qs: [
      { id: "b1", q: "Name the true fuel of this office.", a: [["Coffee", 58], ["Snacks", 15], ["Deadlines", 11], ["Gossip", 8], ["Energy drinks", 5], ["Fear", 3]] },
      { id: "b2", q: "Name the worst thing to hear at 4:55 on a Friday.", a: [["Got a minute?", 34], ["Quick meeting", 25], ["The system is down", 15], ["I need this today", 14], ["One more thing", 12]] },
      { id: "b3", q: "Name the strangest place you have taken a work call.", a: [["Car", 29], ["Bathroom", 22], ["Closet", 16], ["Grocery store", 14], ["Bed", 11], ["A kid's soccer game", 8]] },
      { id: "b4", q: "Name something that breaks only when you are presenting.", a: [["Projector", 28], ["Screen share", 25], ["Wi-Fi", 21], ["Clicker", 11], ["Microphone", 9], ["Your confidence", 6]] },
      { id: "b5", q: "Name a superpower that would help in meetings.", a: [["Mind reading", 30], ["Invisibility", 24], ["Fast forward", 19], ["Teleportation", 12], ["Muting everyone", 10], ["Staying awake", 5]] }
    ] }
  ],

  // CHIP, THE AI INTERN. Lines Chip says when there is no internet, or when no answer was typed.
  // Add, remove or rewrite lines freely. Keep them short.
  chip: {
    hello: ["Hi. I am Chip, the AI intern. I was told there would be snacks.", "Welcome, everyone. Attendance is mandatory. Fun is strongly encouraged.", "I have reviewed the agenda. It is one item. The item is winning."],
    round: ["New agenda item. Please hold your questions until never.", "Moving on. I have a hard stop at fun o'clock.", "Next item. Somebody take notes. Not me, I am an intern."],
    top: ["Number one answer. Somebody promote this person.", "Top of the board. That is what we call a quick win.", "Nailed it. I am adding that to your performance review.", "The number one answer. Synergy achieved."],
    good: ["It is on the board. Low-hanging fruit, successfully picked.", "Approved. No further sign-off required.", "Correct. I will loop in the team.", "That tracks. Great alignment, everyone.", "On the board. Let's not overthink it."],
    strike: ["That answer has been escalated to nobody.", "Bold. Wrong, but bold.", "Let's put a pin in that. Forever.", "I checked with the team. The team said no.", "Thank you for your input. It was input.", "That could have been an email. A short one. Saying no."],
    takeover: ["Hostile takeover time. Legal has been notified.", "The other team smells weakness. And budget."],
    stolen: ["Takeover complete. The budget has a new owner.", "Stolen. That is just business."],
    kept: ["Takeover denied. Please return to your cubicles.", "The budget stays put. Nice try."],
    award: ["Budget approved.", "Funds transferred. Spend it wisely. You will not."],
    win: ["Congratulations. Your reward is more work.", "Winners, please see me about your certificate. Losers, please see me."]
  }
};
