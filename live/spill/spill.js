/* Spill It -- get-to-know-you storytelling game. Shared by /spill/ (phones) and /spill/host/ (screen).
   Slide types: title | rules | q | board.
   q: id (vote key, keep stable), q, o (options; "Plead the 5th" is appended at render time as index o.length),
      p (leading prompts for the storyteller).
   Stages per q: 0 ASK, 1 REVEAL, 2 SPOTLIGHT. No points. */
var QS_PLEADS = [
  "Plead the 5th -- I have a family",
  "Plead the 5th -- HR is at this lunch",
  "Plead the 5th -- my lawyer is on line 2",
  "Plead the 5th -- ask me after two coffees",
  "Plead the 5th -- that's a happy-hour story",
  "Plead the 5th -- next question, please",
  "Plead the 5th -- I was never there"
];

var QS_SLIDES = [
  {t:"title", h:"Spill it.", sub:"12 questions. No points. The room picks the topic, the screen picks the storyteller."},
  {t:"rules", h:"House rules."},

  {t:"q", id:"q1", q:"What sport did you play in high school?",
    o:["Football","Basketball","Baseball / softball","Soccer","Track, cross-country or swim","Band or theater was my sport","I was in the parking lot"],
    p:["What position, and were you any good?","Best or worst coach quote you still remember?","Did it end with a trophy or an injury?"]},
  {t:"q", id:"q2", q:"What brand was your high school backpack?",
    o:["JanSport","L.L.Bean","Eastpak","The North Face","No-name from Walmart or Target","Didn't carry one. Books in the arms."],
    p:["What was in it that should not have been?","Did it have a name written on it, and whose?","How many years did it survive?"]},
  {t:"q", id:"q3", q:"Your biggest driving sin:",
    o:["Speeding","Tailgating","Phone at red lights","Full-volume car concerts","Narrating other drivers' mistakes out loud","I am a flawless driver (a lie)"],
    p:["Worst ticket you ever got?","What do your passengers say about you?","Ever been pulled over with a story that worked?"]},
  {t:"q", id:"q4", q:"At age 10 you were going to be a...",
    o:["Pro athlete","Doctor or vet","Astronaut or scientist","Famous -- singer, actor, whatever","Cop, firefighter, or military","Rich, details TBD"],
    p:["When did the dream die, and who killed it?","Is any piece of it still alive?","What would 10-year-old you say about this job?"]},
  {t:"q", id:"q5", q:"Your guilty-pleasure TV:",
    o:["Reality dating shows","True crime","Cartoons meant for children","Soap operas / telenovelas","The same sitcom on repeat, forever","Home reno shows (yes, at Home Depot)"],
    p:["Name the show. Out loud.","Who in your life knows about this?","Defend it in one sentence."]},

  {t:"board", h:"Roll call.", sub:"Who has talked, who has answered, who has lawyered up."},

  {t:"q", id:"q6", q:"Karaoke: your genre is...",
    o:["80s power ballad","Country","Hip-hop","Boy band / pop","Rock anthem","I would rather resign"],
    p:["Name the song.","Where and when was your last performance?","Did anyone film it?"]},
  {t:"q", id:"q7", q:"Your most irrational fear:",
    o:["Spiders and bugs","Heights","Public speaking","Clowns or dolls","Deep or open water","Being called on in this game"],
    p:["Origin story?","Has it ever ruined a vacation or a date?","What is your coping strategy?"]},
  {t:"q", id:"q8", q:"What was your first job?",
    o:["Fast food","Retail, not orange","Home Depot -- orange from day one","Lifeguard / camp / babysitting","Lawn, farm, or construction","The family business"],
    p:["How much did it pay?","How did it end -- promotion, quitting, or \"we need to talk\"?","One thing it taught you that you still use."]},
  {t:"q", id:"q9", q:"Your relationship with cooking:",
    o:["Chef level","Can follow a recipe","Grill only","Microwave engineer","DoorDash knows my gate code","I cook; nobody eats it"],
    p:["Signature dish?","Biggest kitchen disaster?","Who is the real cook in your house?"]},
  {t:"q", id:"q10", q:"Weirdest thing you've eaten on purpose:",
    o:["Insects","Organ meats","Something still moving","Gas station sushi","Something you hunted or caught yourself","Nothing weirder than sushi"],
    p:["Where were you and who dared you?","Would you do it again?","Rate it 1 to 10."]},

  {t:"board", h:"Roll call.", sub:"Two to go. Then the bench, if there's time."},

  {t:"q", id:"q11", q:"Your hidden talent:",
    o:["Musical instrument","Sing or dance","Athletic party trick","Art, craft, or building things","Weird body thing (double-jointed, ear wiggle)","Freakish memory or trivia"],
    p:["Can you demo it? Right now?","How did you discover it?","Has it ever been useful?"]},
  {t:"q", id:"q12", q:"Your sleep situation:",
    o:["Up before 5 by choice","Up before 5 by force (kids, dogs, DC shift)","Night owl -- mornings are violence","Professional napper","Sleep is for the weak","Asleep by 9 and proud"],
    p:["What does the first hour of your day look like?","What time do you actually send your first email?","Best nap location you have ever found?"]},

  {t:"board", h:"Time check.", sub:"That's the 12. Screen has 8 more on the bench if lunch allows."},

  {t:"q", id:"q13", q:"Have you ever broken a bone?",
    o:["Yes -- doing something dumb","Yes -- doing something athletic","Yes -- someone else's fault","Never, made of steel","Not a bone, but I've got a scar with a story"],
    p:["Tell us the dumb thing.","Who had to drive you?","What did the doctor say?"]},
  {t:"q", id:"q14", q:"The first concert you ever went to was...",
    o:["Country","Pop / boy band","Rock or metal","Hip-hop or R&B","Something your parents picked","Never been to one"],
    p:["Who took you?","How old were you?","Would you put it on LinkedIn?"]},
  {t:"q", id:"q15", q:"Your meeting alter ego:",
    o:["Camera on, engaged, a model employee","Camera off, doing dishes","Muted and multitasking","The 4:59 question asker","The chat-window comedian","Drops off at \"any other questions\""],
    p:["Confess a specific meeting.","Most useful thing you've done during a meeting that wasn't the meeting?","Has anyone ever caught you?"]},
  {t:"q", id:"q16", q:"Something you've done that would surprise this room:",
    o:["Skydived or bungee jumped","Lived in another country","Met someone famous","Been on TV or in the news","Won a real competition","Finished a marathon or triathlon"],
    p:["Tell it.","What did people say when you told them the first time?","Would you do it again?"]},
  {t:"q", id:"q17", q:"Your pet situation:",
    o:["Dog person","Cat person","Reptiles, fish, or something weird","Farm animals","No pets, and that's on purpose","My kids are the pets"],
    p:["Name and worst behavior.","Does it have a job in your household?","Who does it actually love?"]},
  {t:"q", id:"q18", q:"You grew up...",
    o:["Big city","Suburbs","Small town where everybody knows your business","Rural / farm","Military kid, moved constantly","Another country"],
    p:["One thing about growing up there this room would not understand.","What did you do for fun at 15?","Do you miss it?"]},
  {t:"q", id:"q19", q:"The last thing you Googled that you'd rather not explain:",
    o:["How to fix something I broke","A celebrity's age or net worth","How to do part of my own job","Something a coworker said","Whether a food was still safe to eat","A conspiracy theory, for research"],
    p:["Go on.","What was the answer?","Did it help?"]},
  {t:"q", id:"q20", q:"Your worst haircut era:",
    o:["Mullet","Frosted tips or bleach","Bowl cut","Perm","Rat tail","The 2020 home cut"],
    p:["Is there a photo?","Who allowed this?","How long did it last?"]},

  {t:"board", h:"That's a wrap.", sub:"What's said at lunch stays at lunch. Mostly."}
];

