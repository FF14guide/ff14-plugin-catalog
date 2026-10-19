// data/catalog.json + template.html + data/guides.json から dist/ を生成する（公開用の静的サイト）。
//   dist/index.html          プラグイン図鑑
//   dist/icons/*.png         56pxアイコン（icons_small をコピー）
//   dist/guides/index.html   導入ガイドの一覧
//   dist/guides/<id>/index.html  各ツールのガイド
const fs = require('fs');
const path = require('path');

const list = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const repos = JSON.parse(fs.readFileSync('data/repos.config.json', 'utf8'));
let repoCounts = {};
try {
  // 取得数は最新の fetch 結果があるときだけ使う（無ければ catalog から数える）
  for (const r of JSON.parse(fs.readFileSync('data/repos.json', 'utf8'))) repoCounts[r.url] = r.count;
} catch { repoCounts = null; }
const guides = JSON.parse(fs.readFileSync('data/guides.json', 'utf8'));
const DIST = 'dist';

const label = (u) => {
  if (u === 'OFFICIAL') return '公式 (Dalamud Official)';
  let m = u.match(/github(?:usercontent)?\.com\/([^\/]+)/); if (m) return m[1];
  m = u.match(/puni\.sh\/api\/repository\/(\w+)/); if (m) return 'puni.sh/' + m[1];
  if (u.includes('love.puni.sh')) return 'puni.sh (ment)';
  try { return new URL(u).hostname; } catch (e) { return u; }
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });

// ---------- 図鑑 ----------
list.sort((a, b) => a.name.localeCompare(b.name));
const iconFile = (internal) => internal.replace(/[^A-Za-z0-9._-]/g, '_') + '.png';
const DATA = list.map((p, x) => {
  const o = {
    x, n: p.name, i: p.internal, a: p.author || '', p: p.punchline || '', d: p.description || '',
    v: p.version || '', t: p.tags || [], r: p.repoUrl || '', api: p.api, dl: p.downloads || 0, lu: p.lastUpdate || 0,
    app: p.applicable || 'any', src: [...new Set(p.sources.map((s) => label(s.repo)))],
    js: p.jaSummary || '', jf: p.jaFeatures || '', c: p.categories || [], jt: p.jaTags || [],
    su: [...new Set(p.sources.map((s) => (s.repo === 'OFFICIAL' ? '公式 Dalamud リポジトリ' : s.repo)))],
  };
  if (p.inOfficial) o.off = 1;
  if (p.testing) o.test = 1;
  if (p.loadPriority) o.lp = p.loadPriority;
  if (p.changelog) o.cl = p.changelog.slice(0, 900);
  if (p.manus) o.m = p.manus;
  return o;
});

const ICONS = {};
for (const p of list) {
  const f = iconFile(p.internal);
  if (fs.existsSync(path.join('icons_small', f))) {
    fs.copyFileSync(path.join('icons_small', f), path.join(DIST, 'icons', f));
    ICONS[p.internal] = 'icons/' + f;
  }
}

const countBySource = {};
for (const p of list) for (const s of new Set(p.sources.map((x) => x.repo))) countBySource[s] = (countBySource[s] || 0) + 1;
const OFFICIAL_URL = 'https://kamori.goats.dev/Plugin/PluginMaster';
const REPOS = repos.map((r) => {
  const key = r.official ? 'OFFICIAL' : r.url;
  return {
    label: label(key), url: r.official ? OFFICIAL_URL : r.url, official: !!r.official,
    count: repoCounts && repoCounts[r.url] != null ? repoCounts[r.url] : (countBySource[key] || 0),
  };
}).sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0) || b.count - a.count);

const CATS = { combat: '戦闘支援', auto: '自動化', ui: 'UI・HUD', info: '情報表示', craft: '生産・採集', market: 'マーケット・金策', inv: 'インベントリ・装備', house: 'ハウジング', glam: '見た目・ミラプリ', mod: 'Mod連携', social: 'ソーシャル・チャット', rp: 'ロールプレイ', map: '地図・移動', raid: '高難易度・攻略', pvp: 'PvP', field: 'DD・フィールド作戦', hunt: 'ハント・FATE', quest: 'クエスト・デイリー', gs: 'ゴールドソーサー・ミニゲーム', audio: '音楽・オーディオ', shot: '撮影・カメラ', ext: '外部連携', qol: 'QoL・小改善', dev: '開発者向け', net: 'ネットワーク', misc: 'その他' };
const META = { date: new Date().toISOString().slice(0, 10), icons: Object.keys(ICONS).length };
const MANUS_STEPS = (JSON.parse(fs.readFileSync('data/manus/unofficialPlugins.json', 'utf8')).plugins.find((p) => p.installSteps && p.installSteps.length) || {}).installSteps || [];

