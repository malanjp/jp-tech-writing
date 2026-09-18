---
expect: bluf,file-ref,acceptance,out-of-scope,next-steps,quantified
---

# 課題: Issue の起票

次の材料をもとに、GitHub に起票する Issue の本文を日本語で書け。

- やりたいこと: 画像アップロードのサイズ上限を 5 MB から 20 MB に上げる
- 背景: 営業から月に 4 件の問い合わせが来ている
- 制約: S3 の直接アップロードに切り替える必要がある。現在はサーバ経由で、Cloud Run のリクエスト上限 32 MB に近い
- 影響: `apps/api/src/upload.ts` と `apps/web/src/components/Uploader.tsx`
- やらないこと: 動画のアップロード対応
- 完了の判定: 20 MB の画像がアップロードでき、既存の 5 MB 以下も壊れない