var QS = (function(){
  var ROOT = "qs-thd-m4x7";                 /* separate key space from Say It and the Office contest */
  var READ = "https://textdb.online/";
  var WRITE = "https://api.textdb.online/update/";

  function stateKey(){ return ROOT+"-state"; }
  function regKey(s){ return ROOT+"-"+s+"-reg"; }
  function devKey(s,d){ return ROOT+"-"+s+"-"+d; }
  function plead(sl){ return sl.o.length; }                       /* index of the Plead the 5th option */
  function pleadLabel(sl){ var n=parseInt(String(sl.id).slice(1),10)||0; return QS_PLEADS[(n-1)%QS_PLEADS.length]; }
  function qIndex(){ var ids=[]; for(var i=0;i<QS_SLIDES.length;i++){ if(QS_SLIDES[i].id) ids.push(QS_SLIDES[i].id); } return ids; }

  function rid(n){ var a="abcdefghjkmnpqrstuvwxyz23456789",o=""; for(var i=0;i<n;i++)o+=a[Math.floor(Math.random()*a.length)]; return o; }

  function get(key){
    return fetch(READ+key+"?_="+Date.now(),{cache:"no-store"}).then(function(r){
      if(!r.ok) throw new Error("http "+r.status);
      return r.text();
    }).then(function(t){ t=(t||"").trim(); if(!t) return null; try{ return JSON.parse(t); }catch(e){ return null; } });
  }
  function put(key,obj){
    var body="key="+encodeURIComponent(key)+"&value="+encodeURIComponent(JSON.stringify(obj));
    return fetch(WRITE,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body})
      .then(function(r){ return r.json(); }).then(function(j){ return !!(j&&j.status===1); })["catch"](function(){ return false; });
  }

  var BAD=["fuck","shit","bitch","asshole","dick","cunt","pussy","nigg","fag","retard","whore","slut","cock","twat","bastard"];
  function cleanName(s){
    s=String(s||"").replace(/<[^>]*>/g,"").replace(/[^A-Za-z0-9 .'-]/g,"").replace(/\s+/g," ").trim().slice(0,14);
    var low=s.toLowerCase();
    for(var i=0;i<BAD.length;i++){ if(low.indexOf(BAD[i])>=0) return ""; }
    return s;
  }

  return {ROOT:ROOT,stateKey:stateKey,regKey:regKey,devKey:devKey,plead:plead,pleadLabel:pleadLabel,qIndex:qIndex,rid:rid,get:get,put:put,cleanName:cleanName};
})();
