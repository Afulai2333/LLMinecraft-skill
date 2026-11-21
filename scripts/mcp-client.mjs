#!/usr/bin/env node
/**
 * LLMinecraft MCP stdio bridge.
 *
 * MCP clients such as Claude Desktop speak JSON-RPC over stdin/stdout. The Minecraft mod
 * speaks Streamable HTTP. This script forwards one newline-delimited JSON message at a time
 * and writes the response back, preserving the optional Mcp-Session-Id.
 *
 * Configuration:
 *   LLMCRAFT_MCP_URL    default http://127.0.0.1:8765/mcp
 *   LLMCRAFT_MCP_TOKEN  optional bearer token
 *
 * Usage:
 *   node mcp-client.mjs                 # stdio bridge
 *   node mcp-client.mjs call get_state '{}'
 *   node mcp-client.mjs call goto '{"x":0,"z":0}'
 */

import readline from 'node:readline';

const URL = process.env.LLMCRAFT_MCP_URL || 'http://127.0.0.1:8765/mcp';
const TOKEN = process.env.LLMCRAFT_MCP_TOKEN || '';
let sessionId = null;

function headers() {
  const h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  if (sessionId) h['Mcp-Session-Id'] = sessionId;
  return h;
}

async function rpc(message) {
  const response = await fetch(URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(message),
  });
  const sid = response.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  if (response.status === 202 || response.status === 204) return null;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  const type = response.headers.get('content-type') || '';
  if (type.includes('text/event-stream')) {
    const messages = [];
    for (const event of text.split(/\n\n/)) {
      const data = event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) messages.push(JSON.parse(data));
    }
    return messages.length === 1 ? messages[0] : messages;
  }
  if (!text) return null;
  return JSON.parse(text);
}

async function callTool(name, args) {
  return rpc({
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name, arguments: args },
  });
}

if (process.argv[2] === 'call') {
  const name = process.argv[3];
  if (!name) {
    console.error('usage: node mcp-client.mjs call <tool> [json-args]');
    process.exit(2);
  }
  const args = process.argv[4] ? JSON.parse(process.argv[4]) : {};
  try {
    const response = await callTool(name, args);
    if (response?.result?.content) {
      for (const item of response.result.content) {
        if (item.type === 'text') console.log(item.text);
        else if (item.type === 'image') console.log(`[image ${item.mimeType}, ${item.data.length} base64 chars]`);
      }
      if (response.result.isError) process.exitCode = 1;
    } else {
      console.log(JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error(`mcp-client: ${error.message}`);
    process.exitCode = 1;
  }
  process.exit();
}

async function eventStreamLoop() {
  while (true) {
    try {
      const response = await fetch(URL, {
        method: 'GET',
        headers: { ...headers(), Accept: 'text/event-stream' },
      });
      if (!response.ok || !response.body) {
        throw new Error(`event stream HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n');
          if (data) {
            process.stdout.write(data + '\n');
          }
        }
      }
    } catch {
      // Server may not be up yet, or the client may not support GET SSE.
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let chain = Promise.resolve();
eventStreamLoop();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  chain = chain.then(async () => {
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch (error) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${error.message}` },
      }) + '\n');
      return;
    }
    try {
      const response = await rpc(message);
      if (response !== null && response !== undefined) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (error) {
      const id = message && Object.hasOwn(message, 'id') ? message.id : null;
      if (id !== null && id !== undefined) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: error.message },
        }) + '\n');
      }
    }
  });
});

rl.on('close', () => {
  chain.finally(() => process.exit());
});
