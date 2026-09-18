---
expect: bluf,file-ref,run-command,blast-radius,fact-vs-hypothesis,next-steps,quantified
---

# 課題: バグ調査結果の報告

次の材料をもとに、チームに共有する調査結果を日本語で書け。

- 症状: 管理画面の一覧が空になる。発生は 2026-09-10 から
- 再現: ログイン後に組織を切り替えたときだけ。組織 ID が 3 桁のときに限る
- 調査で分かったこと: `apps/web/src/lib/org.ts:42` の `parseOrgId()` が `Number()` を使い、先頭ゼロ付きの ID を 8 進数として解釈していた
- 未確認: 同じ関数を使う請求画面にも影響があるかもしれない
- 呼び出し元は 7 箇所
- 修正案: `Number.parseInt(value, 10)` に変える
- 検証: `pnpm --filter @example/web test src/lib/org.test.ts`
