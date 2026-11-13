import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { createOrderApp, createMemoryRateLimiter } from '../server/app.mjs';
import { loadCatalog } from '../shared/catalog.mjs';
import { buildSmtpOptions } from '../server/smtp.mjs';
import { MAX_ORDER_ITEMS } from '../shared/order-policy.mjs';

const origin='https://example.test';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));
const catalog=await loadCatalog();
const available=catalog.items.find(item=>item.status!=='sold');
const availableItems=catalog.items.filter(item=>item.status!=='sold');
function payload(overrides={}) {
 return {locale:'ru',items:[{id:available.id}],catalogRevision:catalog.revision,requestId:randomUUID(),customer:{name:'Test customer',email:'customer@example.test',phone:'',comment:'Test only'},website:'',...overrides};
}
async function api(options={}) {
 const messages=[];
 const transport={sendMail:async message=>{messages.push(message);return {accepted:['victtoress@gmail.com'],rejected:[]}}};
 const server=http.createServer(createOrderApp({transport,siteOrigin:origin,rateLimiter:createMemoryRateLimiter({limit:100}),...options}));
 const port=await listen(server);
 return {messages,server,post:(body,headers={})=>fetch(`http://127.0.0.1:${port}/api/orders`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)})};
}

test('canonical pricing, recipient, currency and customer fields',async()=>{
 const app=await api();try {
 const order=payload({locale:'en',price:1,to:'attacker@example.test',items:[{id:available.id,price:1}]});
 assert.equal((await app.post(order)).status,201);
 assert.equal(app.messages.length,1);assert.equal(app.messages[0].to,'victtoress@gmail.com');assert.equal(app.messages[0].replyTo,order.customer.email);
 assert.ok(app.messages[0].text.includes(`${available.price.en} EUR`));assert.ok(app.messages[0].text.includes('Total:'));
 }finally{await close(app.server)}
});
test('validation, origin, content type, size and spam',async()=>{
 const app=await api();try {
 for(const order of [payload({items:[]}),payload({items:[{id:'missing'}]}),payload({items:[{id:available.id},{id:available.id}]}),payload({customer:{name:'A\r\nB',email:'a@example.test'}}),payload({customer:{name:'A',email:'invalid'}})])assert.equal((await app.post(order)).status,400);
 assert.equal((await app.post(payload(),{Origin:'https://evil.test'})).status,403);
 assert.equal((await app.post(payload(),{'Content-Type':'text/plain'})).status,415);
 assert.equal((await app.post('x'.repeat(20000))).status,413);
 assert.equal((await app.post(payload({website:'spam'}))).status,204);assert.equal(app.messages.length,0);
 }finally{await close(app.server)}
});
test('order limit accepts twenty works and rejects the twenty-first without sending mail',async()=>{
 assert.ok(availableItems.length>=MAX_ORDER_ITEMS+1,'fixture must contain at least 21 available works');
 const app=await api();try {
  const accepted=await app.post(payload({items:availableItems.slice(0,MAX_ORDER_ITEMS).map(item=>({id:item.id}))}));
  assert.equal(accepted.status,201);assert.equal(app.messages.length,1);
  const rejected=await app.post(payload({items:availableItems.slice(0,MAX_ORDER_ITEMS+1).map(item=>({id:item.id}))}));
  assert.equal(rejected.status,400);
  assert.deepEqual(await rejected.json(),{code:'ORDER_LIMIT_EXCEEDED',maxItems:MAX_ORDER_ITEMS});
  assert.equal(app.messages.length,1);
 }finally{await close(app.server)}
});
test('price revision and sold items require review and send no message',async()=>{
 const app=await api();try {
 let r=await app.post(payload({catalogRevision:'0'.repeat(64)}));assert.equal(r.status,409);let body=await r.json();assert.equal(body.catalog.revision,catalog.revision);
 r=await app.post(payload({items:[{id:catalog.items.find(i=>i.status==='sold').id}]}));assert.equal(r.status,409);assert.equal((await r.json()).code,'ITEM_UNAVAILABLE');assert.equal(app.messages.length,0);
 }finally{await close(app.server)}
});
test('duplicate requests are deduplicated; changed payload cannot reuse ID',async()=>{
 const app=await api();try {
 const order=payload();const [a,b]=await Promise.all([app.post(order),app.post(order)]);assert.equal(a.status,201);assert.deepEqual(await a.json(),await b.json());assert.equal(app.messages.length,1);
 assert.equal((await app.post({...order,customer:{...order.customer,name:'Different'}})).status,409);
 }finally{await close(app.server)}
});
test('mail failure/rejection does not report success and allows retry',async()=>{
 let count=0;const app=await api({transport:{sendMail:async()=>{if(++count===1)throw new Error('offline');return {accepted:['victtoress@gmail.com'],rejected:[]}}}});try{
 const order=payload();assert.equal((await app.post(order)).status,503);assert.equal((await app.post(order)).status,201);
 }finally{await close(app.server)}
 const rejected=await api({transport:{sendMail:async()=>({accepted:[],rejected:['victtoress@gmail.com']})}});try{assert.equal((await rejected.post(payload())).status,503)}finally{await close(rejected.server)}
});
test('rate limit returns 429',async()=>{
 const app=await api({rateLimiter:createMemoryRateLimiter({limit:1})});try{assert.equal((await app.post(payload())).status,201);assert.equal((await app.post(payload())).status,429)}finally{await close(app.server)}
});
test('Nodemailer sends a real SMTP conversation to a local capture server only',async()=>{
 const received=[];const sockets=new Set();
 const smtp=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');
  let pending='',data=false,message='';
  socket.on('data',chunk=>{pending+=chunk;let index;while((index=pending.indexOf('\r\n'))>=0){const line=pending.slice(0,index);pending=pending.slice(index+2);
   if(data){if(line==='.'){received.push(message);message='';data=false;socket.write('250 accepted\r\n')}else message+=line+'\r\n';continue;}
   if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 PIPELINING\r\n');
   else if(/^DATA/.test(line)){data=true;socket.write('354 Send data\r\n')}
   else if(/^QUIT/.test(line)){socket.end('221 Bye\r\n')}
   else socket.write('250 OK\r\n');
  }});
 });
 const port=await listen(smtp);
 const transport=nodemailer.createTransport({host:'127.0.0.1',port,secure:false,ignoreTLS:true,connectionTimeout:2000,socketTimeout:2000},{from:'orders@example.test'});
 const app=await api({transport});try{
 assert.equal((await app.post(payload())).status,201);assert.equal(received.length,1);assert.match(received[0],/To: victtoress@gmail.com/);assert.match(received[0],/Reply-To: customer@example.test/);assert.match(received[0],/From: orders@example.test/);
 }finally{await close(app.server);transport.close();for(const s of sockets)s.destroy();await close(smtp)}
});
test('SMTP options require TLS for both supported transport modes',()=>{
 const base={SMTP_HOST:'smtp.example.test',SMTP_USER:'orders',SMTP_PASS:'secret'};
 const implicit=buildSmtpOptions({...base,SMTP_PORT:'465',SMTP_SECURE:'true'});
 assert.equal(implicit.secure,true);assert.equal(implicit.requireTLS,false);assert.equal(implicit.tls.rejectUnauthorized,true);
 const starttls=buildSmtpOptions({...base,SMTP_PORT:'587',SMTP_SECURE:'false'});
 assert.equal(starttls.secure,false);assert.equal(starttls.requireTLS,true);assert.equal(starttls.tls.rejectUnauthorized,true);
 const defaultStarttls=buildSmtpOptions({...base,SMTP_PORT:'587'});
 assert.equal(defaultStarttls.secure,false);assert.equal(defaultStarttls.requireTLS,true);
});
test('a production STARTTLS transport refuses SMTP without STARTTLS before AUTH or mail commands',async()=>{
 const commands=[];const sockets=new Set();
 const smtp=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');
  let pending='';socket.on('data',chunk=>{pending+=chunk;let index;while((index=pending.indexOf('\r\n'))>=0){const line=pending.slice(0,index);pending=pending.slice(index+2);commands.push(line);
   if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 PIPELINING\r\n');
   else if(/^STARTTLS/.test(line))socket.write('454 TLS unavailable\r\n');
   else if(/^QUIT/.test(line))socket.end('221 Bye\r\n');
   else socket.write('250 OK\r\n');
  }});
 });
 const port=await listen(smtp);
 const transport=nodemailer.createTransport(buildSmtpOptions({SMTP_HOST:'127.0.0.1',SMTP_PORT:String(port),SMTP_SECURE:'false',SMTP_USER:'orders',SMTP_PASS:'secret'}),{from:'orders@example.test'});
 const app=await api({transport});try {
  assert.equal((await app.post(payload())).status,503);
  assert.ok(commands.some(command=>/^STARTTLS/.test(command)));
  assert.ok(!commands.some(command=>/^(AUTH|MAIL FROM|RCPT TO|DATA)/.test(command)));
 }finally{await close(app.server);transport.close();for(const socket of sockets)socket.destroy();await close(smtp)}
});
