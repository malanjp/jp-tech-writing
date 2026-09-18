// A/B 評価の集計と表示。
// 採点そのものは tools/lint.js と tools/score.js が行い、ここは並べ方だけを持つ。

const { checks } = require('../tools/score');

const CONDITIONS = ['without-rules', 'with-rules'];

function report(rows) {
  process.stdout.write('\n違反件数 (少ないほど規約に沿っている)\n\n');
  process.stdout.write('| 課題 | 規約なし | 規約あり | 差 |\n|---|---|---|---|\n');
  let sumWithout = 0;
  let sumWith = 0;
  for (const row of rows) {
    const a = row['without-rules'];
    const b = row['with-rules'];
    if (!a || !b) {
      process.stdout.write(`| ${row.id} | 未生成 | 未生成 | - |\n`);
      continue;
    }
    sumWithout += a.total;
    sumWith += b.total;
    const diff = b.total - a.total;
    process.stdout.write(`| ${row.id} | ${a.total} | ${b.total} | ${diff > 0 ? `+${diff}` : diff} |\n`);
  }
  process.stdout.write(`| **合計** | **${sumWithout}** | **${sumWith}** | **${sumWith - sumWithout}** |\n`);

  process.stdout.write('\n要素の充足 (多いほど規約が求める形になっている)\n\n');
  process.stdout.write('| 課題 | 規約なし | 規約あり | 規約ありで増えた要素 |\n|---|---|---|---|\n');
  let covWithout = 0;
  let covWith = 0;
  let covOf = 0;
  for (const row of rows) {
    const a = row['without-rules'];
    const b = row['with-rules'];
    if (!a || !b) continue;
    covWithout += a.coverage.count;
    covWith += b.coverage.count;
    covOf += b.coverage.of;
    const gained = b.coverage.present
      .filter((id) => !a.coverage.present.includes(id))
      .map((id) => checks[id].label);
    process.stdout.write(
      `| ${row.id} | ${a.coverage.count}/${a.coverage.of} | ${b.coverage.count}/${b.coverage.of} | ${gained.join('、') || 'なし'} |\n`
    );
  }
  process.stdout.write(`| **合計** | **${covWithout}/${covOf}** | **${covWith}/${covOf}** | |\n`);

  const byRule = {};
  for (const row of rows) {
    for (const c of CONDITIONS) {
      const s = row[c];
      if (!s) continue;
      for (const [rule, n] of Object.entries(s.byRule)) {
        byRule[rule] = byRule[rule] || { 'without-rules': 0, 'with-rules': 0 };
        byRule[rule][c] += n;
      }
    }
  }
  const rules = Object.keys(byRule).sort();
  if (rules.length > 0) {
    process.stdout.write('\n規則ごとの内訳\n\n| 規則 | 規約なし | 規約あり |\n|---|---|---|\n');
    for (const rule of rules) {
      process.stdout.write(`| ${rule} | ${byRule[rule]['without-rules']} | ${byRule[rule]['with-rules']} |\n`);
    }
  }
}

module.exports = { report, CONDITIONS };
