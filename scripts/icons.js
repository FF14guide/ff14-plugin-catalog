// icons_small/ に無いプラグインのアイコンだけを取得し、56pxのPNGにして保存する。
// 取得できなかったものは頭文字のプレースホルダー表示になる。
const fs = require('fs');
const sharp = require('sharp');

const SIZE = 56;
const list = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const fileName = (internal) => internal.replace(/[^A-Za-z0-9._-]/g, '_') + '.png';
const D17 = (n) => [
  `https://raw.githubusercontent.com/goatcorp/PluginDistD17/main/stable/${n}/images/icon.png`,
  `https://raw.githubusercontent.com/goatcorp/PluginDistD17/main/testing-live/${n}/images/icon.png`,
];
const rawify = (u) => {
  if (!u) return [];
  const o = [u];
  if (u.includes('github.com') && u.includes('/blob/')) o.push(u.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'));
  return o;
};

fs.mkdirSync('icons_small', { recursive: true });
const added = [], missing = [];

async function one(p) {
  const out = 'icons_small/' + fileName(p.internal);
  if (fs.existsSync(out)) return;
  for (const u of [...rawify(p.icon), ...D17(p.internal)]) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) continue;
      await sharp(buf).resize(SIZE, SIZE, { fit: 'inside' }).png().toFile(out);
      added.push(p.internal);
      return;
    } catch { /* 次の候補へ */ }
  }
  missing.push(p.internal);
}

(async () => {
  const queue = [...list];
  await Promise.all(Array.from({ length: 12 }, async () => { while (queue.length) await one(queue.shift()); }));
  console.error(`icons added: ${added.length}, still missing: ${missing.length}`);
})();
