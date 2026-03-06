import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = "postgresql://postgres.iuqlwuncutjvqmsnlscd:18January%402006@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
const DIRECT_URL = "postgresql://postgres:18January%402006@db.iuqlwuncutjvqmsnlscd.supabase.co:5432/postgres";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString: DIRECT_URL });
    },
  },
  datasource: {
    url: DIRECT_URL,
  },
});