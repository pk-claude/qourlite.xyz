// /api/relay -- lets the Q2 live quiz work on networks that block the public relays.
// Browsers talk to this site (same origin, never blocked if the page loads); this
// function talks to a public MQTT broker over plain TCP from Vercel's network.
//   GET  ?room=R&k=state          -> { msgs: [latest host state] }
//   POST ?room=R&k=state  (json)  -> host publishes its state (retained)
//   POST ?room=R&k=up     (json)  -> a phone's join / answer / reaction / bingo
//   GET  ?room=R&k=up&sid=S       -> { msgs: [latest message per phone and kind] }
// Topics match the browsers' direct MQTT channel, so both paths interoperate.
import mqtt from 'mqtt';

const BROKER = process.env.RELAY_BROKER || 'mqtt://broker.emqx.io:1883';
const ok = s => typeof s === 'string' && /^[a-z0-9-]{1,32}$/i.test(s);

// One connection per warm instance; it keeps the latest message per topic.
let ready = null;
const latest = new Map();
const subscribed = new Set();
function getClient() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    const c = mqtt.connect(BROKER, { clientId: 'qlb_' + Math.random().toString(36).slice(2, 12), connectTimeout: 5000, reconnectPeriod: 0, keepalive: 30 });
    const fail = e => { ready = null; subscribed.clear(); try { c.end(true); } catch (x) {} reject(e); };
    const t = setTimeout(() => fail(new Error('broker timeout')), 6000);
    c.on('connect', () => { clearTimeout(t); resolve(c); });
    c.on('message', (topic, p) => { latest.set(topic, p.toString()); if (latest.size > 5000) latest.delete(latest.keys().next().value); });
    c.on('error', fail);
    c.on('close', () => { ready = null; subscribed.clear(); });
  });
  return ready;
}
async function subscribe(c, filter) {
  if (subscribed.has(filter)) return;
  await new Promise((res, rej) => c.subscribe(filter, { qos: 0 }, e => (e ? rej(e) : res())));
  subscribed.add(filter);
  await new Promise(r => setTimeout(r, 700)); // let retained messages arrive
}
const publish = (c, topic, body, retain) => new Promise((res, rej) => c.publish(topic, body, { qos: 0, retain }, e => (e ? rej(e) : res())));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { room, k, sid } = req.query || {};
  if (!ok(room) || (k !== 'state' && k !== 'up')) return res.status(400).json({ error: 'bad request' });
  const base = `qourlite/v1/${room}`;
  try {
    const c = await getClient();
    if (req.method === 'POST') {
      const msg = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const body = JSON.stringify(msg);
      if (body.length > 6000 || !msg.id) return res.status(400).json({ error: 'bad message' });
      if (k === 'state') {
        await publish(c, `${base}/state`, body, true);
        latest.set(`${base}/state`, body);
      } else {
        // live copy for hosts on the direct MQTT channel, retained copy (latest per phone and kind) for hosts polling here
        await publish(c, `${base}/up`, body, false);
        if (ok(msg.sid) && ok(msg.p) && ok(msg.k)) await publish(c, `${base}/upr/${msg.sid}/${msg.p}/${msg.k}`, body, true);
      }
      return res.status(200).json({ ok: true });
    }
    if (k === 'state') {
      await subscribe(c, `${base}/state`);
      const s = latest.get(`${base}/state`);
      return res.status(200).json({ msgs: s ? [s] : [] });
    }
    if (!ok(sid)) return res.status(400).json({ error: 'sid required' });
    const filter = `${base}/upr/${sid}/`;
    await subscribe(c, filter + '#');
    const msgs = [];
    for (const [t, v] of latest) if (t.startsWith(filter)) msgs.push(v);
    return res.status(200).json({ msgs });
  } catch (e) {
    return res.status(502).json({ error: String(e && e.message || e) });
  }
}