const html = fs.readFileSync('template.html', 'utf8')
  .replace('__DATA__', () => JSON.stringify(DATA))
  .replace('__ICONS__', () => JSON.stringify(ICONS))
  .replace('__REPOS__', () => JSON.stringify(REPOS))
  .replace('__META__', () => JSON.stringify(META))
  .replace('__CATS__', () => JSON.stringify(CATS))
  .replace('__MANUS_STEPS__', () => JSON.stringify(MANUS_STEPS));
fs.writeFileSync(path.join(DIST, 'index.html'), html);

// ---------- 導入ガイド ----------
// 図鑑と同じ色・フォントを使う。テーマ切り替えは図鑑側の設定(localStorage)を共有する。
const guideCss = fs.readFileSync('template.html', 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1].split(/\n\.top\{/)[0];
const GUIDE_CSS = `${guideCss}
body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.7 "IBM Plex Sans","Noto Sans JP",system-ui,sans-serif}
.g-wrap{max-width:860px;margin:0 auto;padding:0 18px 60px}
.g-top{border-bottom:1px solid var(--line);background:var(--surface)}
.g-top .g-wrap{display:flex;gap:16px;align-items:center;padding-top:14px;padding-bottom:14px}
.g-top a{color:var(--ink2);text-decoration:none;font-size:13px;font-weight:600}.g-top a:hover{color:var(--gold)}
.g-top .g-brand{font-family:Fraunces,serif;font-size:18px;color:var(--ink);margin-right:auto}
h1.g-title{font-family:Fraunces,"Noto Sans JP",serif;font-size:30px;line-height:1.3;margin:34px 0 8px}
.g-eyebrow{font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.1em;color:var(--gold)}
.g-lead{color:var(--ink2);margin:0 0 20px}
.g-warn{border:1px solid var(--tp);background:var(--tpbg);color:var(--ink);border-radius:8px;padding:12px 16px;margin:18px 0;font-size:13.5px}
.g-warn b{color:var(--tp)}
.g-sec{margin:34px 0}.g-sec h2{font-size:20px;margin:0 0 10px;padding-top:6px;border-top:1px solid var(--line)}
.g-card{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:14px 16px;margin:0 0 12px}
.g-card h3{margin:0 0 4px;font-size:15.5px}.g-card p{margin:4px 0;color:var(--ink2);font-size:14px}
.g-kind{font:500 10.5px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
.g-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.g-tone-amber{border-left:3px solid var(--gold)}.g-tone-blue{border-left:3px solid var(--off)}.g-tone-sage{border-left:3px solid var(--ok)}
.g-step .g-label{font:600 11px/1 "IBM Plex Mono",monospace;color:var(--gold)}
.g-checks{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.g-checks span{font-size:12px;background:var(--surface2);border:1px solid var(--line2);border-radius:999px;padding:2px 10px;color:var(--ink2)}
table.g-tbl{width:100%;border-collapse:collapse;font-size:13.5px}.g-tbl th,.g-tbl td{border-bottom:1px solid var(--line2);padding:8px 10px;text-align:left;vertical-align:top}
.g-tbl th{color:var(--muted);font-size:12px}
.g-src{font-size:13px;color:var(--ink2)}.g-src div{margin:6px 0}.g-src small{color:var(--muted);margin-left:6px}
a.g-link{color:var(--off)}a.g-link:hover{color:var(--gold)}
.g-foot{margin-top:40px;font-size:12.5px;color:var(--muted)}
.g-list{display:grid;gap:12px}.g-list a{text-decoration:none;color:inherit}.g-list .g-card:hover{border-color:var(--gold)}
.g-pre{white-space:pre-wrap}
@media(max-width:640px){h1.g-title{font-size:24px}}
`;
const THEME_JS = `<script>try{var t=localStorage.getItem('dpr-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>`;
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap">';
const gpage = (title, body, base) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${FONTS}${THEME_JS}<style>${GUIDE_CSS}</style></head><body>
<header class="g-top"><div class="g-wrap"><a class="g-brand" href="${base}">Dalamud Plugin Registry</a><a href="${base}guides/">導入ガイド</a><a href="${base}">プラグイン図鑑</a></div></header>
<main class="g-wrap">${body}
<p class="g-foot">本サイトはファンによる非公式の情報整理で、スクウェア・エニックスおよび各開発者とは関係ありません。</p></main></body></html>`;
const ext = (href, text) => `<a class="g-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;
const toneLabel = (t) => (t === 'amber' ? 'できること' : t === 'blue' ? '画面に出るもの' : '境界線');

fs.mkdirSync(path.join(DIST, 'guides'), { recursive: true });
const order = Object.keys(guides.tools);
for (const id of order) {
  const t = guides.tools[id];
  const body = `
<div class="g-eyebrow">${esc(t.eyebrow)} / 詳細解説</div>
<h1 class="g-title">${esc(t.title)}</h1>
<p class="g-lead">${esc(t.lead)}</p>
<div class="g-warn"><b>このページを読む前に。</b> ${esc(guides.commonNotice)}</div>
<section class="g-sec"><h2>まず、何をする道具か</h2><p>${esc(t.role)}</p>
<div class="g-card"><div class="g-kind">向いている読み方</div><p>${esc(t.forWhom)}</p></div>
<div class="g-card"><div class="g-kind">構成要素</div><div class="g-checks">${t.stack.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div></section>
<section class="g-sec"><h2>具体的に何ができるか</h2><div class="g-grid">${(guides.features[id] || []).map((f) => `<article class="g-card g-tone-${esc(f.tone)}"><div class="g-kind">${toneLabel(f.tone)}</div><h3>${esc(f.title)}</h3><p>${esc(f.plain)}</p><p><b>具体例：</b>${esc(f.display)}</p><p><b>${f.tone === 'sage' ? '注意：' : '知っておくこと：'}</b>${esc(f.boundary)}</p></article>`).join('')}</div></section>
<section class="g-sec"><h2>必要なものを入手する</h2><p>各ツールの公式または開発元が案内する入手先です。リンク先のリリース番号・更新日・READMEを確認してから取得してください。</p>
<div class="g-grid">${(guides.downloads[id] || []).map((d) => `<div class="g-card"><div class="g-kind">${esc(d.kind)}</div><h3>${esc(d.name)}</h3><p>${esc(d.detail)}</p>${ext(d.href, d.label + 'を開く')}</div>`).join('')}</div></section>
<section class="g-sec"><h2>設定画面で確認する場所</h2><p>画面の見た目はバージョンやOS設定で変わるため、操作場所と確認項目を一覧にしています。</p>
${(guides.screens[id] || []).map((s, i) => `<div class="g-card"><div class="g-kind">画面 ${String(i + 1).padStart(2, '0')}</div><h3>${esc(s.name)}</h3><p>${esc(s.path)}</p><div class="g-checks">${s.checks.map((c) => `<span>✓ ${esc(c)}</span>`).join('')}</div></div>`).join('')}</section>
<section class="g-sec"><h2>導入を段階に分ける</h2>${t.steps.map((s) => `<div class="g-card g-step"><div class="g-label">${esc(s.label)}</div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${s.checks ? `<div class="g-checks">${s.checks.map((c) => `<span>✓ ${esc(c)}</span>`).join('')}</div>` : ''}</div>`).join('')}</section>
<section class="g-sec"><h2>更新後の切り分け</h2><p>パッチ後は、すべてを一度に直そうとせず、基盤から末端へ順番に確認します。まずゲーム本体と起動経路、次にACT／Dalamud、最後に個別プラグインや設定を確認します。</p>
<table class="g-tbl"><thead><tr><th>症状</th><th>確認する場所</th></tr></thead><tbody>${t.troubleshooting.map((x) => `<tr><td>${esc(x.symptom)}</td><td>${esc(x.action)}</td></tr>`).join('')}</tbody></table></section>
<section class="g-sec"><div class="g-card"><p>記事やWikiは更新されます。古いスクリーンショットの手順をそのまま再現するのではなく、必ず現行リリースのREADME・公式ドキュメント・リリースノートを確認してください。出所不明のDLLや設定ファイルは使用しないでください。</p></div></section>
<section class="g-sec"><h2>出典・参照</h2><div class="g-src">${t.sources.map((s, i) => `<div>[${i + 1}] ${ext(s.href, s.label)}<small>${esc(s.note)}</small></div>`).join('')}</div>
<p class="g-foot">最終確認日：2026-08-15。パッチや配布元の更新により内容が変わる可能性があります。</p></section>`;
  fs.mkdirSync(path.join(DIST, 'guides', id), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'guides', id, 'index.html'), gpage(t.title + ' | 導入ガイド', body, '../../'));
}
const indexBody = `<div class="g-eyebrow">GUIDES</div><h1 class="g-title">導入ガイド</h1>
<p class="g-lead">ACT、XIVLauncher / Dalamud、補助輪、CACTBOT、OverlayPlugin、プラグインリポジトリの役割と導入手順をまとめています。</p>
<div class="g-warn"><b>注意。</b> ${esc(guides.commonNotice)}</div>
<div class="g-list">${order.map((id) => `<a href="${id}/"><div class="g-card"><div class="g-kind">${esc(guides.tools[id].eyebrow)}</div><h3>${esc(guides.tools[id].title)}</h3><p>${esc(guides.tools[id].lead)}</p></div></a>`).join('')}</div>`;
fs.writeFileSync(path.join(DIST, 'guides', 'index.html'), gpage('導入ガイド | Dalamud Plugin Registry', indexBody, '../'));

console.error('plugins:', DATA.length, '| icons:', META.icons, '| guides:', order.length);
console.error('index.html MB:', (Buffer.byteLength(html) / 1048576).toFixed(2));
