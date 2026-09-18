#!/usr/bin/env node
// 規約のあり / なしで同じ課題を書かせ、規約チェッカで採点する A/B 評価。
//
// 使い方:
//   node eval/run.js                      全課題を両条件で実行する
//   node eval/run.js --case bug-report    課題を 1 つだけ実行する
//   node eval/run.js --model sonnet       モデルを指定する
//   node eval/run.js --report             生成済みの出力を採点し直すだけ
//
// 生成物は eval/out/<case>.<condition>.md に残す。
// 採点は決定論的だが、生成は毎回ぶれる。件数の差は 1 回の実行で断定しない。

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { lintText, summarize } = require('../tools/lint');
const { scoreText } = require('../tools/score');

const ROOT = path.resolve(__dirname, '..');
const CASES_DIR = path.join(__dirname, 'cases');
const OUT_DIR = path.join(__dirname, 'out');

const { report, CONDITIONS } = require('./report');

// 課題の frontmatter から、その文書に含まれるべき要素の id を読む。
// 本文にはプロンプトとして渡さない。
function readCase(id) {
  const raw = fs.readFileSync(path.join(CASES_DIR, `${id}.md`), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { body: raw, expect: [] };
  const expectLine = m[1].match(/^expect:\s*(.+)$/m);
  return {
    body: raw.slice(m[0].length).trim(),
    expect: expectLine ? expectLine[1].split(',').map((x) => x.trim()) : [],
  };
}

function buildPrompt(condition, caseText) {
  if (condition === 'without-rules') return caseText;
  const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
  return [
    '次の規約に従って書け。規約の本文を出力に含めるな。',
    '',
    skill,
    '',
    '---',
    '',
    caseText,
  ].join('\n');
}

// 生成は必ずリポジトリの外で走らせる。
// 同じ作業ツリーで走らせると、このリポジトリ向けのフックやプロジェクト設定が
// 子プロセスの claude に効き、ブロックメッセージが生成物に混ざる。
function generate(prompt, model) {
  const args = ['-p', prompt, '--restricted'];
  if (model) args.push('--model', model);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'tired-dev-docs-eval-'));
  try {
    return execFileSync('claude', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
      env: { ...process.env, AR_DISABLE_SIMPLIFY_GATE: '1' },
    });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

// 生成物にフックのブロックメッセージや設定の反響が混ざっていないかを見る。
// 混ざったまま採点すると、測っているのは文章ではなく実行環境になる。
function looksContaminated(text) {
  return /blocked by hook|Original prompt:|Not logged in|Please run \/login/i.test(text);
}

function listCases(only) {
  return fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .filter((id) => !only || id === only);
}

function outPath(id, condition) {
  return path.join(OUT_DIR, `${id}.${condition}.md`);
}

function score(id, condition, expect = []) {
  const file = outPath(id, condition);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const findings = lintText(text, path.basename(file));
  return {
    ...summarize(findings),
    chars: text.length,
    findings,
    coverage: scoreText(text, expect),
  };
}

function main(argv) {
  const only = argv.includes('--case') ? argv[argv.indexOf('--case') + 1] : null;
  const model = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : null;
  const reportOnly = argv.includes('--report');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ids = listCases(only);
  if (ids.length === 0) {
    process.stderr.write('課題が見つからない。\n');
    return 2;
  }

  if (!reportOnly) {
    for (const id of ids) {
      // frontmatter の expect は採点の答えなので、プロンプトには本文だけを渡す。
      const { body: caseText } = readCase(id);
      for (const condition of CONDITIONS) {
        process.stderr.write(`生成中: ${id} / ${condition}\n`);
        const out = generate(buildPrompt(condition, caseText), model);
        if (looksContaminated(out)) {
          throw new Error(
            `生成物に実行環境の出力が混ざった: ${id} / ${condition}\n` +
              '先頭: ' + out.trim().split('\n').slice(0, 2).join(' / ')
          );
        }
        fs.writeFileSync(outPath(id, condition), out);
      }
    }
  }

  const rows = ids.map((id) => {
    const { expect } = readCase(id);
    const row = { id, expect };
    for (const c of CONDITIONS) row[c] = score(id, c, expect);
    return row;
  });
  report(rows);

  const reportFile = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportFile, `${JSON.stringify(rows, null, 2)}\n`);
  process.stdout.write(`\n詳細: ${path.relative(ROOT, reportFile)}\n`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { buildPrompt, listCases, score };
