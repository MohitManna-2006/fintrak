import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma CLI (migrate/introspect) should use the direct connection URL.
    url: env("DIRECT_URL"),
  },
});
