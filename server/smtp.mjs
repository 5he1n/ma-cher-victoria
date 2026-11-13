function required(env, name) {
  if (!env[name]) throw new Error(`${name} must be configured`);
  return env[name];
}

function smtpPort(value, secure) {
  const port = Number(value || (secure ? 465 : 587));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT must be a valid TCP port');
  return port;
}

/**
 * Build the production SMTP transport settings. Plain SMTP is never permitted:
 * port 465 uses implicit TLS, while every other configured transport upgrades
 * via mandatory STARTTLS before authentication or sending mail.
 */
export function buildSmtpOptions(env = process.env) {
  const secure = env.SMTP_SECURE === 'true';
  return {
    host: required(env, 'SMTP_HOST'),
    port: smtpPort(env.SMTP_PORT, secure),
    secure,
    requireTLS: !secure,
    auth: { user: required(env, 'SMTP_USER'), pass: required(env, 'SMTP_PASS') },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  };
}
