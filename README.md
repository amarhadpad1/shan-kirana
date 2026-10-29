1. npx wrangler login
2. npx wrangler d1 create shan-kirana-db
   Copy the database_id it prints into wrangler.toml.
3. npx wrangler d1 execute shan-kirana-db --remote --file=schema.sql
4. npx wrangler pages project create shan-kirana --production-branch main
   npx wrangler pages deploy
5. Open https://shan-kirana.pages.dev/admin and set the shop password straight away.