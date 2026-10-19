// data/repos.config.json に書かれた全リポジトリの pluginmaster を取得して data/repos.json に保存する。
// data/repos.json は生成物（.gitignore 対象）。
const fs = require('fs');

const repos = JSON.parse(fs.readFileSync('data/repos.config.json', 'utf8'));
const FETCH_TIMEOUT_MS = 30000;

(async () => {
  const out = [];
  for (const r of repos) {
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const txt = await res.text();
      let json = null, err = null;
      try { json = JSON.parse(txt.replace(/^﻿/, '')); } catch (e) { err = 'parse: ' + e.message + ' :: ' + txt.slice(0, 120); }
      if (json && !Array.isArray(json)) json = json.$values || json.plugins || [json];
      out.push({ ...r, status: res.status, count: json ? json.length : 0, error: err, plugins: json || [] });
      console.error(`${res.status} ${json ? json.length : 'ERR'} ${r.url}`);
    } catch (e) {
      out.push({ ...r, status: 0, count: 0, error: String(e), plugins: [] });
      console.error(`FAIL ${r.url} ${e}`);
    }
  }
  // 公式リポジトリが取れなかったときは、前回のカタログを壊さないよう異常終了させる
  const official = out.find((r) => r.official);
  if (!official || !official.plugins.length) {
    console.error('official repository returned no plugins; aborting');
    process.exit(1);
  }
  fs.writeFileSync('data/repos.json', JSON.stringify(out, null, 1));
})();
