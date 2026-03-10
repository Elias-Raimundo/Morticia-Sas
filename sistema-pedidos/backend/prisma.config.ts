import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://neondb_owner:npg_zeRyp7HOSxm2@ep-wispy-hill-a4rqpikj-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});
