/* Qourlite live poll -- slide deck. Shared by /poll/ (phones) and /poll/host/ (screen).
   t: title | mc | text | joke | meme | end
   mc:   id, q, o (options), p (index of Pavel's answer, or null)
   text: id, q, hint, p (Pavel's answer string, or null)
   joke: s (setup), pl (punchline)
   meme: art (box|clock|monfri|keyboard|shelf), top, bottom
   ids must be unique and stable: they are the keys votes are stored under. */
var QP_SLIDES = [
  {t:"title", h:"Say it.", sub:"Scan. Tap. Argue later."},

  {t:"mc", id:"tenure", q:"How long have you been at Home Depot?",
    o:["Under a year","1 to 2 years","3 to 5 years","6 to 10 years","11 to 20 years","Over 20 years"], p:0},
  {t:"text", id:"school", q:"Where did you go to school?", hint:"college, trade school or high school", p:"Georgia Tech"},
  {t:"text", id:"major", q:"What did you study? Or what would you study now?", hint:"subject", p:null},

  {t:"joke", s:"I told my boss three companies were after me.", pl:"Gas, electric and water."},

  {t:"mc", id:"cfb", q:"College football. Who do you pull for?",
    o:["Georgia","Florida","Georgia Tech","Alabama","Auburn","Somebody else (say it loud)","I do not watch"], p:2},
  {t:"text", id:"born", q:"Where were you born?", hint:"city or country", p:"Irkutsk, Siberia"},
  {t:"mc", id:"local", q:"Are you from around here?",
    o:["Born and raised","Moved here as a kid","Moved here as an adult","Just got here","Still figuring out where here is"], p:null},

  {t:"meme", art:"box", top:"IF I FITS", bottom:"I SHIPS"},

  {t:"mc", id:"before", q:"What did you do before Home Depot?",
    o:["Retail","Warehouse or logistics","Food service","Military","Office or finance","Student","Something else entirely"], p:4},
  {t:"mc", id:"howhired", q:"How did you end up at Home Depot?",
    o:["A friend referred me","Applied online","Walked in and asked","Started seasonal and stayed","Transferred from another building"], p:null},
  {t:"text", id:"firstjob", q:"Your first job ever.", hint:"job", p:null},

  {t:"joke", s:"I am reading a book about anti-gravity.", pl:"Impossible to put down."},

  {t:"mc", id:"commute", q:"How long is your commute?",
    o:["Under 15 minutes","15 to 30 minutes","30 to 45 minutes","45 minutes to an hour","Over an hour"], p:null},
  {t:"mc", id:"soundtrack", q:"Commute soundtrack.",
    o:["Music","Podcasts","Sports radio","Phone calls","Silence. Blessed silence."], p:null},
  {t:"text", id:"petname", q:"Your pet's name. No pet? Name the pet you would get.", hint:"name", p:"Charlotte"},

  {t:"meme", art:"clock", top:"ME WAITING FOR LUNCH", bottom:"IT IS 11:58"},

  {t:"mc", id:"kids", q:"How many kids?",
    o:["None","One","Two","Three","Four or more","Do pets count?"], p:null},
  {t:"mc", id:"siblings", q:"Siblings?",
    o:["Only child","One","Two","Three","Four or more. Good luck at Thanksgiving."], p:null},
  {t:"text", id:"language", q:"Languages you speak besides English.", hint:"language, or none", p:"Russian"},

  {t:"joke", s:"Why did the scarecrow get promoted?", pl:"He was outstanding in his field."},

  {t:"mc", id:"holiday", q:"Best holiday. Final answer.",
    o:["Christmas","Thanksgiving","Halloween","4th of July","New Year's Eve","My birthday, obviously"], p:null},
  {t:"mc", id:"ffstatus", q:"Fantasy football: where do you stand?",
    o:["Die-hard. Multiple leagues.","One league, very serious","Used to play, retired","Never, but curious","What is fantasy football"], p:null},
  {t:"mc", id:"ffleague", q:"If this team started a fantasy league this season...",
    o:["Draft me. Today.","Yes, if there is a trophy","Maybe. Depends on the buy-in.","I will commission it","No. I have a life."], p:null},
  {t:"text", id:"nfl", q:"Your NFL team. Be honest.", hint:"team name", p:null},

  {t:"meme", art:"monfri", top:"MONDAY RON", bottom:"FRIDAY RON"},

  {t:"mc", id:"tv", q:"Best TV show of all time.",
    o:["The Office","Breaking Bad","Friends","Game of Thrones","The Sopranos","Seinfeld","Something better (say it out loud)"], p:null},
  {t:"text", id:"country", q:"Furthest country you have ever traveled to.", hint:"country", p:null},
  {t:"mc", id:"hobby", q:"Your weekends, mostly.",
    o:["Outdoors","Gaming","Cooking","Gym or sports","DIY and projects","Music","Kids' schedules"], p:null},
  {t:"text", id:"dreamjob", q:"What did you want to be when you were a kid?", hint:"job", p:null},

  {t:"joke", s:"What is orange and sounds like a parrot?", pl:"A carrot."},

  {t:"mc", id:"phone", q:"iPhone or Android?",
    o:["iPhone","Android","Flip phone, on purpose","Whatever was free"], p:null},
  {t:"mc", id:"pineapple", q:"Pineapple on pizza.",
    o:["Yes","No","Only when nobody is looking","I am not answering this under oath"], p:null},
  {t:"text", id:"talent", q:"Your hidden talent.", hint:"two or three words", p:null},
  {t:"mc", id:"paveltrue", q:"Which of these is TRUE about Pavel?",
    o:["Born in Siberia","Rowed in college","His dog has Chick-fil-A status","All of the above"], p:3},

  {t:"meme", art:"keyboard", top:"RON HAS SUBMITTED", bottom:"THE END OF SHIFT REPORT"},

  {t:"text", id:"game", q:"Greatest video game of all time.", hint:"game title", p:"Diablo 2"},
  {t:"mc", id:"event", q:"Next team event should be...",
    o:["Bowling","Trivia night","Cookout","Topgolf","Escape room","Fantasy draft party"], p:null},
  {t:"text", id:"team", q:"This team, in one word.", hint:"one word", p:null},

  {t:"joke", s:"I only know 25 letters of the alphabet.", pl:"I do not know Y."},

  {t:"meme", art:"shelf", top:"QUALITY CONTROL", bottom:"HAS ENTERED THE CHAT"},

  {t:"mc", id:"rate", q:"Rate this poll.",
    o:["10 out of 10","Fine","Pavel tried","Bring back the cat game"], p:null},

  {t:"end", h:"Thanks.", sub:"The cat game and trivia are still open. Top of each board eats free."}
];
