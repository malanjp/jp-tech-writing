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

## 検証

規約が守られているかを 3 つの層で確かめる。依存パッケージは追加していない。

```bash
# 前提: plugins/tired-dev-docs で実行
npm test          # フックの判定と規約チェッカのテスト
npm run lint      # 規約本体が自身の規約を満たすかの検査
```

`tools/lint.js` は書いてはいけない表現を検出する。
曖昧な数量詞、全角かっこ、漢字の連結、二重否定、接続詞の連鎖などを行単位で指摘する。
受動態の判別や事実と仮説の分離は正規表現では偽陽性が多いため、意図的に対象から外してある。

`tools/score.js` は書いてあるべき要素の充足を測る。
冒頭の結論、ファイルと行番号、実行できる検証コマンド、受け入れ条件、影響範囲などを見る。

```bash
node tools/lint.js draft.md
node tools/score.js draft.md --expect bluf,file-ref,run-command
```

## 規約の効果を測る

`eval/` は同じ課題を規約あり / なしの 2 条件で書かせ、上の 2 つで採点する。

```bash
# 前提: plugins/tired-dev-docs で実行。claude CLI と課金が必要
node eval/run.js --runs 5 --model sonnet   # 各条件 5 回ずつ生成する
node eval/run.js --report                  # 生成済みの出力を採点し直す
```

生成は毎回ぶれる。1 回の実行では差が逆転することもあるため、`--runs` で試行を重ね、
中央値と最小 - 最大で読む。同時実行数は `--concurrency` で変える。初期値は 4 である。

判断には違反件数より「要素ごとの出現回数」を見る。
違反件数は表記の統一が大半を占め、文章の質を代表しない。

生成は必ずリポジトリの外の一時ディレクトリで走らせる。
同じ作業ツリーで走らせると、このリポジトリ向けのフックが子プロセスの `claude` に効き、
ブロックメッセージが生成物に混ざって、文章ではなく実行環境を測ることになる。

## ライセンス

MIT
