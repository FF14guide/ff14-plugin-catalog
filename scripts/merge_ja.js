const fs=require('fs');
const l=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const ja={};
for(const f of fs.readdirSync('data/ja').filter(f=>/^(main|rest\d+)\.json$/.test(f)))
  Object.assign(ja,JSON.parse(fs.readFileSync('data/ja/'+f,'utf8')));
const tagJa=JSON.parse(fs.readFileSync('data/ja/tags.json','utf8'));
let n=0;
for(const p of l){
  const j=ja[p.internal];
  if(!j)continue;
  p.jaSummary=j.s; p.jaFeatures=j.f; p.categories=j.c||[];
  p.jaTags=[...new Set((p.tags||[]).map(t=>tagJa[String(t).trim().toLowerCase()]||null).filter(Boolean))];
  n++;
}
fs.writeFileSync('data/catalog.json',JSON.stringify(l,null,1));
console.error('attached ja to',n,'plugins');
console.error('with jaTags:',l.filter(p=>p.jaTags&&p.jaTags.length).length);
