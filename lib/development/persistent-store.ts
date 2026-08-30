import "server-only";

import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

type PersistedState = {
  version: 1;
  stores: Record<string, unknown>;
};

type DevelopmentGlobals = typeof globalThis & {
  __racPersistentDevelopmentState?: PersistedState;
  __racPersistentDevelopmentProxies?: WeakMap<object, object>;
};

const globals = globalThis as DevelopmentGlobals;
const storagePath = join(process.cwd(), ".rac-insutech-development-data.json");

function state(): PersistedState {
  if (globals.__racPersistentDevelopmentState) return globals.__racPersistentDevelopmentState;

  if (!existsSync(storagePath)) {
    globals.__racPersistentDevelopmentState = { version: 1, stores: {} };
    return globals.__racPersistentDevelopmentState;
  }

  try {
    const parsed = JSON.parse(readFileSync(storagePath, "utf8")) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.stores || typeof parsed.stores !== "object" || Array.isArray(parsed.stores)) {
      throw new Error("The file does not contain a recognised RAC development data store.");
    }
    globals.__racPersistentDevelopmentState = { version: 1, stores: parsed.stores as Record<string, unknown> };
    return globals.__racPersistentDevelopmentState;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`RAC development data could not be read safely: ${reason}. Restore ${storagePath} from a backup instead of continuing with an empty store.`);
  }
}

function save() {
  const serialised = JSON.stringify(state(), null, 2);
  const temporaryPath = `${storagePath}.tmp`;
  writeFileSync(temporaryPath, serialised, "utf8");
  renameSync(temporaryPath, storagePath);
}

function tracked<T extends object>(value: T): T {
  const proxies = globals.__racPersistentDevelopmentProxies ||= new WeakMap<object, object>();
  const existing = proxies.get(value);
  if (existing) return existing as T;

  const proxy = new Proxy(value, {
    get(target, property, receiver) {
      const result = Reflect.get(target, property, receiver);
      if (Array.isArray(target) && typeof result === "function" && ["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"].includes(String(property))) {
        return (...args: unknown[]) => {
          const response = Reflect.apply(result, target, args);
          save();
          return response;
        };
      }
      return result && typeof result === "object" ? tracked(result as object) : result;
    },
    set(target, property, next, receiver) {
      const response = Reflect.set(target, property, next, receiver);
      save();
      return response;
    },
    deleteProperty(target, property) {
      const response = Reflect.deleteProperty(target, property);
      save();
      return response;
    },
    defineProperty(target, property, descriptor) {
      const response = Reflect.defineProperty(target, property, descriptor);
      save();
      return response;
    },
  });
  proxies.set(value, proxy);
  return proxy;
}

/**
 * Durable storage used only when the project intentionally runs without a
 * configured Supabase instance. It keeps local development data across a
 * Next.js restart, but it is not a replacement for the production database.
 */
export function persistentDevelopmentStore<T extends object>(key: string, create: () => T): T {
  const current = state();
  if (!Object.prototype.hasOwnProperty.call(current.stores, key)) {
    current.stores[key] = create();
    save();
  }
  return tracked(current.stores[key] as T);
}

export function developmentStoreFilePath() {
  return storagePath;
}
