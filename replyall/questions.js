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
  finalStakes: "200 points and the whole room wins",

  // THE SHOW: rounds 1 to 3, then the live "You said" round (triple), then the final.
  // Round 4 is the backup triple round if phones are not working.
  // Rounds 5 to 10 are spares for swaps and tie-breakers.
  rounds: [
    { id: "r01", mult: 1, q: "Name something a coworker does that instantly makes your day better.",
      a: [["Brings food", 34, "snacks, donuts, treats, lunch, candy, cake", "The fastest way to a promotion in my book."], ["Says thank you", 21, "appreciation, compliment, praise, kind words"], ["Makes you laugh", 17, "jokes, funny, memes"],
          ["Cancels the meeting", 12, "ends the meeting early", "The greatest gift one coworker can give another."], ["Helps with your work", 10, "covers for you, fixes it, answers a question"], ["Makes the coffee", 6, "coffee run, brings coffee"]] },
    { id: "r02", mult: 1, q: "Name something at work that takes 'two minutes' but never does.",
      a: [["A computer update", 28, "restart, reboot, install", "Do not turn off your computer. Or your hopes."], ["Joining the video call", 22, "logging in, audio, camera, password"], ["The printer", 18, "printing, scanning, copying"],
          ["A quick question", 14, "quick chat, got a minute, quick call"], ["Finding a meeting room", 10, "booking a room, conference room"], ["An expense report", 8, "expenses, timesheet, forms"]] },
    { id: "r03", mult: 2, q: "Besides your real job, name a job you somehow ended up doing at work.",
      a: [["Tech support", 30, "IT, fixing computers, help desk, printer fixer", "Have you tried turning the team off and on again?"], ["Therapist", 22, "listener, counselor, shoulder to cry on"], ["Party planner", 16, "events, birthdays, potluck, celebrations"],
          ["Snack supplier", 13, "candy bowl, baker, feeds everyone"], ["Human calendar", 11, "reminders, scheduler, knows the deadlines"], ["Plant waterer", 8, "plants, office gardener"]] },
    { id: "r04", mult: 3, q: "Name a sound that means it is going to be a good day at work.",
      a: [["Coffee brewing", 32, "coffee machine, espresso, kettle"], ["People laughing", 22, "laughter, laughing down the hall"], ["A 'canceled' ping", 16, "meeting canceled notification, calendar ping", "Music. Pure music."],
          ["A pizza box opening", 13, "food arriving, lunch delivery, donut box"], ["Your favorite song", 10, "music, playlist, headphones, radio"], ["Laptops closing at five", 7, "laptop shutting, end of day, packing up"]] },

    // SPARE ROUNDS
    { id: "r05", mult: 1, q: "If the office printer could talk, what would it say?",
      a: [["Paper jam", 36, "jammed, stuck"], ["No", 22, "nope, not today, I refuse"], ["Feed me", 16, "toner, paper, ink, low on"], ["Try again", 12, "error, retry, please wait"], ["Help me", 8, "I am tired, I need a break"], ["Turn me off and on", 6, "restart me, unplug me"]] },
    { id: "r06", mult: 1, q: "Name something you would put in the office time capsule.",
      a: [["The good stapler", 26, "stapler"], ["A sticky note", 21, "post-it, notepad"], ["A coffee mug", 18, "mug, cup"], ["A badge or lanyard", 14, "ID, lanyard, badge"], ["The mystery cable", 12, "charger, cord, cable"], ["That fridge yogurt", 9, "old lunch, leftovers", "It was already a time capsule."]] },
    { id: "r07", mult: 1, q: "Name something people say in a meeting that really means 'I was not listening.'",
      a: [["Can you repeat that?", 38, "say that again, repeat the question"], ["I agree", 22, "what they said, same, sounds good"], ["Sorry, I was on mute", 16, "mute"], ["Great point", 12, "good point, interesting"], ["Let's take it offline", 8, "circle back, follow up later"], ["No questions", 4, "nothing from me, all good"]] },
    { id: "r08", mult: 1, q: "Name the real hero of the break room.",
      a: [["The coffee machine", 39, "coffee, coffee maker"], ["The microwave", 21, "microwave"], ["Whoever brings donuts", 17, "donut person, snack bringer, baker"], ["The fridge", 11, "refrigerator"], ["Whoever cleans up", 7, "refills, wipes, takes out trash"], ["The vending machine", 5, "vending, snack machine"]] },
    { id: "r09", mult: 1, q: "Name a way to celebrate hitting a big deadline.",
      a: [["Go home early", 27, "leave early, day off"], ["Team lunch", 24, "food, pizza, eat, dinner"], ["Take a nap", 17, "sleep, rest"], ["Happy dance", 13, "dance, cheer, high five"], ["Tell everyone", 10, "brag, announce, email the team"], ["Start the next one", 9, "more work, next project", "Somebody check on this person."]] },
    { id: "r10", mult: 1, q: "Name something the office microwave has been through.",
      a: [["Fish", 36, "seafood, salmon, tuna", "HR has entered the chat."], ["Burnt popcorn", 27, "popcorn"], ["A soup explosion", 15, "splatter, spill, exploded"], ["A fork", 10, "metal, foil, sparks"], ["A very long line", 7, "queue, waiting"], ["Leftover curry", 5, "curry, leftovers, strong smells"]] }
  ],

  // "YOU SAID" ROUND. The audience answers one of these on their phones, live,
  // and the board is built from what this room actually said. Keep them answerable in one or two words.
  room: [
    "In one or two words: what should our team mascot be?",
    "In one or two words: your go-to lunch order?",
    "One word that describes this team.",
    "In one or two words: what would you rename the Monday meeting?"
  ],

  // FINAL ROUND ("The 4:59 Friday Rush"). Two sets. Each set must have exactly 5 questions.
  lightning: [
    { name: "Set A", qs: [
      { id: "a1", q: "Name a snack that vanishes from the break room in under a minute.", a: [["Donuts", 41], ["Pizza", 24], ["Cookies", 14], ["Bagels", 10], ["Candy", 7], ["Free anything", 4]] },
      { id: "a2", q: "Name a word that should be banned from work emails.", a: [["Synergy", 26], ["ASAP", 21], ["Circle back", 18], ["Kindly", 13], ["Bandwidth", 12], ["Leverage", 10]] },
      { id: "a3", q: "Name an animal that would be the most fun coworker.", a: [["Dog", 38], ["Monkey", 19], ["Parrot", 15], ["Otter", 11], ["Penguin", 10], ["Cat", 7]] },
      { id: "a4", q: "Name the best day of the work week.", a: [["Friday", 58], ["Thursday", 17], ["Payday", 12], ["Wednesday", 8], ["Monday", 5]] },
      { id: "a5", q: "Name something people pretend to understand at work.", a: [["Spreadsheet formulas", 29], ["The org chart", 22], ["Acronyms", 20], ["The strategy", 14], ["The new software", 10], ["The budget", 5]] }
    ] },
    { name: "Set B", qs: [
      { id: "b1", q: "Name the true fuel of this office.", a: [["Coffee", 58], ["Snacks", 15], ["Teamwork", 11], ["Deadlines", 8], ["Energy drinks", 5], ["Gossip", 3]] },
      { id: "b2", q: "Name the best thing to hear at 4:55 on a Friday.", a: [["Go home early", 36], ["See you Monday", 22], ["It can wait", 18], ["Great job this week", 14], ["Meeting canceled", 10]] },
      { id: "b3", q: "Name the strangest place you have taken a work call.", a: [["Car", 29], ["Bathroom", 22], ["Closet", 16], ["Grocery store", 14], ["Bed", 11], ["A kid's soccer game", 8]] },
      { id: "b4", q: "Name something that breaks only when you are presenting.", a: [["Projector", 28], ["Screen share", 25], ["Wi-Fi", 21], ["Clicker", 11], ["Microphone", 9], ["Laptop battery", 6]] },
      { id: "b5", q: "Name a superpower that would help in meetings.", a: [["Mind reading", 30], ["Invisibility", 24], ["Fast forward", 19], ["Teleportation", 12], ["Muting everyone", 10], ["Staying awake", 5]] }
    ] }
  ],

  // CHIP, THE AI INTERN. Chip picks a line from the matching list and never repeats one until the list runs out.
  // Add, remove or rewrite lines freely. Keep them short and kind.
  chip: {
    hello: ["Hi. I am Chip, the AI intern. I was told there would be snacks.", "Welcome, everyone. Attendance is mandatory. Fun is strongly encouraged.", "I have reviewed the agenda. It is one item. The item is winning.", "Hello. I will be taking notes. I will also be losing them."],
    round: ["New agenda item. Please hold your questions until never.", "Moving on. I have a hard stop at fun o'clock.", "Next item. Somebody take notes. Not me, I am an intern.", "Round incoming. Hydrate accordingly.", "New item. This one counts. They all count. This one counts more.", "Next up. I have a good feeling. I am not qualified to have feelings."],
    top: ["Number one answer. Somebody promote this person.", "Top of the board. That is what we call a quick win.", "Nailed it. I am adding that to your performance review.", "The number one answer. Synergy achieved.", "Number one. I would high five you, but I have no hands.", "Top answer. Frame it. Put it in the lobby.", "First place answer. This team has range.", "That is the big one. Somebody ring a bell.", "Number one. I am telling everyone I know. It is three people.", "Top answer. You have peaked. Enjoy it."],
    good: ["It is on the board. Low-hanging fruit, successfully picked.", "Approved. No further sign-off required.", "Correct. I will loop in the team.", "That tracks. Great alignment, everyone.", "On the board. Let's not overthink it.", "Yes. Filing that under wins.", "Good answer. Adding it to the slide deck.", "Confirmed. The data agrees with you.", "On the board. Somebody is paying attention.", "Solid. That is a deliverable.", "Correct. Morale is up two percent.", "That works. Ship it."],
    strike: ["Bold. Wrong, but bold.", "Let's put a pin in that. Forever.", "I checked with the team. The team said no.", "Thank you for your input. It was input.", "Not on the board. Great energy, though.", "That one is going in the parking lot.", "I love the confidence. The board does not.", "Close. In the sense that it was also words.", "I will add that to my list of action items.", "The survey has spoken. It said no thank you.", "Nice try. I am rooting for you quietly.", "Not this time. We learn. We grow.", "I asked the board twice. Still no.", "That answer is ahead of its time."],
    takeover: ["Hostile takeover time. Legal has been notified.", "The other team smells opportunity. And budget.", "Three strikes. The other side would like a word.", "Takeover attempt. Everyone act natural."],
    stolen: ["Takeover complete. The budget has a new owner.", "Stolen. That is just business.", "And just like that, the budget changes desks."],
    kept: ["Takeover denied. Please return to your seats.", "The budget stays put. Nice try.", "Defense holds. Somebody get them a trophy. A small one."],
    award: ["Budget approved.", "Funds transferred. Spend it on snacks.", "Approved. Finance has left the chat.", "Budget released. No receipts required."],
    sweep: ["A clean sweep. I did not know that was allowed.", "Every answer. Show-offs. I mean that warmly.", "The whole board. Give this team a conference room named after them."],
    rest: ["Here is what the board was hiding.", "Let's see what got away."],
    survey: ["Phones out. This round, the answers come from you.", "Your turn, audience. No pressure. Some pressure."],
    win: ["Congratulations. Your reward is this certificate and my respect.", "Winners, see me about your certificate. Everyone else, see me about cake.", "What a game. I laughed. I cried. I am a rectangle."]
  }
};
