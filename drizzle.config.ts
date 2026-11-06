import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRATIONS ?? "",
  },
  // Só gerenciamos o schema "public"; "auth" e os papéis (roles) são do Supabase.
  schemaFilter: ["public"],
  entities: {
    roles: { provider: "supabase" },
  },
});
