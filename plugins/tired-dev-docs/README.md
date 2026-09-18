# tired-dev-docs

疲れたエンジニアが一読で理解できる日本語の技術文書を書くための規約。
報告、タスク仕様、Issue 起票文、コードレビュー指摘、調査結果、PR コメントに適用する。
AI エージェントが出力する文章と、人が書いた原稿の推敲の両方が対象である。

判断の基準は一つだけ置く。
疲れているエンジニアが一読で理解でき、迷わず安全に次の行動に移せる文章かどうか。

規則の全文と標準出力フォーマットは `SKILL.md` にある。
README に規則を複製しない。

## インストール

[skills CLI](https://github.com/vercel-labs/skills) を使う。
`-g` を付けるとユーザー全体のスキルディレクトリに入り、すべてのプロジェクトで使える。
`-a` には使用するエージェントを指定する。

```bash
npx skills add malanjp/skills -g -a claude-code
```

CLI を使わない場合は、エージェントがスキルを読むディレクトリへ直接配置してもよい。
配置後、エージェントを再起動すると読み込まれる。

```bash
git clone git@github.com:malanjp/skills.git /tmp/malanjp-skills
cp -r /tmp/malanjp-skills/plugins/tired-dev-docs ~/.claude/skills/tired-dev-docs
```

## Claude Code のセッション全体に適用する

スキルはモデルが必要と判断したときだけ読み込まれる。
セッションの後半でドリフトさせたくない場合は、プラグインとして導入する。
`SessionStart` フックが適用対象を通知し、`UserPromptSubmit` フックが共有文章の作成・推敲依頼を検出したときだけ `rules/anchor.md` を注入する。

```
/plugin marketplace add malanjp/skills
/plugin install tired-dev-docs@malanjp
```

チャット返答の口調には干渉しない。
ゲートに該当しないプロンプトでは何も注入しないため、通常の会話のトークンは増えない。

## 使い方

報告、Issue 起票、レビュー指摘、推敲を依頼すると自動で参照される。
スキル名を明示する必要はない。

## ライセンス

MIT
