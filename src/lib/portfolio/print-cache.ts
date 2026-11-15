const memory = new Map<string, string>();
let database: Promise<IDBDatabase | null> | undefined;
function openCache() {
  database ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open("portfolio-public-print-previews", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("previews", { keyPath: "key" });
      store.createIndex("used", "used");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  }).catch(() => null);
  return database;
}
async function read(key: string) {
  if (memory.has(key)) return memory.get(key);
  const db = await openCache();
  if (!db) return undefined;
  return new Promise<string | undefined>((resolve) => {
    try {
      const request = db.transaction("previews").objectStore("previews").get(key);
      request.onsuccess = () =>
        resolve(typeof request.result?.value === "string" ? request.result.value : undefined);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}
async function save(key: string, value: string) {
  memory.set(key, value);
  if (memory.size > 64) memory.delete(memory.keys().next().value!);
  const db = await openCache();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction("previews", "readwrite"),
        store = transaction.objectStore("previews");
      store.put({ key, value, used: Date.now() });
      const count = store.count();
      count.onsuccess = () => {
        if (count.result > 64) {
          let left = count.result - 64;
          const cursor = store.index("used").openCursor();
          cursor.onsuccess = () => {
            if (cursor.result && left-- > 0) {
              cursor.result.delete();
              cursor.result.continue();
            }
          };
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
export async function cachedPublicPreview(key: string, build: () => Promise<string>) {
  const old = await read(key);
  if (old?.startsWith("data:image/")) {
    try {
      const image = new Image();
      image.src = old;
      await image.decode();
      if (image.naturalWidth) {
        memory.set(key, old);
        return { value: old, hit: true };
      }
    } catch {
      /* Rebuild damaged cache from the verified public asset. */
    }
  }
  const value = await build();
  await save(key, value);
  return { value, hit: false };
}
/** Bounded concurrency; document/image order is retained by callers. */
export async function mapPrintTasks<T>(
  items: T[],
  work: (item: T, index: number) => Promise<void>,
  limit = 2,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await work(items[i]!, i);
      }
    }),
  );
}
