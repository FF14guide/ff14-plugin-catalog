# FF14 プラグイン図鑑

XIVLauncher / Dalamud の公式・サードパーティ製プラグインを、日本語の概要・機能・注意点つきで横断検索できる非公式の静的サイトです。導入ガイド（ACT・XIVLauncher・補助輪・CACTBOT・OverlayPlugin・プラグインリポジトリ）も含みます。

公開先: Cloudflare Workers（静的アセット）。`https://plugins.eorzeanfishing.com`

## 仕組み

```
data/repos.config.json ──fetch──▶ data/repos.json（生成物）
        └─merge──▶ data/catalog.json ──merge_ja──▶ 日本語の概要・カテゴリ（data/ja/）
                                      └merge_manus──▶ README調査・リスク評価（data/manus/）
catalog.json + template.html + data/guides.json ──build──▶ dist/（公開物）
```

| コマンド | 内容 |
|---|---|
| `npm run update` | 全リポジトリを取得し、`data/catalog.json` と `icons_small/` を更新する |
| `npm run build` | `dist/` を生成する（ネットワーク不要） |

`.github/workflows/weekly-update.yml` が毎週 `npm run update` を実行し、変化があればコミットします。コミットを Cloudflare が拾って自動公開します。

## データ

- `data/repos.config.json` … 収集するリポジトリ一覧。追加・削除はここを編集する。
- `data/ja/` … 日本語の概要・機能・カテゴリ（人手とAIによる作成）。新しく現れたプラグインは、ここに追記するまで原文表示になる。
- `data/manus/` … 旧サイト（FF14 Tools Guide）の調査データのスナップショット（2026-08-15時点）。
- `data/guides.json` … 導入ガイドの本文。
- `icons_small/` … 56pxのアイコン。新しいプラグインの分は `npm run update` で自動追加される。

## 注意

ローカルにインストールされたプラグインの情報は一切含みません。FFXIVの外部ツール使用は利用規約で禁止されています。本サイトはファンによる情報整理で、スクウェア・エニックスおよび各開発者とは関係ありません。
