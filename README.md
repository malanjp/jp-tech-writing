# malanjp/skills

malanjp が使う Claude Code プラグインとスキルを置くリポジトリ。
プラグインは `plugins/` 配下にあり、それぞれが独立した規約とフックを持つ。

## 収録プラグイン

| プラグイン | 収録スキル | 内容 |
|---|---|---|
| [`tired-dev`](plugins/tired-dev/) | `tech-writing` | 疲れたエンジニアが一読で理解できる日本語の技術文書を書くための規約 |

## Claude Code に導入する

マーケットプレイスとして追加し、使うプラグインだけを個別に入れる。

```
/plugin marketplace add malanjp/skills
/plugin install tired-dev@malanjp
```

各プラグインの詳細と、プラグインを使わずスキルとして導入する手順は、
それぞれのディレクトリの README に書いてある。

## ライセンス

MIT
