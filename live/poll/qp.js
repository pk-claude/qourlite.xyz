/* Qourlite live poll -- shared config + textdb helpers (phones and host). */
var QP = (function(){
  var ROOT = "qp-thd-k3m9";                 // key prefix on textdb.online
  var READ = "https://textdb.online/";
  var WRITE = "https://api.textdb.online/update/";

  function stateKey(){ return ROOT+"-state"; }
  function regKey(s){ return ROOT+"-"+s+"-reg"; }
  function devKey(s,d){ return ROOT+"-"+s+"-"+d; }

  function rid(n){ var a="abcdefghjkmnpqrstuvwxyz23456789",o=""; for(var i=0;i<n;i++)o+=a[Math.floor(Math.random()*a.length)]; return o; }

  /* GET key -> parsed JSON or null (missing/invalid). Rejects only on network failure. */
  function get(key){
    return fetch(READ+key+"?_="+Date.now(),{cache:"no-store"}).then(function(r){
      if(!r.ok) throw new Error("http "+r.status);
      return r.text();
    }).then(function(t){ t=(t||"").trim(); if(!t) return null; try{ return JSON.parse(t); }catch(e){ return null; } });
  }
  /* POST key=value. Resolves true on textdb status 1, false otherwise. Never rejects. */
  function put(key,obj){
    var body="key="+encodeURIComponent(key)+"&value="+encodeURIComponent(JSON.stringify(obj));
    return fetch(WRITE,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body})
      .then(function(r){ return r.json(); }).then(function(j){ return !!(j&&j.status===1); })["catch"](function(){ return false; });
  }

  /* Free-text hygiene: trim, collapse spaces, cap length, strip tags, mask a short blocklist. */
  var BAD=["fuck","shit","bitch","asshole","dick","cunt","pussy","nigg","fag","retard","whore","slut","cock","twat","bastard"];
  function clean(s){
    s=String(s||"").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,28);
    var low=s.toLowerCase();
    for(var i=0;i<BAD.length;i++){ if(low.indexOf(BAD[i])>=0) return ""; }
    return s;
  }
  function norm(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim(); }

  function slideById(id){ for(var i=0;i<QP_SLIDES.length;i++){ if(QP_SLIDES[i].id===id) return QP_SLIDES[i]; } return null; }

  return {ROOT:ROOT,stateKey:stateKey,regKey:regKey,devKey:devKey,rid:rid,get:get,put:put,clean:clean,norm:norm,slideById:slideById};
})();
