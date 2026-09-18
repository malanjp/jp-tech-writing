// tired-dev フック共通処理
// stdin の JSON 読み取りと、アンカーファイルの読み込みを提供する。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANCHOR_PATH = path.join(ROOT, 'rules', 'anchor.md');

// Claude Code はフック入力を JSON で stdin に渡す。
// TTY 実行や空入力でも落とさず、空オブジェクトを返す。
function readInput() {
  try {
    if (process.stdin.isTTY) return {};
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readAnchor() {
  try {
    return fs.readFileSync(ANCHOR_PATH, 'utf8').trim();
  } catch {
    return null;
  }
}

module.exports = { ROOT, ANCHOR_PATH, readInput, readAnchor };
