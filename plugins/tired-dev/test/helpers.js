// テスト共通のヘルパ。
// フックを子プロセスで実行し、標準出力を返す。
// CLAUDE_CONFIG_DIR を一時ディレクトリへ向け、利用者の ~/.claude を汚さない。

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

// テストごとに独立した状態ディレクトリを作る。
// gate.js はここに .tired-dev-state.json を書く。
function makeConfigDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tired-dev-test-'));
}

function runHook(hookName, input, configDir) {
  const script = path.join(PLUGIN_ROOT, 'hooks', `${hookName}.js`);
  return execFileSync(process.execPath, [script], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

// ゲートが命中したかどうかだけを見る。
function gateHits(prompt, configDir, sessionId = `s-${Math.random()}`) {
  const out = runHook('gate', { prompt, session_id: sessionId }, configDir);
  return out.trim().length > 0;
}

module.exports = { PLUGIN_ROOT, makeConfigDir, runHook, gateHits };
