import { afterAll, beforeAll } from 'vitest';
import { resolveObjectURL } from 'node:buffer';

// Run the REAL script worker (not a mock) under Vitest. Node has Blob URLs but
// no Worker, so this stands in a minimal one that evaluates the worker source
// with its own `self`. Call installNodeWorker() at the top of a test file.

class NodeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  private ready: Promise<{ onmessage?: (e: { data: unknown }) => void }>;
  constructor(url: string) {
    const blob = resolveObjectURL(url)!;
    this.ready = blob.text().then(code => {
      const self: { postMessage: (m: unknown) => void; onmessage?: (e: { data: unknown }) => void } = {
        postMessage: m => queueMicrotask(() => this.onmessage?.({ data: m })),
      };
      new Function('self', code)(self);
      return self;
    });
  }
  postMessage(data: unknown) {
    void this.ready.then(self => self.onmessage?.({ data }));
  }
  terminate() {}
}

export function installNodeWorker() {
  const g = globalThis as { Worker?: unknown };
  const real = g.Worker;
  beforeAll(() => { g.Worker = NodeWorker; });
  afterAll(() => { g.Worker = real; });
}
