// POLL POSITION -- QUESTION FILE
// This is the only file you need to edit to change the game.
// Rules for editing:
//   - Keep every quote mark, comma and bracket exactly where it is.
//   - Each answer is ["Answer text", points]. Put the most popular answer first.
//   - mult is the round multiplier: 1 = normal, 2 = double points, 3 = triple points.
//   - If the game shows "question file problem" after an edit, undo your last change.
//   - To use apostrophes inside text, just type them: "You're on mute" is fine.
//   - Do not put a double quote mark (") inside a question or an answer.
window.GAME = {
  title: "Poll Position",
  subtitle: "The office survey showdown",
  teams: ["Team One", "Team Two"],
  lightningTarget: 200,

  // MAIN ROUNDS. Play them in order, or pick any round from the host screen.
  rounds: [
    { id: "r01", mult: 1, q: "Name something people do on a video call when they think their camera is off.",
      a: [["Eat", 31], ["Check their phone", 22], ["Roll their eyes", 14], ["Leave the room", 11], ["Fall asleep", 9], ["Talk to a pet", 7], ["Fix their hair", 4]] },
    { id: "r02", mult: 1, q: "Name a phrase you hear in almost every meeting.",
      a: [["You're on mute", 36], ["Can everyone see my screen?", 21], ["Let's take this offline", 16], ["Let's circle back", 12], ["Quick question", 7], ["Sorry, go ahead", 5]] },
    { id: "r03", mult: 1, q: "Name something in the office fridge that nobody will claim.",
      a: [["Old takeout leftovers", 33], ["Expired milk or creamer", 24], ["A mystery container", 18], ["Condiments", 11], ["Half a birthday cake", 8], ["A very sad salad", 4]] },
    { id: "r04", mult: 1, q: "Name a reason someone is late to the Monday morning meeting.",
      a: [["Traffic", 34], ["Overslept", 27], ["Long coffee line", 15], ["Forgot the meeting existed", 10], ["Could not find parking", 7], ["School drop-off", 5]] },
    { id: "r05", mult: 2, q: "Name something people do to look busy at work.",
      a: [["Type loudly", 29], ["Walk fast holding a laptop", 22], ["Stare hard at a spreadsheet", 18], ["Schedule a meeting", 12], ["Shuffle papers", 9], ["Put on headphones", 6]] },
    { id: "r06", mult: 2, q: "Name something you would find in a coworker's desk drawer.",
      a: [["Snacks", 35], ["Pens that do not work", 20], ["Old cables and chargers", 14], ["Ketchup or sauce packets", 11], ["Sticky notes", 9], ["Spare shoes", 5], ["Headache medicine", 4]] },
    { id: "r07", mult: 3, q: "Name the worst thing to microwave in the office kitchen.",
      a: [["Fish", 47], ["Burnt popcorn", 24], ["Broccoli", 10], ["Eggs", 8], ["Curry", 5], ["Anything with foil", 4]] },

    // SPARE ROUNDS. Use these as replacements or tie-breakers.
    { id: "r08", mult: 1, q: "Name an excuse people give for not replying to an email.",
      a: [["It went to spam", 30], ["I never got it", 22], ["I was in meetings all day", 17], ["I thought I replied", 13], ["I was on vacation", 9], ["My inbox is too full", 6]] },
    { id: "r09", mult: 1, q: "Name something people bring to a potluck when they forgot to cook.",
      a: [["Chips", 33], ["Store-bought cookies", 22], ["Soda", 17], ["Paper plates and napkins", 12], ["Pizza", 8], ["A bag of ice", 5]] },
    { id: "r10", mult: 1, q: "Name something people do when the Wi-Fi goes down at work.",
      a: [["Complain", 27], ["Use their phone hotspot", 23], ["Go get coffee", 18], ["Chat with coworkers", 14], ["Restart the computer", 9], ["Go home", 6]] }
  ],

  // LIGHTNING ROUND. Two sets so you can run it twice or keep one as a backup.
  // Each set must have exactly 5 questions.
  lightning: [
    { name: "Set A", qs: [
      { id: "a1", q: "Name a popular office snack.", a: [["Chips", 28], ["Donuts", 22], ["Candy or chocolate", 18], ["Cookies", 12], ["Fruit", 9], ["Popcorn", 6]] },
      { id: "a2", q: "Name the least productive day of the work week.", a: [["Friday", 52], ["Monday", 31], ["Wednesday", 7], ["Thursday", 4], ["Tuesday", 3]] },
      { id: "a3", q: "Name something people forget to bring to work.", a: [["Lunch", 30], ["Badge", 26], ["Laptop charger", 17], ["Phone", 11], ["Keys", 7], ["Coffee mug", 4]] },
      { id: "a4", q: "Name an animal that would make a terrible coworker.", a: [["Sloth", 26], ["Monkey", 20], ["Skunk", 16], ["Parrot", 13], ["Cat", 11], ["Goat", 6]] },
      { id: "a5", q: "Name a word or phrase that is overused in work emails.", a: [["Synergy", 24], ["Per my last email", 22], ["ASAP", 19], ["Touch base", 13], ["Kindly", 9], ["Alignment", 7]] }
    ] },
    { name: "Set B", qs: [
      { id: "b1", q: "Name a drink that gets people through the workday.", a: [["Coffee", 61], ["Water", 14], ["Energy drink", 10], ["Tea", 8], ["Soda", 5]] },
      { id: "b2", q: "Name something you hate to hear at 4:55 PM on a Friday.", a: [["Got a minute?", 34], ["Quick meeting", 25], ["The system is down", 15], ["I need this today", 14], ["The client is on the phone", 6]] },
      { id: "b3", q: "Name a place people take a work call at home.", a: [["Kitchen", 27], ["Couch", 24], ["Bed", 18], ["Car", 13], ["Closet", 8], ["Bathroom", 6]] },
      { id: "b4", q: "Name something that always breaks right before a big presentation.", a: [["Projector", 29], ["Laptop", 24], ["Wi-Fi", 21], ["Clicker", 11], ["Microphone", 8], ["Printer", 5]] },
      { id: "b5", q: "Name a superpower that would be useful at work.", a: [["Mind reading", 31], ["Stopping time", 24], ["Invisibility", 18], ["Super speed", 13], ["Teleportation", 9], ["Cloning yourself", 4]] }
    ] }
  ]
};
