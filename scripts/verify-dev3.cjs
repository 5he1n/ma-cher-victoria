const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
// Exercise the configuration branches without changing project files.
const buildSource = fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
const mediaFunction = buildSource.slice(buildSource.indexOf('function artistStatementMedia('), buildSource.indexOf('\nfunction content('));
const renderMedia = new Function('artistStatementImage','esc',mediaFunction+'; return artistStatementMedia;');
for(const lang of ['ru','en']) {
 const locale=JSON.parse(fs.readFileSync(path.join(root,`src/locales/${lang}.json`),'utf8'));
 const empty=renderMedia({src:''},String)(locale,'../../');
 assert.match(empty,/statement-media--empty/);assert.ok(!empty.includes('<img'));
 const photo=renderMedia({src:'photo.png',width:400,height:500,isPlaceholder:false},String)(locale,'../../');
 assert.ok(!photo.includes('figcaption'));assert.ok(photo.includes(locale.artistStatement.photoAlt));
}
const server = http.createServer((req,res)=>{
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
  page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
  for(const width of [360,768,860,861,1440])for(const lang of ['ru','en']) {
   await page.setViewportSize({width,height:1000});await page.goto(`${base}/${lang}/about/`);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('h1').textContent(),'Artist Statement');
   assert.equal(await page.locator('main .eyebrow').count(),0);
   assert.equal(await page.locator('.statement-text p').count(),4);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const image=page.locator('.statement-media img');
   assert.equal(await image.evaluate(el=>el.complete&&el.naturalWidth>0),true);
   const textBox=await page.locator('.statement-text').boundingBox();
   const mediaBox=await page.locator('.statement-media').boundingBox();
   if(width>=861)assert.ok(mediaBox.x>textBox.x+textBox.width-1);
   else assert.ok(mediaBox.y>=textBox.y+textBox.height);
   assert.match(await page.locator('.statement-media').textContent(),/AI/);
   assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 255, 255)');
   if(process.env.SCREENSHOT_DIR&&lang==='ru'&&[360,1440].includes(width))await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`dev3-${width}.png`),fullPage:true});
  }
  await page.goto(`${base}/ru/about/`);await page.locator('[data-locale="en"]').click();assert.match(page.url(),/\/en\/about\/$/);await page.reload();
  await page.goto(`${base}/ru/shop/`);await page.locator('[data-open]').first().click();await page.locator('[data-add]').click();await page.keyboard.press('Escape');
  await page.goto(`${base}/en/about/`);await page.locator('#cartToggle').click();assert.equal(await page.locator('.cart-item').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS Dev3: RU/EN, five viewport widths, columns, image, captions, reload, locale and cart');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
