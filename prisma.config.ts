import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// explicitly load .env.local
config({ path: ".env.local" });

const prismaDbMode = process.env.PRISMA_DB_MODE === "schema" ? "schema" : "runtime";
const runtimeUrl = process.env.DATABASE_URL;
const schemaUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!runtimeUrl) {
  throw new Error("DATABASE_URL is required in .env.local");
}

if (!schemaUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required in .env.local");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // runtime mode uses pooled URL; schema mode uses direct URL.
    url: prismaDbMode === "schema" ? schemaUrl : runtimeUrl,
  },
});
