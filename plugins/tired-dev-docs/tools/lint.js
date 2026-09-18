#!/usr/bin/env node
// tired-dev-docs の規約チェッカ。
//
// 使い方:
//   node tools/lint.js <file...>          違反を人が読む形式で出す
//   node tools/lint.js --json <file...>   機械可読な JSON で出す
//   cat draft.md | node tools/lint.js -   標準入力を読む
//
// 違反が 1 件でもあれば終了コード 1 を返す。

const fs = require('node:fs');
const { rules, documentRules, SKIP_LINE, stripQuoted } = require('./rules');

// コードブロックと frontmatter の内側を除外するため、行ごとに状態を持たせる。
// frontmatter の description はスキルの起動条件であって、読者に見せる本文ではない。
function annotate(text) {
  const raw = text.split('\n');
  let inCode = false;
  let inFrontmatter = raw[0] !== undefined && raw[0].trim() === '---';
  return raw.map((line, i) => {
    if (inFrontmatter) {
      const done = i > 0 && line.trim() === '---';
      const entry = { text: line, no: i + 1, inCode: true };
      if (done) inFrontmatter = false;
      return entry;
    }
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      return { text: line, no: i + 1, inCode: true };
    }
    return { text: line, no: i + 1, inCode };
  });
}

function lintText(text, file = '<stdin>') {
  const lines = annotate(text);
  const findings = [];

  for (const { text: line, no, inCode } of lines) {
    if (inCode || SKIP_LINE.test(line) || !line.trim()) continue;
    const target = stripQuoted(line);
    for (const rule of rules) {
      for (const found of rule.test(target)) {
        findings.push({ file, line: no, rule: rule.id, section: rule.section, message: rule.message, found });
      }
    }
  }

  for (const rule of documentRules) {
    for (const hit of rule.test(lines)) {
      findings.push({
        file,
        line: hit.line,
        rule: rule.id,
        section: rule.section,
        message: rule.message,
        found: hit.found,
      });
    }
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}

// 規則ごとの件数。A/B 比較で使う。
function summarize(findings) {
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  return { total: findings.length, byRule };
}

function readTarget(target) {
  if (target === '-') return fs.readFileSync(0, 'utf8');
  return fs.readFileSync(target, 'utf8');
}

function main(argv) {
  const asJson = argv.includes('--json');
  const targets = argv.filter((a) => a !== '--json');
  if (targets.length === 0) {
    process.stderr.write('対象ファイルを指定する。標準入力を読む場合は - を渡す。\n');
    return 2;
  }

  const all = [];
  for (const target of targets) {
    all.push(...lintText(readTarget(target), target));
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ findings: all, summary: summarize(all) }, null, 2)}\n`);
  } else if (all.length === 0) {
    process.stdout.write('違反なし\n');
  } else {
    for (const f of all) {
      process.stdout.write(`${f.file}:${f.line}: [${f.rule}] ${f.message} (${f.section}) — ${f.found}\n`);
    }
    const { total, byRule } = summarize(all);
    const breakdown = Object.entries(byRule)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${id} ${n}`)
      .join(', ');
    process.stdout.write(`\n違反 ${total} 件: ${breakdown}\n`);
  }

  return all.length > 0 ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { lintText, summarize };
