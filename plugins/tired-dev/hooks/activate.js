#!/usr/bin/env node
// tired-dev — SessionStart フック
//
// セッション開始時に、スキルの発火条件だけを短く通知する。
// 規約の全文はここで注入しない。UserPromptSubmit のゲートが命中したときに
// rules/anchor.md を注入し、詳細が要るときだけ SKILL.md を読ませる。

const path = require('path');
const { ROOT, readInput } = require('./lib');

readInput();

process.stdout.write(
  [
    'tired-dev:tech-writing 有効。日本語の技術文章の記述規約。',
    '',
    '適用対象: 報告、調査結果、Issue 起票文、PR の description とレビュー指摘、',
    'docs 配下の Markdown、ADR、README、仕様書、障害報告、リリースノート。',
    '人が書いた原稿の推敲依頼にも適用する。',
    '',
    '適用しない対象: 短いチャット返答、確認質問、コードとコマンドの出力、',
    'エッセイや SNS 投稿などの技術報告以外の文章。',
    '',
    '上記に該当する文章を書く前に、tired-dev:tech-writing の規約を読んでから書く。',
    `規約の正本: ${path.join(ROOT, 'SKILL.md')}`,
    `要約: ${path.join(ROOT, 'rules', 'anchor.md')}`,
  ].join('\n')
);
