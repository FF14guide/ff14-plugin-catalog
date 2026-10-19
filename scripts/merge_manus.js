// Manus版サイト(ff14-tools-guide)の編集データを catalog.json に manus フィールドとして付与する。
// 入力: data/manus/dalamudPlugins.json, data/manus/unofficialPlugins.json（ff14-tools-guide の client/src/data からコピーしたスナップショット）
// 照合: プラグイン名 / InternalName を「小文字・英数字のみ」に正規化して突き合わせる。
// 実行順: fetch → merge → icons → merge_ja → merge_manus → docs → build
const fs=require('fs');
const l=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const off=JSON.parse(fs.readFileSync('data/manus/dalamudPlugins.json','utf8'));
const un=JSON.parse(fs.readFileSync('data/manus/unofficialPlugins.json','utf8'));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g,'');
const byKey=new Map();
for(const p of l){ for(const k of [norm(p.name),norm(p.internal)]) if(k&&!byKey.has(k)) byKey.set(k,p); }

// 「READMEに明記なし」だけの定型行は載せない
const useful=a=>(a||[]).filter(s=>s&&!/^READMEに明記なし/.test(s.trim()));
// 内容のない定型の訳（ジャンル名＋「公式説明：…」）は載せない
const templatedJa=s=>!s||/^.{1,12}に関するコミュニティ製プラグインです。公式説明：/.test(s);
const slim=(p,src,fetchedAt)=>{
  const m={src,checked:(p.githubResearch&&p.githubResearch.checkedAt)||String(fetchedAt||'').slice(0,10)};
  if(!templatedJa(p.descriptionJa)) m.ja=p.descriptionJa;
  if(p.popularity) m.pop={n:+p.popularity,label:p.popularityLabel,dl:p.downloadCount||0,from:p.downloadLabel||''};
  const g=p.githubResearch;
  if(g&&g.confirmed&&g.summary){
    const s=g.summary;
    m.gh={url:g.url,pushed:g.pushedAt||'',archived:!!g.archived,conf:s.confidence||'',
      purpose:/^見出し:/.test(s.purposeJa||'')?'':(s.purposeJa||''),
      features:useful(s.featuresJa),settings:useful(s.settingsJa),commands:useful(s.commandsJa),
      deps:useful(s.dependenciesJa),cautions:useful(s.cautionsJa)};
  }
  if(src==='unofficial'){
    if(p.installSteps&&p.installSteps.length) m.ins=1; // 手順は全件共通の4行なので build.js で1度だけ埋め込む
    if(p.risk) m.risk={level:p.risk,note:p.riskNote||''};
  }
  return m;
};

let hit=0; const miss=[]; const stat={ja:0,pop:0,gh:0,ins:0,risk:0};
for(const p of l) delete p.manus;
for(const [src,data] of [['official',off],['unofficial',un]]){
  for(const mp of data.plugins){
    const t=byKey.get(norm(mp.name));
    if(!t){ miss.push(src+': '+mp.name); continue; }
    const m=slim(mp,src,data.fetchedAt);
    // 公式・非公式の両方に載るプラグインは、情報の多い方を残す
    if(t.manus && Object.keys(t.manus).length>=Object.keys(m).length) continue;
    if(!t.manus) hit++;
    t.manus=m;
  }
}
for(const p of l) if(p.manus) for(const k of Object.keys(stat)) if(p.manus[k]) stat[k]++;
fs.writeFileSync('data/catalog.json',JSON.stringify(l,null,1));
console.error('attached manus to',hit,'plugins',JSON.stringify(stat));
console.error('unmatched ('+miss.length+'):',miss.join(' | '));
