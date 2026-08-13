// File linking with the File System Access API so the app can pick up edits made
// externally (e.g. in VS Code). A plain <input type="file"> only yields a stale
// File snapshot; a FileSystemFileHandle lets us re-read the CURRENT on-disk
// contents via handle.getFile() on demand.

export interface PickedFile {
  handle: FileSystemFileHandle;
  name: string;
  content: string;
}

/** True when the browser supports the File System Access API (Chromium-based). */
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

/** Prompt the user to pick a file and return a live handle + its current content. */
export async function pickFile(): Promise<PickedFile | null> {
  if (!window.showOpenFilePicker) return null;
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: 'Script / text files',
        accept: { 'text/plain': ['.js', '.ts', '.txt', '.json'] },
      },
    ],
  });
  const content = await readHandle(handle);
  return { handle, name: handle.name, content };
}

/** Ensure we still have read permission for a handle (needed after reloads). */
export async function verifyPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'read' };
  if (handle.queryPermission && (await handle.queryPermission(opts)) === 'granted') return true;
  if (handle.requestPermission && (await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

/** Read the CURRENT on-disk contents of a handle (picks up external edits). */
export async function readHandle(handle: FileSystemFileHandle): Promise<string> {
  const ok = await verifyPermission(handle);
  if (!ok) throw new Error('Permission to read the linked file was denied.');
  const file = await handle.getFile();
  return file.text();
}
