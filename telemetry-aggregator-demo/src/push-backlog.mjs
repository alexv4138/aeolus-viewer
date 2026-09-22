import { open, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function pushBacklog({ archivePath, cursorPath, endpoint, apiKey, fetchImpl = fetch }) {
  if (!endpoint || !apiKey) return { sent: 0, configured: false };
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Ingestion endpoint must use HTTPS outside localhost.');
  if (apiKey.length < 32) throw new Error('Ingestion key must have at least 32 characters.');
  let offset = 0;
  try { offset = JSON.parse(await readFile(cursorPath, 'utf8')).offset; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid backlog cursor.');
  let size;
  try { size = (await stat(archivePath)).size; } catch (error) { if (error.code === 'ENOENT') return { sent: 0, configured: true }; throw error; }
  if (offset > size) throw new Error('Backlog archive is shorter than saved cursor; refusing to skip events.');
  if (offset === size) return { sent: 0, configured: true };
  const file = await open(archivePath, 'r');
  let sent = 0;
  try {
    while (offset < size) {
      const buffer = Buffer.alloc(Math.min(128_000, size - offset));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);
      if (!bytesRead) break;
      const lastNewline = buffer.lastIndexOf(10, bytesRead - 1);
      if (lastNewline < 0) throw new Error('Backlog row exceeds 128 KiB or is incomplete.');
      const complete = buffer.subarray(0, lastNewline + 1).toString('utf8');
      const lines = complete.trimEnd().split('\n');
      // Send at most 50 records per request; commit cursor after every accepted batch.
      let consumed = 0;
      for (let i = 0; i < lines.length; i += 50) {
        const part = lines.slice(i, i + 50);
        const rows = part.map(line => JSON.parse(line));
        const response = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ rows }), signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`Ingestion failed (${response.status}); backlog retained for retry.`);
        consumed += Buffer.byteLength(part.join('\n') + '\n');
        const next = offset + consumed;
        const tmp = `${cursorPath}.tmp`;
        await writeFile(tmp, JSON.stringify({ offset: next }), 'utf8');
        await rename(tmp, cursorPath);
        sent += rows.length;
      }
      offset += lastNewline + 1;
    }
  } finally { await file.close(); }
  return { sent, configured: true };
}
