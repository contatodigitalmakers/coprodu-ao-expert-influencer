import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// O app não usa revalidação (revalidatePath/revalidateTag nem ISR): o cache de
// páginas pré-renderizadas só é lido, direto dos arquivos estáticos do build.
// Sem "enableCacheInterception", que não funciona com a pré-renderização parcial.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
