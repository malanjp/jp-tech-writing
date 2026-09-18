---
expect: bluf,file-ref,run-command,severity,diff-block,blast-radius,next-steps
---

# 課題: コードレビューの指摘

次の材料をもとに、PR へ書くレビュー指摘を日本語で書け。

- 対象: `apps/api/src/handlers/payment.ts:120-138`
- 問題: 決済 API の呼び出しが try-catch で囲まれ、catch 節が `return null` だけを返す
- 影響: 決済が失敗しても画面は成功として扱う。返金処理の記録も残らない
- 同じ書き方が `refund.ts:88` にもある
- 重大度: Critical
- 提案: 例外を握りつぶさず、失敗を呼び出し元へ伝える。ログに `orderId` を残す
- 検証: `pnpm --filter @example/api test src/handlers/payment.test.ts`
