const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
let liveApp;
const server = http.createServer((req,res)=>{
 if(req.url==='/api/orders' && liveApp)return liveApp(req,res);
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.join(root,name);
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try {
 const page=await browser.newPage(), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [360,768,1440])for(const lang of ['ru','en']){
  await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/shop/`);
  assert.equal(await page.locator('[data-open]').count(),25);
  assert.equal(await page.locator('.hang-index').count(),0);
  await page.locator('[data-open]').first().click();await page.locator('[data-add]').click();await page.keyboard.press('Escape');
  await page.locator('#cartToggle').click();await page.locator('#cartOrder').click();
  assert.match(page.url(),new RegExp(`/${lang}/order/$`));
  assert.equal(await page.locator('#orderForm').isVisible(),true);
  assert.equal(await page.locator('#orderSummary .order-item').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SCREENSHOT_DIR&&lang==='ru')await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`dev4-order-${width}.png`),fullPage:true});
 }
 await page.goto(`${base}/ru/order/`);
 let calls=0, mode='failure', posted=[], release;
 await page.route('**/api/orders',async route=>{
  calls++;posted.push(route.request().postDataJSON());
  if(mode==='failure')return route.fulfill({status:503,json:{code:'ORDER_UNAVAILABLE'}});
  if(mode==='conflict'){
   const catalog=await page.evaluate(()=>JSON.parse(JSON.stringify(currentCatalog)));
   catalog.revision='new-revision';catalog.items.find(x=>x.id===posted.at(-1).items[0].id).price.ru+=100;
   return route.fulfill({status:409,json:{code:'CATALOG_CHANGED',catalog}});
  }
  await new Promise(r=>{release=r});
  return route.fulfill({status:201,json:{orderId:'TEST-ORDER-1'}});
 });
 await page.locator('#orderSubmit').click();assert.equal(calls,0);
 await page.locator('[name="name"]').fill('Test customer');await page.locator('[name="email"]').fill('test@example.test');
 await page.locator('[name="comment"]').fill('A test, not a real order');
 await page.locator('#orderSubmit').click();await page.waitForFunction(()=>document.querySelector('#orderForm').getAttribute('aria-busy')===null);
 assert.equal(calls,1);assert.equal(await page.locator('[name="name"]').inputValue(),'Test customer');assert.equal(await page.locator('#orderSummary .order-item').count(),1);
 mode='conflict';await page.locator('#orderSubmit').click();await page.waitForFunction(()=>!document.querySelector('#orderReview').hidden);
 assert.equal(calls,2);assert.equal(await page.locator('[name="comment"]').inputValue(),'A test, not a real order');
 mode='success';await page.locator('#orderSubmit').click();await page.waitForFunction(()=>document.querySelector('#orderSubmit').disabled);
 await page.evaluate(()=>document.querySelector('#orderForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await page.waitForTimeout(50);assert.equal(calls,3);release();
 await page.waitForFunction(()=>!document.querySelector('#orderSuccess').hidden);
 assert.equal(await page.locator('#orderNumber').textContent(),'TEST-ORDER-1');assert.equal(await page.evaluate(()=>localStorage.getItem('mcv-cart')),'[]');
 assert.ok(posted.every(x=>x.customer.email==='test@example.test'&&x.items.every(i=>Object.keys(i).join()==='id')));
 await page.goto(`${base}/en/order/`);assert.equal(await page.locator('#orderEmpty').isVisible(),true);assert.equal(await page.locator('#orderForm').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS Dev4 browser: RU/EN responsive checkout, validation, failure retention, changed catalog review, duplicate click, success and empty basket');
 await page.unroute('**/api/orders');
 const {createOrderApp}=await import('../server/app.mjs');let mailCount=0;
 liveApp=createOrderApp({siteOrigin:base,transport:{sendMail:async mail=>{mailCount++;assert.equal(mail.to,'victtoress@gmail.com');return {accepted:['victtoress@gmail.com'],rejected:[]}}}});
 await page.goto(`${base}/en/shop/`);await page.locator('[data-open]').first().click();await page.locator('[data-add]').click();await page.keyboard.press('Escape');
 await page.goto(`${base}/en/order/`);await page.locator('[name="name"]').fill('API integration');await page.locator('[name="email"]').fill('api@example.test');await page.locator('#orderSubmit').click();await page.waitForFunction(()=>!document.querySelector('#orderSuccess').hidden);assert.equal(mailCount,1);assert.deepEqual(errors,[]);
 console.log('PASS Dev4 browser-to-real-API integration (injected local transport, no external mail)');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
