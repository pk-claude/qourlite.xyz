/* Keeps the presenter screen's timers on time while its window sits behind PowerPoint.
   Chrome slows timers in a hidden window to about once a minute after a few minutes;
   timers counted inside a worker are not slowed, so setTimeout/setInterval are routed through one.
   Load this before any other script on the page. If workers are unavailable, nothing changes. */
(function () {
  let worker;
  try {
    const src = 'const t={};onmessage=e=>{const[a,id,ms]=e.data;if(a==="set")t[id]=setTimeout(()=>{delete t[id];postMessage(id)},ms);else{clearTimeout(t[id]);delete t[id]}}';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  } catch (e) { return; }
  const nativeSet = window.setTimeout.bind(window);
  const jobs = new Map();
  let next = 1;
  worker.onmessage = e => {
    const id = e.data, job = jobs.get(id);
    if (!job) return;
    if (job.repeat) worker.postMessage(['set', id, job.ms]); else jobs.delete(id);
    try { job.fn(...job.args); } catch (err) { nativeSet(() => { throw err; }, 0); }
  };
  const add = repeat => (fn, ms, ...args) => {
    if (typeof fn !== 'function') return 0;
    const id = next++;
    ms = Math.max(0, +ms || 0);
    jobs.set(id, { fn, ms, args, repeat });
    worker.postMessage(['set', id, ms]);
    return id;
  };
  const clear = id => { if (jobs.delete(id)) worker.postMessage(['clr', id]); };
  window.setTimeout = add(false);
  window.setInterval = add(true);
  window.clearTimeout = clear;
  window.clearInterval = clear;
})();
