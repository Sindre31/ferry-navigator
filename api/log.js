// Log sink for Ferry Navigator (Vercel serverless function, no build step).
//
// The app POSTs one JSON object per error to /api/log. This writes a single
// line to the runtime log — Vercel dashboard → Deployment → Logs, or
// `vercel logs <deployment>` — and, when the LOG_WEBHOOK environment variable
// is set, forwards the same line there (Slack, Discord, webhook.site …).
//
// Nothing is stored: there is no database, and Vercel keeps runtime logs only
// for a short window. Set LOG_WEBHOOK if you want them to outlive that.

const MAX_BODY = 4096;      // one error is a few hundred bytes
const FIELDS = ['t', 'where', 'msg', 'info', 'app', 'host', 'ua'];

const clip = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').slice(0, n);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > MAX_BODY) reject(new Error('too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }

  let payload = req.body;
  if (payload === undefined) {
    try {
      payload = await readBody(req);
    } catch (e) {
      res.status(413).end();
      return;
    }
  }
  if (typeof payload === 'string') {
    if (payload.length > MAX_BODY) { res.status(413).end(); return; }
    try { payload = JSON.parse(payload); } catch (e) { payload = { msg: payload }; }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    res.status(400).end();
    return;
  }

  // only the fields the app sends, all length-capped: this endpoint is public
  const entry = {};
  for (const k of FIELDS) if (payload[k] != null) entry[k] = clip(payload[k], k === 'ua' ? 140 : 200);
  entry.at = new Date().toISOString();

  const line = `[ferrynav] ${entry.at} ${entry.where || '?'} · ${entry.msg || '?'}` +
    (entry.info ? ` (${entry.info})` : '') + ` · ${entry.host || '?'} · ${entry.ua || '?'}`;
  console.error(line);

  const hook = process.env.LOG_WEBHOOK;
  if (hook) {
    // Slack and Discord both accept {"text"/"content": …}; send both keys so
    // either works, and never let a dead webhook fail the request
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: line, content: line, ...entry }),
      });
    } catch (e) {
      console.error('[ferrynav] log webhook failed:', e && e.message);
    }
  }

  res.status(204).end();
};
