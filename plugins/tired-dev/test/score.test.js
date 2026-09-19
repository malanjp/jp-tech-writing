// 加点チェッカのテスト。
// 要素が「ある」ケースと「ない」ケースの両方を置く。
// 偽陰性は採点を過小評価するため、ある側のバリエーションを厚くする。

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreText } = require('../tools/score');

function has(text, id) {
  return scoreText(text, [id]).present.includes(id);
}

test('複数列のテーブルを検出する', () => {
  assert.ok(has('| 項目 | 値 |\n|---|---|\n| 件数 | 3 |', 'table'));
  assert.ok(has('| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |', 'table'));
});

test('1 列のテーブルを検出する', () => {
  assert.ok(has('| 項目 |\n|---|\n| 件数 |', 'table'));
});

test('揃え指定つきの区切り行を検出する', () => {
  assert.ok(has('| 項目 | 値 |\n|:---|---:|\n| 件数 | 3 |', 'table'));
});

test('テーブルのない文書では検出しない', () => {
  assert.ok(!has('対象は 3 件である。\n呼び出し元は 2 箇所。', 'table'));
  // 区切り行のないパイプだけの行はテーブルではない。
  assert.ok(!has('コマンドは `ls | grep foo` である。', 'table'));
});
