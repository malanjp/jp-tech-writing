---
name: jp-tech-writing
description: 報告、タスク仕様、Issue 起票文、コードレビュー指摘、調査結果、PR コメントを日本語で書くための記述規約。You MUST invoke this skill BEFORE writing or editing any Japanese text longer than 3 sentences that will be shared with humans — Linear の Issue 起票 / コメント / follow-up、GitHub の PR タイトル / description / レビュー返信、docs/ 配下の Markdown、ADR、README、仕様書、調査レポート、障害報告、リリースノートを含む。これらの文書を直す依頼、たとえば「推敲して」「校正して」「読みやすくして」「この文章どう？」proofread / rewrite in Japanese でも、スキル名が明示されなくても必ず参照する。エージェント自身が日本語の報告や指摘を出力する前にも自己適用し、結論を冒頭に置き、見出しを具体的にし、事実と仮説と対応方針を分離し、抽象的な比喩と誇張を避け、定量的に書き、そのまま実行できる検証コマンドと受け入れ条件を添える。お世辞、定型挨拶、実況中継は出さない。短い返答、単文の確認質問、コードやコマンドの出力には不要。エッセイ、小説、SNS 投稿など、技術報告以外の文章には適用しない。
---

# jp-tech-writing (プラグイン入口)

規約の正本はリポジトリルートの [`SKILL.md`](../../SKILL.md) である。
このファイルは Claude Code プラグインが `skills/` 配下を読むための入口にすぎない。
規約の本文をここへ複製しない。

直ちにルートの `SKILL.md` を開き、その規約に従って書く。

ドリフト防止用の要約は [`rules/anchor.md`](../../rules/anchor.md) にある。
フックが注入するのは要約だけで、正本の代わりにはならない。
