import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadCatalog, toBrowserCatalog } from '../shared/catalog.mjs';

export function buildBrowserCatalog(catalog) {
  const { items, images, revision } = toBrowserCatalog(catalog);
  return `// Generated from catalog/works.json. Do not edit directly.\nconst CATALOG_REVISION = ${JSON.stringify(revision)};\nconst IMAGE_META = ${JSON.stringify(images, null, 2)};\nconst shop = ${JSON.stringify(items, null, 2)};\n`;
}
export async function writeBrowserCatalog(output = new URL('../js/gallery.js', import.meta.url)) { const catalog = await loadCatalog(); await writeFile(output, buildBrowserCatalog(catalog)); return catalog; }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await writeBrowserCatalog();
