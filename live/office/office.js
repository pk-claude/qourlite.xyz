/* Threat Level Lunchtime -- The Office trivia contest. Shared by /office/ (phones) and /office/host/ (screen).
   Slide types: title | q | board (final leaderboard).
   q: id, lvl (difficulty label), q, o (options), k (encoded correct index: k=(c+2)*3, c=k/3-2).
   The encoding only stops casual view-source peeking; it is not security.
   ids are the vote keys and must stay stable. */
var QT_SLIDES = [
  {t:"title", h:"Threat level: lunchtime.", sub:"10 Office questions. Hardest at the end. Winner eats free."},

  {t:"q", id:"q1", lvl:"WARM-UP", q:"Everyone in the show works for...",
    o:["Dunder Mifflin","Vance Refrigeration","Sabre","Michael Scott Paper Company"], k:6},
  {t:"q", id:"q2", lvl:"WARM-UP", q:"The branch is in which city?",
    o:["Stamford","Scranton","Utica","Akron"], k:9},
  {t:"q", id:"q3", lvl:"GETTING REAL", q:"Jim's first great prank: what went into the Jell-O?",
    o:["Dwight's calculator","Dwight's mug","Dwight's stapler","Dwight's phone"], k:12},
  {t:"q", id:"q4", lvl:"GETTING REAL", q:"Schrute Farms grows...",
    o:["Turnips","Potatoes","Radishes","Beets"], k:15},
  {t:"q", id:"q5", lvl:"GETTING REAL", q:"Michael's action-movie alter ego is...",
    o:["Prison Mike","Michael Scarn","Goldenface","Agent Cooper"], k:9},
  {t:"q", id:"q6", lvl:"SUPERFAN", q:"Jan's candle company was called...",
    o:["Serenity by Jan","Candles by Jan","Jan's Flames","Scented Serenity"], k:6},
  {t:"q", id:"q7", lvl:"SUPERFAN", q:"The cat Dwight put in the freezer was...",
    o:["Bandit","Garbage","Sprinkles","Princess Lady"], k:12},
  {t:"q", id:"q8", lvl:"SUPERFAN", q:"Kevin plays drums in a Police tribute band called...",
    o:["Here Comes Treble","The Nard Dogs","Kevin and the Keys","Scrantonicity"], k:15},
  {t:"q", id:"q9", lvl:"THREAT LEVEL MIDNIGHT", q:"Creed runs which department?",
    o:["Quality Assurance","Supplier Relations","Customer Service","Accounts Receivable"], k:6},
  {t:"q", id:"q10", lvl:"THREAT LEVEL MIDNIGHT", q:"The building's security guard is named...",
    o:["Frank","Hank","Lonny","Glenn"], k:9},

  {t:"board", h:"That's a wrap.", sub:"Winner eats free. Pavel pays."}
];

var QT = (function(){
  var ROOT = "qo-thd-r7p2";                 /* separate key space from the Say It poll */
  var READ = "https://textdb.online/";
  var WRITE = "https://api.textdb.online/update/";

  function stateKey(){ return ROOT+"-state"; }
  function regKey(s){ return ROOT+"-"+s+"-reg"; }
  function devKey(s,d){ return ROOT+"-"+s+"-"+d; }
  function correct(sl){ return sl.k/3-2; }

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

  return {ROOT:ROOT,stateKey:stateKey,regKey:regKey,devKey:devKey,correct:correct,rid:rid,get:get,put:put,cleanName:cleanName};
})();
