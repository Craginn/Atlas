// HTTP plumbing shared by the API routes: JSON responses, request-body parsing
// with a size cap, CORS for local cross-origin clients (the Vite dev server and
// this API run on different ports during development), and a typed error.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, payload) {
  // 204 responses must not carry a body.
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

// 25 MB — generous enough for large script files and full project snapshots.
const BODY_LIMIT_BYTES = 25 * 1024 * 1024;

/** Read and parse a JSON request body. Throws HttpError on missing/bad input. */
export async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) {
      throw new HttpError(413, 'Request body too large.');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    throw new HttpError(400, 'Request body must be JSON.');
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

/** Allow local/cross-origin HTML clients to call the API directly. */
export function allowCrossOrigin(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
