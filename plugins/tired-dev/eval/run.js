#!/usr/bin/env node
// 規約のあり / なしで同じ課題を書かせ、規約チェッカで採点する A/B 評価。
//
// 使い方:
//   node eval/run.js                      全課題を両条件で 1 回ずつ実行する
//   node eval/run.js --runs 3             同じ組み合わせを 3 回ずつ実行する
//   node eval/run.js --case bug-report    課題を 1 つだけ実行する
//   node eval/run.js --model sonnet       モデルを指定する
//   node eval/run.js --concurrency 4      同時に走らせる生成の数
//   node eval/run.js --report             生成済みの出力を採点し直すだけ
//
// 生成物は eval/out/<case>.<condition>.<run>.md に残す。
// 採点は決定論的だが、生成は毎回ぶれる。試行を重ねて中央値と範囲で見る。

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { lintText, summarize } = require('../tools/lint');
const { scoreText } = require('../tools/score');
const { report, CONDITIONS } = require('./report');

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(__dirname, '..');
const CASES_DIR = path.join(__dirname, 'cases');
const OUT_DIR = path.join(__dirname, 'out');

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
  return ['次の規約に従って書け。規約の本文を出力に含めるな。', '', skill, '', '---', '', caseText].join('\n');
}

// 生成は必ずリポジトリの外で走らせる。
// 同じ作業ツリーで走らせると、このリポジトリ向けのフックやプロジェクト設定を
// 子プロセスの claude が読み込み、ブロックメッセージが生成物に混ざる。
async function generate(prompt, model) {
  const args = ['-p', prompt, '--restricted'];
  if (model) args.push('--model', model);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'tired-dev-eval-'));
  try {
    const { stdout } = await execFileAsync('claude', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
      env: { ...process.env, AR_DISABLE_SIMPLIFY_GATE: '1' },
    });
    return stdout;
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

function outPath(id, condition, run) {
  return path.join(OUT_DIR, `${id}.${condition}.${run}.md`);
}

function score(id, condition, run, expect = []) {
  const file = outPath(id, condition, run);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const findings = lintText(text, path.basename(file));
  return { ...summarize(findings), chars: text.length, findings, coverage: scoreText(text, expect) };
}

// 同時実行数を抑えて順に消化する。claude をいくつも並べるとレート制限に当たる。
async function runPool(tasks, concurrency) {
  const queue = [...tasks];
  const failures = [];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      try {
        await task();
      } catch (e) {
        failures.push(e);
      }
    }
  });
  await Promise.all(workers);
  return failures;
}

function buildTasks(ids, runs, model) {
  const tasks = [];
  let done = 0;
  const total = ids.length * CONDITIONS.length * runs;
  for (const id of ids) {
    // frontmatter の expect は採点の答えなので、プロンプトには本文だけを渡す。
    const { body } = readCase(id);
    for (const condition of CONDITIONS) {
      for (let run = 1; run <= runs; run += 1) {
        tasks.push(async () => {
          const out = await generate(buildPrompt(condition, body), model);
          if (looksContaminated(out)) {
            throw new Error(
              `生成物に実行環境の出力が混ざった: ${id} / ${condition} / ${run} 回目\n先頭: ` +
                out.trim().split('\n').slice(0, 2).join(' / ')
            );
          }
          fs.writeFileSync(outPath(id, condition, run), out);
          done += 1;
          process.stderr.write(`生成 ${done}/${total}: ${id} / ${condition} / ${run} 回目\n`);
        });
      }
    }
  }
  return tasks;
}

function collect(ids, runs) {
  return ids.map((id) => {
    const { expect } = readCase(id);
    const row = { id, expect };
    for (const c of CONDITIONS) {
      row[c] = [];
      for (let run = 1; run <= runs; run += 1) {
        const s = score(id, c, run, expect);
        if (s) row[c].push(s);
      }
    }
    return row;
  });
}

// --report のときは何回分の出力が残っているか分からないので、ファイルを数えて拾う。
function countRuns(ids) {
  let max = 0;
  for (const id of ids) {
    for (const c of CONDITIONS) {
      for (let run = 1; run <= 50; run += 1) {
        if (fs.existsSync(outPath(id, c, run))) max = Math.max(max, run);
      }
    }
  }
  return max;
}

function intArg(argv, name, fallback) {
  if (!argv.includes(name)) return fallback;
  const value = Number.parseInt(argv[argv.indexOf(name) + 1], 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function main(argv) {
  const only = argv.includes('--case') ? argv[argv.indexOf('--case') + 1] : null;
  const model = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : null;
  const reportOnly = argv.includes('--report');
  const runs = intArg(argv, '--runs', 1);
  const concurrency = intArg(argv, '--concurrency', 4);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ids = listCases(only);
  if (ids.length === 0) {
    process.stderr.write('課題が見つからない。\n');
    return 2;
  }

  if (!reportOnly) {
    const failures = await runPool(buildTasks(ids, runs, model), concurrency);
    if (failures.length > 0) {
      for (const e of failures) process.stderr.write(`${e.message}\n`);
      process.stderr.write(`生成に失敗: ${failures.length} 件。残った出力だけで集計する。\n`);
    }
  }

  const effectiveRuns = reportOnly ? countRuns(ids) : runs;
  const rows = collect(ids, effectiveRuns);
  report(rows, effectiveRuns);

  const reportFile = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(reportFile, `${JSON.stringify(rows, null, 2)}\n`);
  process.stdout.write(`\n詳細: ${path.relative(ROOT, reportFile)}\n`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

module.exports = { buildPrompt, listCases, score, outPath };
