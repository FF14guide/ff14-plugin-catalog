// data/repos.json の全リポジトリを InternalName で統合して data/catalog.json を作る。
// 公開版なので、ローカルにインストールされたプラグインの情報は一切読まない。
const fs = require('fs');
const repos = JSON.parse(fs.readFileSync('data/repos.json', 'utf8'));

const norm = (p) => ({
  internal: p.InternalName || p.Name,
  name: p.Name || p.InternalName,
  author: p.Author || '',
  punchline: (p.Punchline || '').trim(),
  description: (p.Description || '').trim(),
  version: p.AssemblyVersion || p.TestingAssemblyVersion || '',
  tags: [].concat(p.Tags || [], p.CategoryTags || []).filter(Boolean),
  repoUrl: p.RepoUrl || '',
  icon: p.IconUrl || '',
  images: p.ImageUrls || [],
  api: p.DalamudApiLevel ?? null,
  downloads: p.DownloadCount || 0,
  lastUpdate: p.LastUpdate || 0,
  testing: !!p.IsTestingExclusive,
  applicable: p.ApplicableVersion || 'any',
  changelog: (p.Changelog || '').trim(),
  loadPriority: p.LoadPriority || 0,
});

const catalog = {};
for (const r of repos) {
  const src = r.official ? 'OFFICIAL' : r.url;
  for (const p of r.plugins) {
    if (!p || typeof p !== 'object' || !(p.InternalName || p.Name)) continue;
    const n = norm(p);
    const k = n.internal;
    if (!catalog[k]) catalog[k] = { ...n, sources: [] };
    const c = catalog[k];
    c.sources.push({ repo: src, official: !!r.official, version: n.version });
    // 一番情報の多いものを採用する
    if (n.description.length > c.description.length) c.description = n.description;
    if (n.punchline && !c.punchline) c.punchline = n.punchline;
    if (n.icon && !c.icon) c.icon = n.icon;
    if (n.repoUrl && !c.repoUrl) c.repoUrl = n.repoUrl;
    if (n.tags.length > c.tags.length) c.tags = n.tags;
    if (n.downloads > c.downloads) c.downloads = n.downloads;
    if (n.images.length > c.images.length) c.images = n.images;
    if (n.changelog.length > c.changelog.length) c.changelog = n.changelog;
    if (r.official) c.inOfficial = true;
  }
}

const list = Object.values(catalog);
console.error('total unique plugins:', list.length);
console.error('official:', list.filter((p) => p.inOfficial).length, '3rd-party-only:', list.filter((p) => !p.inOfficial).length);
console.error('repos ok:', repos.filter((r) => r.plugins.length).length + '/' + repos.length);
fs.writeFileSync('data/catalog.json', JSON.stringify(list, null, 1));
