const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/')) name+='index.html';
 const file=path.join(root,name);
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try {
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 for(const width of [360,768,1440])for(const lang of ['ru','en']){
  await page.setViewportSize({width,height:900});await page.goto(`${base}/${lang}/`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const links=page.locator('main nav a');assert.equal(await links.count(),5);
  const expected=['about/','shop/?filter=print','shop/','portfolio/','contacts/'];
  for(let i=0;i<5;i++)assert.equal(new URL(await links.nth(i).getAttribute('href'),page.url()).href,`${base}/${lang}/${expected[i]}`);
  const widths=await links.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));assert.equal(new Set(widths).size,1);
  assert.equal(await page.locator('main svg').count(),6);
  assert.equal(await page.locator('.hero-social-placeholder[role="img"][aria-label]').count(),4);
  assert.equal(await page.locator('.hero-social-placeholder').evaluateAll(els=>els.every(el=>el.tabIndex===-1&&!el.hasAttribute('href'))),true);
  assert.equal(await page.locator('.hero-introduction').textContent(),lang==='ru'?'Моё имя Виктория – я художник':'My name is Victoria – I am an artist');
  assert.equal(await page.locator('main a[href^="https://www.instagram.com/"]').count(),1);
  assert.equal(await page.locator('main a[href^="mailto:"]').count(),1);
  assert.equal(await page.locator('main a[href="#"]').count(),0);
  assert.equal(await page.locator('main').textContent().then(t=>t.includes(lang==='ru'?'Моя цель в искусстве':'My aim in art')),false);
 }
 for(const lang of ['ru','en']) {
 await page.goto(`${base}/${lang}/shop/?filter=print&campaign=dev2`);
 assert.equal(await page.locator('[data-filter="print"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-open]').count(),0);
 assert.match(await page.locator('.state-empty').textContent(),lang==='ru'?/Принты скоро появятся/:/Prints are coming soon/);
 await page.reload();assert.equal(await page.locator('[data-filter="print"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-filter="original"]').click();assert.equal(new URL(page.url()).searchParams.get('campaign'),'dev2');
 assert.equal(await page.locator('[data-open]').count(),25);
 await page.goBack();assert.equal(await page.locator('[data-filter="print"]').getAttribute('aria-pressed'),'true');
 await page.goForward();assert.equal(await page.locator('[data-filter="original"]').getAttribute('aria-pressed'),'true');
 }
 await page.goto(`${base}/ru/shop/?filter=bogus&x=1`);assert.equal(await page.locator('[data-open]').count(),25);
 await page.locator('[data-filter="print"]').click();await page.locator('[data-locale="en"]').click();
 assert.match(page.url(),/\/en\/shop\/\?filter=print&x=1$/);assert.equal(await page.locator('[data-filter="print"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-filter="all"]').click();await page.locator('[data-open]').first().click();await page.locator('[data-add]').click();await page.keyboard.press('Escape');
 await page.goto(`${base}/ru/`);await page.locator('#cartToggle').click();assert.equal(await page.locator('.cart-item').count(),1);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS Dev2: responsive RU/EN home, links, icons, filters, reload, history, language, cart and resource checks');
 if(process.env.SCREENSHOT_DIR){for(const width of [360,1440]){await page.setViewportSize({width,height:1000});await page.goto(`${base}/ru/`);await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`dev2-${width}.png`),fullPage:true});}}
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
