// Node 22+ end-to-end test against a running GapNet server: REST auth, messages and WebSocket.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = (process.env.GAPNET_TEST_URL || 'http://127.0.0.1:8084').replace(/\/$/, '');
const webSocketBase = base.replace(/^http/, 'ws');
async function call(path, options = {}, token, expected = 200) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const raw = await response.text();
  let value; try { value = JSON.parse(raw); } catch { value = raw; }
  assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status}: ${raw.slice(0, 500)}`);
  return value;
}
function json(method, body) { return { method, body: JSON.stringify(body) }; }
function waitWebSocket(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 8000);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WebSocket failed')); }, { once: true });
  });
}
function waitEvent(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.removeEventListener('message', handler); reject(new Error('No expected WebSocket event')); }, 8000);
    function handler(event) {
      try {
        const data = JSON.parse(event.data);
        if (predicate(data)) { clearTimeout(timeout); socket.removeEventListener('message', handler); resolve(data); }
      } catch { /* ignore invalid messages */ }
    }
    socket.addEventListener('message', handler);
  });
}
let sockets = [];
try {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const account = async display_name => call('/api/auth/register/', json('POST', {
    username: `${display_name}_${suffix}`, display_name, password: 'SmokeTest@12345678', password_confirm: 'SmokeTest@12345678',
  }), undefined, 201);
  const a = await account('amir');
  const b = await account('sara');
  const c = await account('reza');
  console.log('✓ Three unique account registrations');
  const login = await call('/api/auth/login/', json('POST', { username: `@${a.user.username}`, password: 'SmokeTest@12345678' }));
  assert.ok(login.access);
  console.log('✓ Login by unique @username');
  const users = await call(`/api/users/?q=${suffix}`, {}, a.access);
  assert.ok(users.some(user => user.username === b.user.username));
  console.log('✓ Authenticated handle search');
  const conversation = await call('/api/conversations/', json('POST', { username: b.user.username }), a.access, 201);
  const duplicate = await call('/api/conversations/', json('POST', { username: a.user.username }), b.access);
  assert.equal(conversation.id, duplicate.id);
  console.log('✓ Private chat creation and deduplication');
  const wa = await call('/api/ws-ticket/', json('POST', {}), a.access);
  const wb = await call('/api/ws-ticket/', json('POST', {}), b.access);
  const socketA = new WebSocket(`${webSocketBase}/ws/chat/?ticket=${encodeURIComponent(wa.ticket)}`);
  const socketB = new WebSocket(`${webSocketBase}/ws/chat/?ticket=${encodeURIComponent(wb.ticket)}`);
  sockets = [socketA, socketB];
  await Promise.all(sockets.map(waitWebSocket));
  console.log('✓ Authenticated WebSocket connections');
  const typingPromise = waitEvent(socketB, e => e.type === 'typing' && e.conversation_id === conversation.id);
  socketA.send(JSON.stringify({ type: 'typing', conversation_id: conversation.id }));
  await typingPromise;
  console.log('✓ Realtime typing indicator');
  const messagePromise = waitEvent(socketB, e => e.type === 'message.created' && e.conversation_id === conversation.id);
  const nonce = randomUUID();
  const sent = await call(`/api/conversations/${conversation.id}/messages/`, json('POST', { text: 'سلام! پیام تستی', client_nonce: nonce }), a.access, 201);
  assert.ok(sent.id);
  const received = await messagePromise;
  assert.equal(received.message.id, sent.id);
  const retry = await call(`/api/conversations/${conversation.id}/messages/`, json('POST', { text: 'سلام! پیام تستی', client_nonce: nonce }), a.access);
  assert.equal(retry.id, sent.id);
  console.log('✓ Message HTTP 201 + realtime delivery + nonce idempotency');
  const list = await call(`/api/conversations/${conversation.id}/messages/`, {}, b.access);
  assert.equal(list.items.length, 1);
  await call(`/api/conversations/${conversation.id}/read/`, json('POST', {}), b.access);
  await call(`/api/conversations/${conversation.id}/messages/`, {}, c.access, 404);
  console.log('✓ Message history, read receipt and membership authorization');
  const edited = await call(`/api/messages/${sent.id}/`, json('PATCH', { text: 'ویرایش تست' }), a.access);
  assert.equal(edited.text, 'ویرایش تست');
  await call(`/api/messages/${sent.id}/`, json('DELETE', {}), a.access);
  console.log('✓ Edit and soft delete');
  console.log('\nAll GapNet smoke tests passed.');
} catch (error) {
  console.error('FAIL:', error);
  process.exitCode = 1;
} finally {
  for (const socket of sockets) socket.close();
}
