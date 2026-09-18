// 規約のうち、正規表現で決定論的に判定できる項目だけを規則として持つ。
//
// 受動態の判別、事実と仮説の分離、見出しの具体性、「なぜ問題か」がメカニズムで
// 書かれているかは、正規表現では偽陽性が多くなるため意図的に入れていない。
// それらは人のレビューか、生成物どうしの比較で見る。

// 本文行だけを見る規則が使う判定。コードブロックと表と引用は対象外にする。
const SKIP_LINE = /^(\s*\||\s*>|\s*```)/;

// 著者自身の表現だけを見るため、判定の前に次を取り除く。
//   インラインコード: `foo.ts` — 識別子を漢字連結や矢印として数えない
//   カギかっこ: 「多くの」 — 禁止語を引用して説明する文を違反にしない
function stripQuoted(line) {
  return line.replace(/`[^`]*`/g, ' ').replace(/[「『][^」』]*[」』]/g, ' ');
}

const KANJI = '\\u4e00-\\u9fff';

const rules = [
  {
    id: 'vague-quantifier',
    section: '3-①',
    message: '曖昧な数量詞を使わず、件数や割合で書く',
    test: (line) => matchAll(line, /多くの|大幅に|かなり|さまざまな|様々な|いくつかの|ある程度/g),
  },
  {
    id: 'vague-why',
    section: '3-②',
    message: '抽象的な警告で止めず、どう壊れるかをメカニズムで書く',
    test: (line) => matchAll(line, /保守性が下がる|可読性が下がる|パフォーマンスに悪影響|品質が低下/g),
  },
  {
    id: 'fullwidth-paren',
    section: '表記',
    message: '全角かっこと全角コロンを使わず、半角に統一する',
    test: (line) => matchAll(line, /[（）：]/g),
  },
  {
    id: 'kanji-run',
    section: '5-⑤',
    message: '漢字が 6 文字以上続く複合語を分解する',
    test: (line) => matchAll(line, new RegExp(`[${KANJI}]{6,}`, 'g')),
  },
  {
    id: 'no-chain',
    section: '5-⑤',
    // 規約の目安は「の」が 3 つ。並列の列挙も 3 つで引っかかるため、
    // 機械判定では 4 つ以上だけを違反とする。
    message: '「の」が 4 つ以上続く修飾を分解する',
    test: (line) => matchAll(line, /(?:[^\s、。]{1,8}の){4,}/g),
  },
  {
    id: 'double-negative',
    section: '5-⑦',
    message: '二重否定を肯定形に直す',
    test: (line) => matchAll(line, /ない(?:わけ|こと)ではない|なくはない|ないことはない|なくもない/g),
  },
  {
    id: 'long-sentence',
    section: '2-②',
    message: '1 文が長い。「。」で切って 1 文 1 メッセージにする',
    // 規約の目安は 1 文 50〜60 文字。その 2 倍を超えたものだけを違反とし、
    // 列挙を含む文が毎回引っかかるのを避ける。
    test: (line) => {
      const hits = [];
      for (const sentence of splitSentences(line)) {
        if (sentence.trim().length > 120) hits.push(sentence.trim().slice(0, 24));
      }
      return hits;
    },
  },
  {
    id: 'arrow-note',
    section: '2-⑤',
    message: '矢印の走り書きをやめ、完全な文にする',
    test: (line) => matchAll(line, /[^\s`]+\.[a-z]{2,4}(?::\d+)?\s*[←→]/g),
  },
];

// 文書全体を見る規則。行単位では判定できないものを置く。
const documentRules = [
  {
    id: 'list-depth',
    section: '1-③',
    message: '箇条書きのネストは 2 階層まで',
    test: (lines) => {
      const hits = [];
      lines.forEach(({ text, no, inCode }) => {
        if (inCode) return;
        const m = text.match(/^(\s+)[-*+] /);
        if (m && m[1].length >= 4) hits.push({ line: no, found: text.trim().slice(0, 24) });
      });
      return hits;
    },
  },
  {
    id: 'conjunction-chain',
    section: '5-⑧',
    message: '接続詞で 3 つ以上続けてつながない。見出しかテーブルに昇格させる',
    test: (lines) => {
      const hits = [];
      let run = 0;
      let start = null;
      for (const { text, no, inCode } of lines) {
        if (inCode || !text.trim()) continue;
        if (/^(?:また|なお|さらに|そして|加えて)[、。]/.test(text.trim())) {
          run += 1;
          if (run === 1) start = no;
          if (run >= 3) hits.push({ line: start, found: '接続詞が 3 回続く' });
        } else {
          run = 0;
        }
      }
      return hits;
    },
  },
  {
    id: 'bluf-missing',
    section: '1-①',
    message: '冒頭に結論を置く。H1 の直後 3 行以内に本文がない',
    test: (lines) => {
      const body = lines.filter((l) => !l.inCode);
      const h1 = body.findIndex((l) => /^# /.test(l.text));
      if (h1 === -1) return [];
      const after = body.slice(h1 + 1, h1 + 5).filter((l) => l.text.trim());
      if (after.length === 0) return [{ line: body[h1].no, found: '本文なし' }];
      const first = after[0].text.trim();
      if (/^#{2,}/.test(first)) return [{ line: after[0].no, found: first.slice(0, 24) }];
      return [];
    },
  },
];

function matchAll(line, re) {
  return (line.match(re) || []).map((s) => s.slice(0, 24));
}

// 「。」で切る。ただしコード中のピリオドは対象外なので全角句点だけを見る。
function splitSentences(line) {
  return line.split('。');
}

module.exports = { rules, documentRules, SKIP_LINE, stripQuoted };
