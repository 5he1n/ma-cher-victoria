// One-time migration helper. The catalog source of truth is catalog/works.json.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/gallery.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(source.replaceAll('const ', 'var '), context, { filename: 'gallery.js' });
await mkdir(new URL('../catalog/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../catalog/works.json', import.meta.url),
  `${JSON.stringify({ items: context.shop, images: context.IMAGE_META }, null, 2)}\n`,
);
