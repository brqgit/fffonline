/**
 * Simple networking helpers used by the game client.
 *
 * The server exposes two communication channels:
 *   - HTTP REST endpoints under `/api` (e.g. `POST /api/purchase`).
 *   - A Socket.IO gateway for realtime events (served from `/socket.io`).
 *
 * This module centralises the logic for talking to those endpoints. Call
 * {@link connect} once to establish the WebSocket connection and register
 * listeners with {@link on}. The {@link send} function automatically chooses
 * between `fetch` (for HTTP paths starting with `/`) and Socket.IO events.
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * Ensure that a Socket.IO connection exists. The connection is lazily created
 * on first use so tests or scripts that only rely on HTTP do not pay the
 * websocket cost.
 *
 * @param {string} [url] - Optional websocket URL. Defaults to same origin.
 * @param {import('socket.io-client').SocketOptions} [opts] - Additional options.
 * @returns {import('socket.io-client').Socket}
 */
export function connect(url, opts = {}) {
  if (!socket) {
    socket = io(url, { autoConnect: false, ...opts });
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Register an event listener on the Socket.IO connection.
 *
 * @param {string} event - Event name (e.g. `move`, `turn`).
 * @param {(data: any) => void} handler - Handler function.
 */
export function on(event, handler) {
  connect();
  socket.on(event, handler);
}

/**
 * Disconnect the underlying websocket, if any.
 */
export function disconnect() {
  if (socket) socket.disconnect();
}

/**
 * Send data to the backend. When `target` looks like an HTTP path (starts with
 * `http://`, `https://` or `/`), a `fetch` request is performed. Otherwise the
 * call is treated as a Socket.IO event.
 *
 * Examples:
 *   await send('/api/purchase', { playerId: 'p1', itemId: 'sword', cost: 10 });
 *   send('move', { from: 'A', to: 'B' });
 *
 * @param {string} target - HTTP path or Socket.IO event name.
 * @param {any} [data] - Payload to send.
 * @param {object} [options]
 * @param {string} [options.method='POST'] - HTTP method when using fetch.
 * @returns {Promise<any>|void} Resolves with parsed JSON for HTTP calls.
 */
export async function send(target, data = undefined, options = {}) {
  const method = options.method || 'POST';

  if (/^(https?:\/\/|\/)/.test(target)) {
    // HTTP endpoint - use fetch
    const res = await fetch(target, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:
        data === undefined || method === 'GET' || method === 'HEAD'
          ? undefined
          : JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed (${res.status}): ${text}`);
    }
    // Try to parse JSON; ignore errors and return undefined for empty bodies
    try {
      return await res.json();
    } catch {
      return undefined;
    }
  }

  // WebSocket event via Socket.IO
  connect();
  socket.emit(target, data);
}

