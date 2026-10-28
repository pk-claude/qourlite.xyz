/* Live transport for the quiz.
   No server of our own: messages go over free public relays, on several at once,
   so one blocked or rate-limited relay does not stop the room.
     - EMQX public MQTT broker (wss, port 8084)
     - Eclipse public MQTT broker (wss, port 443)
     - ntfy.sh (plain HTTPS) as the fallback, used sparingly because it rate-limits per IP
   Every message carries a unique id; receivers drop duplicates.
   ?test=host:port points everything at a local test broker instead. */
(function () {
  const params = new URLSearchParams(location.search);
  const TEST = params.get('test');
  const CHANNELS = TEST
    ? [
        { id: 'm1', type: 'mqtt', url: `ws://${TEST}/mqtt` },
        { id: 'm2', type: 'mqtt', url: `ws://${TEST}/mqtt2` },
        { id: 'nt', type: 'ntfy', base: `http://${TEST}` },
      ]
    : [
        { id: 'emqx', type: 'mqtt', url: 'wss://broker.emqx.io:8084/mqtt' },
        { id: 'eclipse', type: 'mqtt', url: 'wss://mqtt.eclipseprojects.io:443/mqtt' },
        { id: 'ntfy', type: 'ntfy', base: 'https://ntfy.sh' },
      ];
  const disabled = (params.get('off') || '').split(',');
  // A host state older than this is a leftover (e.g. a retained message from an earlier run), not a live host.
  const STALE_MS = (TEST && +params.get('stale') * 1000) || 120000;

  const rid = (n = 8) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

  function create({ room, role, onMsg, onStatus }) {
    const mqttTopic = k => `qourlite/v1/${room}/${k}`;
    const ntfyTopic = k => `qourlite-v1-${room}-${k}`.slice(0, 64);
    const seen = new Set();
    const seenOrder = [];
    const status = {};
    const clients = {};
    let ntfySources = {};
    let hostChannels = null; // from the host's state, for players
    let lastLive = 0; // when we last received a fresh host state
    let bestSt = 0; // start time of the newest presenter screen seen; older ones are ignored
    let lastNtfyStateKey = '';
    let ntfyStateTimer = null;

    const setStatus = (id, s) => {
      if (status[id] === s) return;
      status[id] = s;
      if (onStatus) setTimeout(() => onStatus({ ...status }), 0);
    };

    function receive(chId, topicKey, raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (!msg || !msg.id || seen.has(msg.id)) return;
      seen.add(msg.id); seenOrder.push(msg.id);
      if (seenOrder.length > 5000) seen.delete(seenOrder.shift());
      if (topicKey === 'state') {
        msg._stale = !(Date.now() - (msg.t || 0) < STALE_MS);
        // Two presenter screens in one room (e.g. an old tab left open): the most recently opened one wins.
        if (!msg._stale && (msg.st || 0) > bestSt) bestSt = msg.st || 0;
        msg._old = !msg._stale && (msg.st || 0) < bestSt;
        if (!msg._stale && !msg._old) { lastLive = Date.now(); if (Array.isArray(msg.ch)) hostChannels = msg.ch; }
      }
      onMsg && onMsg(topicKey, msg, chId);
    }

    const subs = role === 'host' ? ['up', 'state'] : ['state'];

    function connectMqtt(ch) {
      if (!window.mqtt) { setStatus(ch.id, 'off'); return; }
      setStatus(ch.id, 'connecting');
      let c;
      try {
        c = window.mqtt.connect(ch.url, {
          clientId: 'ql_' + rid(10), clean: true, keepalive: 30,
          reconnectPeriod: 4000, connectTimeout: 9000, protocolVersion: 4,
        });
      } catch (e) { setStatus(ch.id, 'down'); return; }
      clients[ch.id] = c;
      c.on('connect', () => {
        setStatus(ch.id, 'up');
        subs.forEach(k => c.subscribe(mqttTopic(k), { qos: role === 'host' ? 1 : 0 }));
      });
      c.on('message', (topic, payload) => {
        const k = topic.split('/').pop();
        receive(ch.id, k, payload.toString());
      });
      c.on('close', () => setStatus(ch.id, 'down'));
      c.on('offline', () => setStatus(ch.id, 'down'));
      c.on('error', () => setStatus(ch.id, 'down'));
    }

    function connectNtfy(ch) {
      subs.forEach(k => {
        if (ntfySources[k]) return;
        setStatus(ch.id, 'connecting');
        let es;
        try { es = new EventSource(`${ch.base}/${ntfyTopic(k)}/sse?since=15m`); } catch (e) { setStatus(ch.id, 'down'); return; }
        ntfySources[k] = es;
        es.onopen = () => setStatus(ch.id, 'up');
        es.onerror = () => setStatus(ch.id, es.readyState === 2 ? 'down' : 'connecting');
        es.onmessage = ev => {
          let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
          if (d.event && d.event !== 'message') return;
          if (typeof d.message === 'string') receive(ch.id, k, d.message);
        };
      });
    }

    function ntfyPublish(ch, k, msg) {
      return fetch(`${ch.base}/${ntfyTopic(k)}`, { method: 'POST', body: JSON.stringify(msg) })
        .then(r => { if (!r.ok) throw new Error(r.status); setStatus(ch.id, 'up'); return true; })
        .catch(() => { setStatus(ch.id, 'down'); return false; });
    }

    const ntfyCh = CHANNELS.find(c => c.type === 'ntfy' && !disabled.includes(c.id));
    CHANNELS.filter(c => c.type === 'mqtt' && !disabled.includes(c.id)).forEach(connectMqtt);
    if (ntfyCh) {
      if (role === 'host') connectNtfy(ntfyCh);
      else {
        // Players only use ntfy if the MQTT relays have not brought them the host's state.
        setStatus(ntfyCh.id, 'standby');
        // ...and also whenever the host goes quiet on them (a relay the host cannot reach only holds stale state).
        setTimeout(() => { if (!lastLive) connectNtfy(ntfyCh); }, 6000);
        setInterval(() => { if (Date.now() - lastLive > 25000) connectNtfy(ntfyCh); }, 5000);
      }
    }

    const upMqtt = () => Object.keys(clients).filter(id => clients[id].connected);

    // Host: state goes everywhere. MQTT copies are retained so late joiners get it at once.
    // ntfy gets only phase changes (not every vote count) to stay far under its limits.
    function publishState(state, phaseKey) {
      const ids = upMqtt();
      const msg = { ...state, id: rid(), ch: [...ids, ...(ntfyCh && status[ntfyCh.id] === 'up' ? [ntfyCh.id] : [])] };
      const body = JSON.stringify(msg);
      ids.forEach(id => clients[id].publish(mqttTopic('state'), body, { qos: 0, retain: true }));
      if (ntfyCh && !disabled.includes(ntfyCh.id) && phaseKey !== lastNtfyStateKey) {
        clearTimeout(ntfyStateTimer);
        ntfyStateTimer = setTimeout(() => {
          lastNtfyStateKey = phaseKey;
          ntfyPublish(ntfyCh, 'state', { ...msg, id: rid() });
        }, 400);
      }
    }

    // Player: send on every MQTT relay we share with the host; ntfy only when needed.
    const t0 = Date.now();
    const mqttConnecting = () => Object.keys(clients).some(id => status[id] === 'connecting');
    // Give the MQTT relays a few seconds to connect before falling back to ntfy.
    function whenReady() {
      if (upMqtt().length || !mqttConnecting() || Date.now() - t0 > 8000) return Promise.resolve();
      return new Promise(res => {
        const iv = setInterval(() => {
          if (upMqtt().length || !mqttConnecting() || Date.now() - t0 > 8000) { clearInterval(iv); res(); }
        }, 200);
      });
    }

    function publishUp(payload, opts) { return whenReady().then(() => publishUpNow(payload, opts)); }
    function publishUpNow(payload, { important = true } = {}) {
      const msg = { ...payload, id: rid() };
      const body = JSON.stringify(msg);
      const mine = upMqtt();
      const hostKnown = hostChannels && Date.now() - lastLive < 30000;
      const shared = hostKnown ? mine.filter(id => hostChannels.includes(id)) : mine;
      shared.forEach(id => clients[id].publish(mqttTopic('up'), body, { qos: important ? 1 : 0 }));
      if (important && ntfyCh && !disabled.includes(ntfyCh.id) && (shared.length === 0 || !hostKnown)) {
        if (!ntfySources.state) connectNtfy(ntfyCh);
        return ntfyPublish(ntfyCh, 'up', msg);
      }
      return Promise.resolve(shared.length > 0);
    }

    return {
      publishState, publishUp,
      status: () => ({ ...status }),
      anyUp: () => Object.values(status).includes('up'),
      mqttUp: () => upMqtt().length > 0,
      channels: CHANNELS.filter(c => !disabled.includes(c.id)).map(c => c.id),
    };
  }

  // Small safe localStorage wrapper: a blocked store must never break the page.
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // A page can set window.LIVE_ROOM before loading this file to get its own default room.
  const DEF_ROOM = window.LIVE_ROOM || 'icqa-pk26';
  window.Live = { create, rid, store, defRoom: DEF_ROOM, room: (params.get('room') || DEF_ROOM).replace(/[^a-z0-9-]/gi, '').slice(0, 24) || DEF_ROOM, test: TEST };
})();
