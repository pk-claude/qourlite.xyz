// REPLY ALL office interruptions: full-screen gags the host can fire at any moment.
// This file wires itself up on the audience screen. It listens for {gag: '<id>', gseq: <number>} on the 'replyall'
// broadcast channel and on window messages, and draws into its own overlay. Nothing here touches the game state.
// On the host page (window.GAGS_NO_LISTEN = true) it only provides the list for the menu.
(function () {
  'use strict';
  var LIST = [
    {id: 'restart', label: 'IT forced restart', hint: 'Installing updates. Stuck at 99%.', ms: 6400},
    {id: 'mute', label: "You're on mute", hint: 'Nobody heard any of that.', ms: 5200},
    {id: 'badge', label: 'Badge declined', hint: 'Access denied. See facilities.', ms: 5400},
    {id: 'conflict', label: 'Calendar conflict', hint: 'Two meetings collide. Double-booked.', ms: 5600},
    {id: 'storm', label: 'Reply-all storm', hint: 'Dozens of "please remove me" emails.', ms: 6200},
    {id: 'reorg', label: 'Surprise reorg', hint: 'Team names spin. Nothing changes.', ms: 7000},
    {id: 'training', label: 'Mandatory training', hint: 'Module 1 of 47: Breathing at your desk.', ms: 6400},
    {id: 'wifi', label: 'Wifi down', hint: 'Buffering wheel over everything.', ms: 5600}
  ];
  var BY = {}; LIST.forEach(function (g) { BY[g.id] = g; });
  var api = {list: LIST.map(function (g) { return {id: g.id, label: g.label, hint: g.hint}; }), play: function () { return false; }, playing: function () { return null; }};
  window.GAGS = api;
  if (window.GAGS_NO_LISTEN) return;

  var CSS = [
    '#gags{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;display:none;font-family:var(--body,"Archivo","Segoe UI",Arial,sans-serif);color:#fff8ea;--gd:var(--disp,"Archivo Black","Arial Black",Impact,sans-serif);--gm:var(--mono,"JetBrains Mono",Consolas,monospace)}',
    '#gags.on{display:block;animation:ggin .28s ease-out}',
    '#gags.out{animation:ggout .4s ease-in forwards}',
    '#gags *{box-sizing:border-box}',
    '@keyframes ggin{from{opacity:0;transform:scale(1.04)}}',
    '@keyframes ggout{to{opacity:0;transform:scale(.97)}}',
    '@keyframes ggpop{0%{transform:scale(.2);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}',
    '@keyframes ggup{from{transform:translateY(22cqh);opacity:0}to{transform:none;opacity:1}}',
    '@keyframes ggspin{to{transform:rotate(360deg)}}',
    '@keyframes ggblink{50%{opacity:.15}}',
    '@keyframes ggshake{0%,100%{transform:none}15%{transform:translate(-1.2cqw,.6cqh) rotate(-.6deg)}30%{transform:translate(1cqw,-.8cqh) rotate(.5deg)}45%{transform:translate(-.8cqw,.5cqh)}60%{transform:translate(.6cqw,-.3cqh)}80%{transform:translate(-.3cqw,.2cqh)}}',
    '@keyframes ggstamp{0%{transform:rotate(-9deg) scale(4);opacity:0}55%{transform:rotate(-9deg) scale(.92);opacity:1}75%{transform:rotate(-9deg) scale(1.06)}100%{transform:rotate(-9deg) scale(1);opacity:1}}',
    '.gg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}',
    '.gg-mono{font-family:var(--gm);text-transform:uppercase;letter-spacing:.14em}',
    '.gg-stamp{position:absolute;left:50%;top:50%;margin:-9cqh 0 0 -30cqw;width:60cqw;font-family:var(--gd);font-size:6.6cqw;line-height:1;color:#e5263a;border:1.1cqw solid #e5263a;border-radius:2cqw;padding:2.4cqh 1cqw;background:#0a0a1f;box-shadow:0 0 0 .5cqw rgba(229,38,58,.25),0 2cqh 6cqw rgba(0,0,0,.6);opacity:0;animation:ggstamp .5s forwards cubic-bezier(.3,1.3,.5,1)}',
    // Chip, the AI intern, with a line
    '.gg-chip{position:absolute;left:50%;bottom:4cqh;transform:translateX(-50%);display:flex;align-items:center;gap:1.2cqw;max-width:86cqw}',
    '.gg-chip>div{display:flex;align-items:center;gap:1.2cqw;animation:ggup .5s backwards cubic-bezier(.3,1.5,.5,1)}',
    '.gg-bot{flex:none;position:relative;width:6cqw;height:5cqw;border-radius:1.2cqw;background:#2de2e6;border:.35cqw solid #0a0a1f;box-shadow:0 .6cqh 0 rgba(0,0,0,.35)}',
    '.gg-bot:before{content:"";position:absolute;left:50%;top:-1.9cqw;width:.4cqw;height:1.6cqw;margin-left:-.2cqw;background:#0a0a1f;border-radius:.2cqw;box-shadow:0 -.5cqw 0 .35cqw #ff3d8b}',
    '.gg-bot i{position:absolute;top:1.2cqw;width:1cqw;height:1.3cqw;border-radius:50%;background:#0a0a1f;animation:ggeye 2.4s infinite}',
    '.gg-bot i:first-child{left:1.2cqw}.gg-bot i+i{right:1.2cqw}',
    '.gg-bot u{position:absolute;left:50%;bottom:.8cqw;width:2cqw;height:.9cqw;margin-left:-1cqw;border:.3cqw solid #0a0a1f;border-top:0;border-radius:0 0 1.2cqw 1.2cqw}',
    '@keyframes ggeye{0%,92%,100%{transform:none}95%{transform:scaleY(.1)}}',
    '.gg-say{background:#fff8ea;color:#0a0a1f;border:.35cqw solid #0a0a1f;border-radius:1.6cqw;padding:1.6cqh 2cqw;font-size:2.5cqw;font-weight:800;line-height:1.15;text-align:left;box-shadow:.5cqw .7cqh 0 #6c4cff}',
    '.gg-say small{display:block;font:800 1.05cqw var(--gm);letter-spacing:.16em;text-transform:uppercase;color:#6c4cff;margin-bottom:.3cqh}',

    // 1. IT forced restart
    '.g-restart{background:#0f5fd0;font-family:"Segoe UI",var(--body,Arial),sans-serif;font-weight:300}',
    '.g-restart .ring{position:relative;width:9cqw;height:9cqw;animation:ggspin 1.5s linear infinite;margin-bottom:5cqh}',
    '.g-restart .ring i{position:absolute;left:50%;top:50%;width:1.1cqw;height:1.1cqw;margin:-.55cqw;border-radius:50%;background:#fff}',
    '.g-restart h1{font-size:4.2cqw;font-weight:300;margin:0}',
    '.g-restart .pct{font-size:10cqw;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}',
    '.g-restart .pct.stuck{animation:ggstuck .5s 3}',
    '@keyframes ggstuck{30%{transform:translateX(-.5cqw)}70%{transform:translateX(.5cqw)}}',
    '.g-restart p{font-size:2.4cqw;margin:1cqh 0 0;opacity:.92;min-height:3.4cqw}',
    '.g-restart .bar{width:54cqw;height:1.4cqh;background:rgba(255,255,255,.22);border-radius:9cqh;margin-top:3cqh;overflow:hidden}',
    '.g-restart .bar b{display:block;height:100%;width:0;background:#fff;border-radius:9cqh;transition:width .5s}',
    '.g-restart .jk{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:#0a0a1f}',
    '.g-restart.done .jk{display:flex}',
    '.g-restart .jk h2{font-family:var(--gd);font-weight:400;font-size:11cqw;margin:0 0 12cqh;line-height:.95;color:#ffe14d;filter:drop-shadow(.5cqw .6cqw 0 #6c4cff);animation:ggpop .45s cubic-bezier(.3,1.5,.5,1)}',

    // 2. You are on mute
    '.g-mute{background:radial-gradient(60cqw 60cqh at 50% 42%,#3a0d18,#0a0a1f 75%)}',
    '.g-mute .mic{position:relative;width:26cqw;height:26cqw;margin-top:-13cqh;border-radius:50%;background:#e5263a;box-shadow:0 0 0 0 rgba(229,38,58,.7);animation:ggpop .4s cubic-bezier(.3,1.5,.5,1),ggmring 1s .4s infinite}',
    '@keyframes ggmring{0%{box-shadow:0 0 0 0 rgba(229,38,58,.75)}100%{box-shadow:0 0 0 7cqw rgba(229,38,58,0)}}',
    '.g-mute .mic i{position:absolute;left:50%;top:17%;width:26%;height:42%;margin-left:-13%;border-radius:9cqw;background:#fff}',
    '.g-mute .mic u{position:absolute;left:50%;top:36%;width:46%;height:34%;margin-left:-23%;border:1.1cqw solid #fff;border-top:0;border-radius:0 0 12cqw 12cqw}',
    '.g-mute .mic b{position:absolute;left:50%;top:70%;width:1.1cqw;height:11%;margin-left:-.55cqw;background:#fff}',
    '.g-mute .mic b:after{content:"";position:absolute;left:50%;bottom:-.9cqw;width:8cqw;height:1.1cqw;margin-left:-4cqw;border-radius:1cqw;background:#fff}',
    '.g-mute .mic s{position:absolute;left:50%;top:50%;width:112%;height:2.2cqw;margin:-1.1cqw 0 0 -56%;background:#fff;border:.5cqw solid #e5263a;border-radius:2cqw;transform:rotate(-45deg);animation:ggslash .3s .35s backwards}',
    '@keyframes ggslash{from{width:0;margin-left:0}}',
    '.g-mute h1{font-family:var(--gd);font-weight:400;font-size:8.6cqw;line-height:1;margin:4cqh 0 0;animation:ggmpulse 1s infinite}',
    '@keyframes ggmpulse{0%,100%{transform:scale(1);color:#fff8ea}50%{transform:scale(1.07);color:#ff6b7a}}',
    '.g-mute .lips{position:absolute;top:7cqh;font:800 1.7cqw var(--gm);letter-spacing:.16em;text-transform:uppercase;color:#ffe14d;animation:ggblink 1s infinite}',

    // 3. Badge reader declined
    '.g-badge{background:#12060a}',
    '.g-badge .wash{position:absolute;inset:0;background:radial-gradient(70cqw 70cqh at 50% 40%,rgba(229,38,58,.55),transparent 70%);animation:ggblink .5s infinite}',
    '.g-badge .beacon{position:absolute;top:0;left:0;right:0;height:2.4cqh;background:repeating-linear-gradient(90deg,#e5263a 0 6cqw,#0a0a1f 6cqw 12cqw);animation:ggslide .6s linear infinite}',
    '.g-badge .beacon.b2{top:auto;bottom:0;animation-direction:reverse}',
    '@keyframes ggslide{to{background-position:12cqw 0}}',
    '.g-badge .row{position:relative;display:flex;align-items:center;gap:5cqw;margin-top:-10cqh}',
    '.g-badge .reader{position:relative;width:20cqw;height:30cqw;border-radius:2cqw;background:linear-gradient(#3a3d4a,#1c1e27);border:.5cqw solid #0a0a1f;box-shadow:0 2cqh 5cqw rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;padding-top:2.4cqw;gap:2cqw}',
    '.g-badge .led{width:3.4cqw;height:3.4cqw;border-radius:50%;background:#ff2a3f;box-shadow:0 0 3cqw 1cqw rgba(255,42,63,.9);animation:ggblink .5s infinite}',
    '.g-badge .lcd{width:15cqw;padding:1cqw .4cqw;border-radius:.6cqw;background:#0b1a10;color:#ff5a68;font:800 1.5cqw/1.25 var(--gm);letter-spacing:.06em;text-transform:uppercase;border:.2cqw solid #000}',
    '.g-badge .waves{width:7cqw;height:7cqw;border-radius:50%;border:.5cqw solid #5b6072;box-shadow:inset 0 0 0 1.3cqw #1c1e27,inset 0 0 0 1.8cqw #5b6072}',
    '.g-badge .card{width:19cqw;height:27cqw;border-radius:1.4cqw;background:#fff8ea;color:#0a0a1f;border:.4cqw solid #0a0a1f;box-shadow:.6cqw .8cqh 0 #6c4cff;padding:1.2cqw;display:flex;flex-direction:column;align-items:center;gap:1cqw;animation:ggswipe 1.2s 3 ease-in-out}',
    '@keyframes ggswipe{0%,100%{transform:translateX(10cqw) rotate(6deg)}40%,55%{transform:translateX(-3.5cqw) rotate(-3deg)}}',
    '.g-badge .card:before{content:"";width:6cqw;height:1cqw;border-radius:1cqw;background:#0a0a1f;opacity:.25}',
    '.g-badge .face{position:relative;width:9cqw;height:9cqw;border-radius:1cqw;background:#d9d6f0;overflow:hidden}',
    '.g-badge .face:before{content:"";position:absolute;left:50%;top:18%;width:38%;height:38%;margin-left:-19%;border-radius:50%;background:#6a6690}',
    '.g-badge .face:after{content:"";position:absolute;left:50%;bottom:-30%;width:76%;height:66%;margin-left:-38%;border-radius:50%;background:#6a6690}',
    '.g-badge .card b{font-family:var(--gd);font-weight:400;font-size:1.9cqw;line-height:1}',
    '.g-badge .card span{font:800 1cqw var(--gm);letter-spacing:.1em;text-transform:uppercase;color:#6a6690}',
    '.g-badge h1{position:relative;font-family:var(--gd);font-weight:400;font-size:8cqw;line-height:1;margin:3cqh 0 0;color:#ff4658;text-shadow:0 0 4cqw rgba(229,38,58,.8);animation:ggpop .4s .5s backwards}',
    '.g-badge p{position:relative;font-size:2.6cqw;font-weight:800;margin:1cqh 0 0;animation:ggup .4s 1.6s backwards}',

    // 4. Calendar conflict
    '.g-conflict{background:#fff8ea;color:#0a0a1f}',
    '.g-conflict .grid{position:absolute;inset:0;background:repeating-linear-gradient(#fff8ea 0 12.3cqh,#d9d3c0 12.3cqh 12.5cqh)}',
    '.g-conflict .hr{position:absolute;left:1.6cqw;font:800 1.5cqw var(--gm);color:#8f8a78;letter-spacing:.08em}',
    '.g-conflict .day{position:absolute;top:2.4cqh;left:0;right:0;font:800 1.7cqw var(--gm);letter-spacing:.16em;text-transform:uppercase;color:#6c4cff}',
    '.g-conflict .shk{position:absolute;inset:0;animation:ggshake .6s 1.25s}',
    '.g-conflict .blk{position:absolute;top:15cqh;width:39cqw;height:42cqh;border-radius:1.6cqw;border:.45cqw solid #0a0a1f;padding:2.2cqh 1.6cqw;text-align:left;color:#fff;box-shadow:0 1.4cqh 0 rgba(10,10,31,.25)}',
    '.g-conflict .blk b{display:block;font-family:var(--gd);font-weight:400;font-size:3.5cqw;line-height:1.02}',
    '.g-conflict .blk span{display:block;font:800 1.5cqw var(--gm);letter-spacing:.08em;margin-top:1.4cqh;text-transform:uppercase}',
    '.g-conflict .a{left:10cqw;background:#6c4cff;animation:ggca 1.25s cubic-bezier(.6,0,.9,.4) backwards,ggcra .5s 1.25s forwards}',
    '.g-conflict .b{right:10cqw;background:#ff3d8b;animation:ggcb 1.25s cubic-bezier(.6,0,.9,.4) backwards,ggcrb .5s 1.25s forwards}',
    '@keyframes ggca{from{transform:translateX(-60cqw)}}',
    '@keyframes ggcb{from{transform:translateX(60cqw)}}',
    '@keyframes ggcra{35%{transform:translateX(-4cqw) rotate(-9deg)}100%{transform:translateX(-1cqw) rotate(-5deg)}}',
    '@keyframes ggcrb{35%{transform:translateX(4cqw) rotate(10deg)}100%{transform:translateX(1cqw) rotate(6deg)}}',
    '.g-conflict .bang{position:absolute;left:50%;top:36cqh;width:26cqw;height:26cqw;margin:-13cqw;background:#ffe14d;clip-path:polygon(50% 0,60% 28%,88% 12%,74% 40%,100% 50%,74% 60%,88% 88%,60% 72%,50% 100%,40% 72%,12% 88%,26% 60%,0 50%,26% 40%,12% 12%,40% 28%);animation:ggbang .7s 1.25s both}',
    '@keyframes ggbang{0%{transform:scale(0) rotate(0);opacity:1}40%{transform:scale(1.5) rotate(20deg);opacity:1}100%{transform:scale(2) rotate(34deg);opacity:0}}',
    '.g-conflict .gg-stamp{top:57cqh;animation-delay:1.9s}',

    // 5. Reply-all storm
    '.g-storm{background:rgba(10,10,31,.9)}',
    '.g-storm .m{position:absolute;width:27cqw;background:#fff;color:#0a0a1f;border-radius:1cqw;border:.25cqw solid #0a0a1f;border-left:.9cqw solid #6c4cff;padding:1.2cqh 1.1cqw;text-align:left;box-shadow:0 1cqh 2.4cqw rgba(0,0,0,.5);animation:ggmail .42s both cubic-bezier(.3,1.4,.5,1)}',
    '@keyframes ggmail{from{transform:translateY(-120cqh) rotate(var(--r0));opacity:1}to{transform:rotate(var(--r));opacity:1}}',
    '.g-storm .m small{display:block;font:800 1cqw var(--gm);letter-spacing:.08em;text-transform:uppercase;color:#6a6690;white-space:nowrap;overflow:hidden}',
    '.g-storm .m b{display:block;font-size:1.9cqw;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.g-storm .m.hot{border-left-color:#e5263a}.g-storm .m.yel{border-left-color:#ffb400}.g-storm .m.pk{border-left-color:#ff3d8b}',
    '.g-storm .cnt{position:absolute;right:2.4cqw;top:2.4cqh;z-index:3;background:#e5263a;color:#fff;border:.4cqw solid #0a0a1f;border-radius:99cqw;padding:1cqh 2cqw;font-family:var(--gd);font-size:3.4cqw;line-height:1;box-shadow:0 1cqh 3cqw rgba(229,38,58,.6);font-variant-numeric:tabular-nums}',
    '.g-storm .cnt small{font:800 1.3cqw var(--gm);letter-spacing:.14em;text-transform:uppercase;margin-right:1cqw;vertical-align:middle}',
    '.g-storm .gg-stamp{z-index:4;top:44cqh;animation-delay:3.3s}',
    '.g-storm .gg-chip{z-index:5}',

    // 6. Surprise reorg
    '.g-reorg{background:linear-gradient(120deg,#6c4cff,#ff3d8b)}',
    '.g-reorg h1{font-family:var(--gd);font-weight:400;font-size:7cqw;line-height:1;margin:-14cqh 0 1cqh;text-shadow:.45cqw .55cqw 0 rgba(10,10,31,.4);animation:ggpop .45s cubic-bezier(.3,1.5,.5,1)}',
    '.g-reorg .sub{font-size:1.7cqw;color:#ffe14d;margin-bottom:3.5cqh}',
    '.g-reorg .reels{display:flex;gap:2.4cqw;align-items:center}',
    '.g-reorg .vs{font-family:var(--gd);font-size:3cqw}',
    '.g-reorg .reel{position:relative;width:38cqw;height:17cqh;overflow:hidden;border-radius:1.6cqw;background:#0a0a1f;border:.5cqw solid #ffe14d;box-shadow:0 1.4cqh 0 rgba(10,10,31,.45),inset 0 0 3cqw rgba(0,0,0,.9)}',
    '.g-reorg .reel:after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(10,10,31,.85),transparent 30%,transparent 70%,rgba(10,10,31,.85))}',
    '.g-reorg .strip{transition:transform var(--t) cubic-bezier(.3,.45,.25,1)}',
    '.g-reorg .strip div{height:17cqh;display:flex;align-items:center;justify-content:center;padding:0 1cqw;font-family:var(--gd);font-size:3cqw;line-height:1.02;color:#fff8ea;overflow:hidden}',
    '.g-reorg .strip div:last-child{color:#ffe14d}',
    '.g-reorg .reel.hit{animation:ggreelhit .35s}',
    '@keyframes ggreelhit{40%{transform:translateY(1.2cqh) scale(1.03)}}',
    '.g-reorg .res{margin-top:4cqh;min-height:15cqh}',
    '.g-reorg .res b{display:block;font-family:var(--gd);font-weight:400;font-size:5.2cqw;line-height:1.05;color:#ffe14d;text-shadow:.35cqw .45cqw 0 rgba(10,10,31,.45);animation:ggpop .45s cubic-bezier(.3,1.5,.5,1)}',
    '.g-reorg .res span{display:block;font-size:2.6cqw;font-weight:800;margin-top:.6cqh;animation:ggup .4s .5s backwards}',

    // 7. Mandatory training
    '.g-training{background:#e9edf3;color:#1d2433;justify-content:flex-start}',
    '.g-training .top{align-self:stretch;display:flex;align-items:center;justify-content:space-between;background:#1f3a5f;color:#fff;padding:1.8cqh 2.4cqw;font:800 1.5cqw var(--gm);letter-spacing:.12em;text-transform:uppercase}',
    '.g-training .top b{background:#e5263a;border-radius:.5cqw;padding:.4cqh 1cqw;animation:ggblink 1s infinite}',
    '.g-training h1{font-size:3.4cqw;font-weight:900;margin:2.6cqh 0 .4cqh}',
    '.g-training h1 em{font-style:normal;color:#1f6fd6}',
    '.g-training .vid{position:relative;width:66cqw;height:60cqh;margin-top:1.6cqh;border-radius:1.2cqw;background:linear-gradient(#bfe3ff,#eaf6ff 62%,#c8b79a 62%);border:.4cqw solid #1d2433;overflow:hidden;box-shadow:0 1.4cqh 3cqw rgba(29,36,51,.25)}',
    '.g-training .desk{position:absolute;left:14%;right:14%;top:62%;height:3.2%;background:#7a5a36;border-radius:.4cqw}',
    '.g-training .screen{position:absolute;right:21%;top:38%;width:17%;height:22%;background:#1d2433;border-radius:.6cqw;border:.3cqw solid #4a556b}',
    '.g-training .screen:after{content:"";position:absolute;left:44%;bottom:-22%;width:12%;height:22%;background:#4a556b}',
    '.g-training .head{position:absolute;left:33%;top:14%;width:8.6cqw;height:8.6cqw;margin-left:-4.3cqw;border-radius:50%;background:#ffcf8b;border:.35cqw solid #1d2433}',
    '.g-training .head:before,.g-training .head:after{content:"";position:absolute;top:38%;width:.9cqw;height:.9cqw;border-radius:50%;background:#1d2433}',
    '.g-training .head:before{left:26%}.g-training .head:after{right:26%}',
    '.g-training .head i{position:absolute;left:50%;top:64%;width:1.6cqw;height:1.6cqw;margin-left:-.8cqw;border-radius:50%;background:#1d2433;animation:ggmouth 2s ease-in-out infinite}',
    '@keyframes ggmouth{0%,100%{transform:scale(.35)}45%,55%{transform:scale(1.15)}}',
    '.g-training .body{position:absolute;left:33%;top:42%;width:12cqw;height:13cqw;margin-left:-6cqw;border-radius:5cqw 5cqw 1cqw 1cqw;background:#1f6fd6;border:.35cqw solid #1d2433;transform-origin:50% 100%;animation:ggbreath 2s ease-in-out infinite}',
    '@keyframes ggbreath{0%,100%{transform:scale(.9,.96)}45%,55%{transform:scale(1.14,1.04)}}',
    '.g-training .puff{position:absolute;left:39%;top:27%;width:3cqw;height:3cqw;border-radius:50%;border:.35cqw solid #6aa9e8;opacity:0;animation:ggpuff 2s 1s ease-out infinite}',
    '@keyframes ggpuff{0%{transform:scale(.4);opacity:.9}60%,100%{transform:translate(9cqw,-3cqh) scale(2.2);opacity:0}}',
    '.g-training .cue{position:absolute;right:5%;top:8%;font-family:var(--gd);font-size:4.8cqw;color:#1f3a5f}',
    '.g-training .cc{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);background:rgba(0,0,0,.78);color:#fff;font-size:1.9cqw;font-weight:700;padding:.8cqh 1.4cqw;border-radius:.5cqw;white-space:nowrap}',
    '.g-training .ctl{display:flex;align-items:center;gap:1.4cqw;width:66cqw;margin-top:2.2cqh;font:800 1.3cqw var(--gm);letter-spacing:.06em;text-transform:uppercase;color:#4a556b}',
    '.g-training .bar{flex:1;height:1.4cqh;background:#c5cddb;border-radius:9cqh;overflow:hidden}',
    '.g-training .bar b{display:block;height:100%;width:1.5%;background:#1f6fd6;animation:ggcrawl 6s linear forwards}',
    '@keyframes ggcrawl{to{width:3%}}',
    '.g-training .skip{border:.25cqw solid #9aa3b5;color:#9aa3b5;border-radius:.6cqw;padding:.5cqh 1cqw;white-space:nowrap}',
    '.g-training .quiz{position:absolute;left:50%;top:50%;width:52cqw;margin:-17cqh 0 0 -26cqw;background:#fff;border:.45cqw solid #1d2433;border-radius:1.6cqw;padding:3cqh 2.4cqw;box-shadow:.8cqw 1.2cqh 0 #1f6fd6,0 0 0 200cqw rgba(29,36,51,.55);animation:ggpop .4s cubic-bezier(.3,1.5,.5,1)}',
    '.g-training .quiz small{font:800 1.3cqw var(--gm);letter-spacing:.14em;text-transform:uppercase;color:#1f6fd6}',
    '.g-training .quiz b{display:block;font-size:3.6cqw;font-weight:900;margin:1cqh 0 2.4cqh}',
    '.g-training .quiz span{display:inline-block;border:.3cqw solid #1d2433;border-radius:1cqw;padding:1.2cqh 1.8cqw;font-size:2cqw;font-weight:800;margin:0 .6cqw}',
    '.g-training .quiz span.y{background:#1f6fd6;color:#fff}',

    // 8. Wifi down
    '.g-wifi{background:rgba(10,10,31,.86);-webkit-backdrop-filter:blur(1.1cqw) saturate(.4);backdrop-filter:blur(1.1cqw) saturate(.4)}',
    '.g-wifi .px{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 .4cqh,transparent .4cqh .9cqh);animation:ggblink 1.3s steps(2) infinite}',
    '.g-wifi .wheel{position:relative;width:24cqw;height:24cqw;margin-top:-10cqh}',
    '.g-wifi .wheel:before{content:"";position:absolute;inset:0;border-radius:50%;border:1.6cqw solid rgba(255,255,255,.14);border-top-color:#fff8ea;border-right-color:#fff8ea;animation:ggspin .9s linear infinite}',
    '.g-wifi .ico{position:absolute;left:50%;top:56%;width:0;height:0}',
    '.g-wifi .ico i{position:absolute;left:0;top:0;border-radius:50%;border:1.1cqw solid transparent;border-top-color:#fff8ea;animation:ggarc 1.5s infinite}',
    '.g-wifi .ico i:nth-child(1){width:4cqw;height:4cqw;margin:-2cqw}',
    '.g-wifi .ico i:nth-child(2){width:9cqw;height:9cqw;margin:-4.5cqw;animation-delay:.2s}',
    '.g-wifi .ico i:nth-child(3){width:14cqw;height:14cqw;margin:-7cqw;animation-delay:.4s}',
    '.g-wifi .ico u{position:absolute;left:-.9cqw;top:-.3cqw;width:1.8cqw;height:1.8cqw;border-radius:50%;background:#fff8ea}',
    '@keyframes ggarc{0%,25%{opacity:.15}50%,100%{opacity:1}}',
    '.g-wifi .ico b{position:absolute;left:3.6cqw;top:-1.6cqw;width:4.4cqw;height:4.4cqw;border-radius:50%;background:#e5263a;border:.4cqw solid #0a0a1f;font:400 3cqw/3.5cqw var(--gd);color:#fff;animation:ggpop .4s .6s backwards}',
    '.g-wifi.ok .ico b{background:#1f9d55}',
    '.g-wifi.ok .wheel:before{animation:none;border-color:#1f9d55}',
    '.g-wifi.ok .ico i{animation:none}',
    '.g-wifi h1{font-family:var(--gd);font-weight:400;font-size:7.4cqw;line-height:1;margin:4cqh 0 0}',
    '.g-wifi h1 span{display:inline-block;width:6cqw;text-align:left}',
    '.g-wifi p{font-size:2.5cqw;font-weight:800;color:#ffe14d;margin:1.6cqh 0 0;min-height:3.4cqw}',
    '.g-wifi .frozen{position:absolute;left:2.4cqw;top:3cqh;font:800 1.5cqw var(--gm);letter-spacing:.14em;text-transform:uppercase;background:#e5263a;color:#fff;padding:.8cqh 1.2cqw;border-radius:.6cqw;animation:ggblink 1s infinite}'
  ].join('\n');

  var root = null, timers = [], current = null, endT = null, teams = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function at(ms, fn) { timers.push(setTimeout(function () { try { fn(); } catch (e) {} }, ms)); }
  function every(ms, fn) { timers.push(setInterval(function () { try { fn(); } catch (e) {} }, ms)); }
  function q(sel) { return root.querySelector(sel); }
  function chip(text, delay) { return '<div class="gg-chip"><div style="animation-delay:' + (delay || 0) + 'ms"><div class="gg-bot"><i></i><i></i><u></u></div><div class="gg-say"><small>Chip - AI intern</small>' + esc(text) + '</div></div></div>'; }
  function teamNames() {
    var t = teams;
    if (!t) { try { t = JSON.parse(localStorage.getItem('replyall_state_v3')).teams.map(function (x) { return x.name; }); } catch (e) {} }
    t = (t || []).filter(function (x) { return typeof x === 'string' && x.trim(); });
    return t.length === 2 ? t : ['Team One', 'Team Two'];
  }
  function ensure() {
    if (root && root.isConnected) return root;
    var st = document.createElement('style'); st.id = 'gags-css'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'gags'; root.setAttribute('aria-hidden', 'true'); document.body.appendChild(root);
    return root;
  }
  function clear() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = []; clearTimeout(endT); endT = null; current = null;
    if (root) { root.className = ''; root.innerHTML = ''; }
  }

  var SCENES = {
    restart: function () {
      var dots = ''; for (var i = 0; i < 6; i++) dots += '<i style="transform:rotate(' + i * 34 + 'deg) translateY(-3.8cqw);opacity:' + (1 - i * .15) + '"></i>';
      root.innerHTML = '<div class="gg g-restart"><div class="ring">' + dots + '</div><h1>Installing updates</h1><div class="pct">0%</div><p>Do not turn off your computer.</p><div class="bar"><b></b></div>' +
        '<div class="jk"><h2>JUST<br>KIDDING</h2>' + chip('IT says this meeting could not be saved. Please continue it.', 250) + '</div></div>';
      var pct = q('.pct'), bar = q('.bar b'), p = q('p'), n = 0;
      var set = function (v) { n = v; pct.textContent = v + '%'; bar.style.width = v + '%'; };
      [[500, 1], [1000, 2], [1500, 3], [1900, 4]].forEach(function (x) { at(x[0], function () { set(x[1]); }); });
      at(2300, function () { set(99); pct.classList.add('stuck'); p.textContent = 'Almost there. Do not turn off your computer.'; });
      at(3300, function () { p.textContent = 'Still 99%. This may take several fiscal quarters.'; });
      at(4300, function () { q('.g-restart').classList.add('done'); });
    },
    mute: function () {
      root.innerHTML = '<div class="gg g-mute"><div class="lips">Lips are moving / No audio detected</div><div class="mic"><i></i><u></u><b></b><s></s></div><h1>YOU\'RE ON MUTE</h1>' +
        chip('We could not hear any of that. It sounded great.', 1500) + '</div>';
    },
    badge: function () {
      root.innerHTML = '<div class="gg g-badge"><div class="wash"></div><div class="beacon"></div><div class="beacon b2"></div>' +
        '<div class="row"><div class="reader"><div class="led"></div><div class="lcd">Beep.<br>Try again</div><div class="waves"></div></div>' +
        '<div class="card"><div class="face"></div><b>EMPLOYEE</b><span>Definitely works here</span></div></div>' +
        '<h1>ACCESS DENIED</h1><p>Please see facilities. Facilities is also locked out.</p></div>';
      var lcd = q('.lcd');
      at(1500, function () { lcd.innerHTML = 'Beep beep.<br>Still no'; });
      at(2700, function () { lcd.innerHTML = 'Badge expired<br>in 2019'; });
    },
    conflict: function () {
      var hrs = ''; ['1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'].forEach(function (h, i) { hrs += '<div class="hr" style="top:' + (i * 12.5 + 13.2) + 'cqh">' + h + '</div>'; });
      root.innerHTML = '<div class="gg g-conflict"><div class="grid"></div>' + hrs + '<div class="day">Today / your one free hour</div>' +
        '<div class="shk"><div class="blk a"><b>Sync about the sync</b><span>2:00 - 3:00 / required</span></div>' +
        '<div class="blk b"><b>Pre-meeting for the meeting</b><span>2:00 - 3:00 / also required</span></div><div class="bang"></div></div>' +
        '<div class="gg-stamp">DOUBLE-BOOKED</div>' + chip('I accepted both for you. You are welcome.', 2900) + '</div>';
    },
    storm: function () {
      var SUBJ = ['Please remove me', 'RE: Please remove me', 'RE: RE: Please remove me', 'STOP REPLYING ALL', 'RE: STOP REPLYING ALL', 'Unsubscribe', 'unsubscribe', 'Who is this?', '+1', 'Why am I on this thread?',
        'Please remove me too', 'Wrong list, sorry all', 'RE: Wrong list, sorry all', 'Do NOT reply all (sent to all)', 'Remove me please. Thanks!', 'Me too', 'Is this about the fridge?', 'Recall: Please remove me', 'Out of office: Please remove me', 'Thanks all!'];
      var FROM = ['Everyone, All Staff', 'All Staff (4,812)', 'Someone in Finance', 'A person in Sales', 'Facilities', 'Floor 3', 'The whole company', 'Intern (not Chip)', 'Legal', 'Front desk'];
      var CLS = ['', 'hot', 'yel', 'pk'], h = '<div class="gg g-storm">';
      for (var i = 0; i < 46; i++) {
        var col = i % 4, x = col * 24.5 - 1 + Math.random() * 6 - 3, y = Math.random() * 84 - 2, r = (Math.random() * 16 - 8).toFixed(1);
        h += '<div class="m ' + CLS[rnd(4)] + '" style="left:' + x.toFixed(1) + 'cqw;top:' + y.toFixed(1) + 'cqh;--r:' + r + 'deg;--r0:' + (-r * 3) + 'deg;animation-delay:' + (i < 8 ? 150 + i * 190 : 1670 + (i - 8) * 45) + 'ms"><small>From: ' + FROM[rnd(FROM.length)] + '</small><b>' + esc(SUBJ[i < 3 ? i : rnd(SUBJ.length)]) + '</b></div>';
      }
      root.innerHTML = h + '<div class="cnt"><small>Unread</small><span>1</span></div><div class="gg-stamp">REPLY-ALL STORM</div>' + chip('I replied all asking everyone to stop replying all.', 4000) + '</div>';
      var c = q('.cnt span'), n = 1;
      every(70, function () { n += n < 40 ? 1 : Math.ceil(n * .11); if (n > 4812) n = 4812; c.textContent = n.toLocaleString('en-US'); });
    },
    reorg: function () {
      var T = teamNames(), FAKE = ['Synergy Enablement', 'Strategic Snacks', 'Office of Vibes', 'Meetings About Meetings', 'Thought Leadership', 'Circle-Back Operations', 'Cloud (the weather kind)', 'Printer Relations', 'Agile Waterfalls', 'Chair Logistics', 'Dept. of Quick Questions', 'Global Reply-All Desk'];
      var reel = function (k) { var s = '', n = 16 + k * 6; for (var i = 0; i < n; i++) s += '<div>' + esc(FAKE[(i * 5 + k * 3) % FAKE.length]) + '</div>'; return '<div class="reel"><div class="strip" style="--t:' + (2.3 + k * .9) + 's" data-n="' + n + '">' + s + '<div>' + esc(T[k]) + '</div></div></div>'; };
      root.innerHTML = '<div class="gg g-reorg"><h1>SURPRISE REORG</h1><div class="gg-mono sub">Effective immediately / org chart loading</div><div class="reels">' + reel(0) + '<div class="vs">VS</div>' + reel(1) + '</div><div class="res"></div>' + chip('I updated the org chart. It is the same chart.', 4700) + '</div>';
      var strips = root.querySelectorAll('.strip');
      at(350, function () { for (var i = 0; i < strips.length; i++) strips[i].style.transform = 'translateY(-' + strips[i].getAttribute('data-n') * 17 + 'cqh)'; });
      at(2650, function () { strips[0].parentNode.classList.add('hit'); });
      at(3550, function () { strips[1].parentNode.classList.add('hit'); });
      at(4000, function () { q('.res').innerHTML = '<b>NOTHING CHANGED.</b><span>Great reorg, everyone.</span>'; });
    },
    training: function () {
      root.innerHTML = '<div class="gg g-training"><div class="top"><span>Mandatory compliance training</span><b>Due yesterday</b></div>' +
        '<h1>Module 1 of 47: <em>Breathing at your desk</em></h1>' +
        '<div class="vid"><div class="cue">IN...</div><div class="head"><i></i></div><div class="puff"></div><div class="body"></div><div class="screen"></div><div class="desk"></div><div class="cc">[calm narrator] Locate your lungs.</div></div>' +
        '<div class="ctl"><span>0:04</span><div class="bar"><b></b></div><span>6:40:00</span><span class="skip">Skip (disabled)</span></div></div>';
      var cue = q('.cue'), cc = q('.cc'), k = 0;
      every(1000, function () { k++; cue.textContent = k % 2 ? 'OUT...' : 'IN...'; });
      at(1700, function () { cc.textContent = '[calm narrator] Breathe in. Do not expense it.'; });
      at(3300, function () { cc.textContent = '[calm narrator] Now breathe out. Quietly.'; });
      at(4300, function () { var d = document.createElement('div'); d.className = 'quiz'; d.innerHTML = '<small>Knowledge check 1 of 212</small><b>Did you breathe?</b><span class="y">Yes</span><span>Let me circle back</span>'; q('.g-training').appendChild(d); });
    },
    wifi: function () {
      root.innerHTML = '<div class="gg g-wifi"><div class="px"></div><div class="frozen">Your connection is unstable</div><div class="wheel"><div class="ico"><i></i><i></i><i></i><u></u><b>!</b></div></div>' +
        '<h1>Reconnecting<span>.</span></h1><p>Your video froze on a very unflattering frame.</p></div>';
      var d = q('h1 span'), p = q('p'), k = 1, dots = every;
      dots(350, function () { if (current !== 'wifi' || q('.g-wifi.ok')) return; k = k % 3 + 1; d.textContent = '...'.slice(0, k); });
      at(1900, function () { p.textContent = 'Have you tried standing closer to the kitchen?'; });
      at(3300, function () { p.textContent = 'Trying the guest network. Password is on a sticky note.'; });
      at(4500, function () { q('.g-wifi').classList.add('ok'); q('.ico b').textContent = '+'; q('h1').textContent = 'Connected.'; p.textContent = 'Nobody noticed you were gone.'; q('.frozen').style.display = 'none'; });
    }
  };

  function playGag(id) {
    var g = BY[id]; if (!g || !document.body) return false;
    ensure(); clear(); current = id; root.className = 'on';
    try { SCENES[id](); } catch (e) { clear(); return false; }
    endT = setTimeout(function () { if (current !== id) return; root.classList.add('out'); endT = setTimeout(function () { if (current === id) clear(); }, 420); }, g.ms);
    return true;
  }
  api.play = playGag;
  api.stop = clear;
  api.playing = function () { return current; };

  // ---------- link to the host page ----------
  var lastSeq = 0;
  function recv(d) {
    if (!d || typeof d !== 'object') return;
    if (d.S && d.S.teams) { try { teams = d.S.teams.map(function (t) { return t.name; }); } catch (e) {} }
    if (typeof d.gag !== 'string' || typeof d.gseq !== 'number') return;
    if (d.gseq <= lastSeq) return; lastSeq = d.gseq;
    if (d.gag === 'stop') clear(); else playGag(d.gag);
  }
  try { if ('BroadcastChannel' in window) { var ch = new BroadcastChannel('replyall'); ch.addEventListener('message', function (e) { recv(e.data); }); } } catch (e) {}
  window.addEventListener('message', function (e) { recv(e.data); });
})();
