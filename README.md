# jp-tech-writing

報告、タスク仕様、Issue 起票文、コードレビュー指摘、調査結果、PR コメントを日本語で書くための記述規約。
AI エージェントが出力する文章と、人が書いた原稿の推敲の両方に適用する。

判断の基準は一つだけ置く。
疲れているエンジニアが一読で理解でき、迷わず安全に次の行動に移せる文章かどうか。

規則の全文と標準出力フォーマットは `SKILL.md` にある。
README に規則を複製しない。

## インストール

[skills CLI](https://github.com/vercel-labs/skills) を使う。
`-g` を付けるとユーザー全体のスキルディレクトリに入り、すべてのプロジェクトで使える。
`-a` には使用するエージェントを指定する。

```bash
npx skills add malanjp/jp-tech-writing -g -a claude-code
```

CLI を使わない場合は、エージェントがスキルを読むディレクトリへ直接配置してもよい。
配置後、エージェントを再起動すると読み込まれる。

```bash
git clone git@github.com:malanjp/jp-tech-writing.git ~/.claude/skills/jp-tech-writing
```

## Claude Code のセッション全体に適用する

スキルはモデルが必要と判断したときだけ読み込まれる。
セッションの後半でドリフトさせたくない場合は、プラグインとして導入する。
`SessionStart` フックが適用対象を通知し、`UserPromptSubmit` フックが共有文章の作成・推敲依頼を検出したときだけ `rules/anchor.md` を注入する。

```
/plugin marketplace add malanjp/jp-tech-writing
/plugin install jp-tech-writing@malanjp
```

チャット返答の口調には干渉しない。
ゲートに該当しないプロンプトでは何も注入しないため、通常の会話のトークンは増えない。

## 使い方

報告、Issue 起票、レビュー指摘、推敲を依頼すると自動で参照される。
スキル名を明示する必要はない。

## ライセンス

MIT
