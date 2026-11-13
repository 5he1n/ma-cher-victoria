import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { createOrderApp } from './app.mjs';
import { buildSmtpOptions } from './smtp.mjs';

function required(name) { if (!process.env[name]) throw new Error(`${name} must be configured`); return process.env[name]; }
export function createOrderServer(options = {}) {
  const transport = options.transport || nodemailer.createTransport(buildSmtpOptions(process.env), { from: required('SMTP_FROM') });
  return http.createServer(createOrderApp({ transport, siteOrigin: options.siteOrigin ?? required('SITE_ORIGIN'), trustProxy: options.trustProxy ?? process.env.TRUST_PROXY === 'true', ...options }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server=createOrderServer();
  server.requestTimeout=30_000;server.headersTimeout=10_000;
  server.listen(Number(process.env.PORT || 3100), '127.0.0.1');
}
