import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePortfolio, renderPortfolio } from '../shared/portfolio.mjs';
const items=JSON.parse(await readFile(new URL('../src/data/portfolio.json',import.meta.url),'utf8'));
test('demo projects render readable RU/EN articles and hidden interactive controls',()=>{
 assert.equal(validatePortfolio(items).length,3);
 for(const lang of ['ru','en']){
  const html=renderPortfolio(items,lang,'../../');
  assert.equal((html.match(/data-book-panel /g)||[]).length,3);
  assert.equal((html.match(/data-book-trigger /g)||[]).length,3);
  assert.equal((html.match(/data-book-close hidden/g)||[]).length,3);
  assert.ok(html.includes(items[0].description[lang]));assert.ok(!html.includes('<img'));
 }
});
test('empty source, fourth project, optional image/link/year/role and escaping',()=>{
 const empty=renderPortfolio([],'ru');assert.ok(empty.includes('data-bookshelf-empty'));assert.ok(!empty.includes('data-book-trigger'));
 const fourth={...structuredClone(items[0]),id:'fourth',isDemo:false,year:2026,role:{ru:'Роль',en:'Role'},image:{src:'media/favicon.png',alt:{ru:'Изображение',en:'Image'}},url:'https://example.test/project',description:{ru:'<script>alert(1)</script>',en:'<script>alert(1)</script>'}};
 const html=renderPortfolio([...items,fourth],'ru','../../');
 assert.equal((html.match(/data-book-trigger /g)||[]).length,4);assert.ok(html.includes('src="../../media/favicon.png"'));assert.ok(html.includes('alt="Изображение"'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('rel="noopener"'));
});
test('bad IDs, duplicate IDs, invalid types, missing translations and unsafe URLs fail',()=>{
 for(const change of [{id:'../bad'},{type:'unknown'},{title:{ru:'Только RU'}},{isDemo:'yes'},{url:'javascript:alert(1)'},{image:{src:'../secret',alt:{ru:'A',en:'A'}}}])assert.throws(()=>validatePortfolio([{...items[0],...change}]));
 assert.throws(()=>validatePortfolio([items[0],items[0]]));assert.throws(()=>renderPortfolio(items,'de'));
});
