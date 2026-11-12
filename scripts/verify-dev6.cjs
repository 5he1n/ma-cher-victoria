const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.join(root,name);
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try {
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
 const buttons=page.locator('[data-book-trigger]'),panels=page.locator('[data-book-panel]');
 const visiblePanels=()=>panels.evaluateAll(els=>els.filter(el=>!el.hidden).length);
 for(const width of [360,768,1440])for(const lang of ['ru','en']){
  await page.setViewportSize({width,height:1000});await page.mouse.move(0,0);await page.goto(`${base}/${lang}/portfolio/`);
  assert.equal(await page.locator('h1').count(),1);assert.equal(await buttons.count(),3);
  assert.equal(await visiblePanels(),0);assert.equal(await page.locator('.is-enhanced').count(),1);
  await buttons.first().click();assert.equal(await buttons.first().getAttribute('aria-expanded'),'true');assert.equal(await visiblePanels(),1);
  if(process.env.SCREENSHOT_DIR&&lang==='ru'){
    await page.waitForFunction(()=>!document.querySelector('[data-book-panel].is-opening'));
    await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`dev6-${width}.png`),fullPage:true});
  }
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right}))),[]);
  await buttons.first().click();assert.equal(await visiblePanels(),0);
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/ru/portfolio/`);
 await buttons.first().hover();assert.equal(await visiblePanels(),1);
 await page.locator('h1').hover();assert.equal(await visiblePanels(),0);
 await buttons.first().click();await buttons.nth(1).hover();assert.equal(await buttons.first().getAttribute('aria-expanded'),'true');
 await buttons.nth(1).click();assert.equal(await buttons.nth(1).getAttribute('aria-expanded'),'true');assert.equal(await visiblePanels(),1);
 await page.locator('[data-book-panel]:not([hidden]) [data-book-close]').focus();await page.keyboard.press('Escape');assert.equal(await visiblePanels(),0);assert.equal(await buttons.nth(1).evaluate(el=>el===document.activeElement),true);
 await buttons.first().focus();await page.keyboard.press('Enter');assert.equal(await visiblePanels(),1);
 await page.keyboard.press('Space');assert.equal(await visiblePanels(),0);
 await buttons.first().click();await page.locator('[data-book-panel]:not([hidden])').click({position:{x:20,y:60}});assert.equal(await visiblePanels(),1);
 await page.locator('[data-book-panel]:not([hidden]) [data-book-close]').click();assert.equal(await visiblePanels(),0);
 await buttons.first().click();await page.locator('h1').click();assert.equal(await visiblePanels(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await buttons.first().click();assert.equal(await page.locator('.is-opening').count(),0);
 await page.locator('[data-locale="en"]').click();assert.match(page.url(),/\/en\/portfolio\/$/);await page.reload();
 await page.goto(`${base}/en/about/`);assert.equal(await page.locator('script[src*="portfolio.js"]').count(),0);
 const noJs=await browser.newContext({javaScriptEnabled:false});const fallback=await noJs.newPage();await fallback.goto(`${base}/ru/portfolio/`);
 assert.equal(await fallback.locator('[data-book-panel]').evaluateAll(els=>els.filter(el=>!el.hidden).length),3);
 assert.equal(await fallback.locator('[data-book-trigger]:not([hidden])').count(),0);await noJs.close();
 const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:360,height:800}});const mobile=await touch.newPage();await mobile.goto(`${base}/ru/portfolio/`);await mobile.locator('[data-book-trigger]').first().tap();assert.equal(await mobile.locator('[data-book-trigger]').first().getAttribute('aria-expanded'),'true');await mobile.locator('[data-book-trigger]').first().tap();assert.equal(await mobile.locator('[data-book-trigger]').first().getAttribute('aria-expanded'),'false');await touch.close();
 const {renderPortfolio}=await import('../shared/portfolio.mjs');const demos=JSON.parse(fs.readFileSync(path.join(root,'src/data/portfolio.json'),'utf8'));
 const fixture=await browser.newPage({viewport:{width:360,height:800}});
 const fixtureHtml=items=>`<html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${base}/css/site.css"><link rel="stylesheet" href="${base}/css/portfolio.css"></head><body><main class="layout">${renderPortfolio(items,'ru',base+'/')}</main></body></html>`;
 await fixture.setContent(fixtureHtml([...demos,{...demos[0],id:'fourth-project',image:{src:'media/favicon.png',alt:{ru:'Пример изображения',en:'Example image'}}}]));await fixture.addScriptTag({url:base+'/js/portfolio.js'});assert.equal(await fixture.locator('[data-book-trigger]').count(),4);await fixture.locator('[data-book-trigger]').last().click();assert.equal(await fixture.locator('[data-book-panel]:not([hidden]) img').evaluate(el=>el.complete&&el.naturalWidth>0),true);assert.equal(await fixture.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await fixture.setContent(fixtureHtml([]));await fixture.addScriptTag({url:base+'/js/portfolio.js'});assert.equal(await fixture.locator('[data-bookshelf-empty]').count(),1);assert.equal(await fixture.locator('[data-book-trigger]').count(),0);await fixture.close();
 await page.goto(`${base}/ru/shop/`);await page.locator('[data-open]').first().click();await page.locator('[data-add]').click();await page.keyboard.press('Escape');await page.goto(`${base}/en/portfolio/`);await page.locator('#cartToggle').click();assert.equal(await page.locator('.cart-item').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS Dev6: RU/EN, responsive shelf, hover/pin, keyboard/focus, outside close, reduced motion, touch, no-JS fallback, locale and cart');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
