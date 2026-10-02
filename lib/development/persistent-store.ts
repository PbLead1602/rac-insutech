import "server-only";

type DevelopmentFileSystem = Pick<
  typeof import("node:fs"),
  "existsSync" | "readFileSync" | "renameSync" | "writeFileSync"
>;

type PersistedState = {
  version: 1;
  stores: Record<string, unknown>;
};

type DevelopmentGlobals = typeof globalThis & {
  __racPersistentDevelopmentState?: PersistedState;
  __racPersistentDevelopmentProxies?: WeakMap<object, object>;
};

const globals = globalThis as DevelopmentGlobals;
const storagePath = `${process.cwd()}/.rac-insutech-development-data.json`;

/**
 * The persistent development store is deliberately filesystem-backed only
 * when a developer has opted into mock integrations.  Do not statically
 * import Node's filesystem module here: every production repository imports
 * its mock branch, and a static import makes the Cloudflare Worker load the
 * Node compatibility filesystem implementation for live Supabase requests.
 *
 * Node 22 exposes built-ins lazily through `process.getBuiltinModule`.  The
 * call is reached only by local mock storage, so production code never
 * touches a filesystem capability.
 */
function developmentFileSystem(): DevelopmentFileSystem {
  const fs = process.getBuiltinModule?.("node:fs");
  if (!fs) {
    throw new Error("The filesystem-backed RAC development store is only available in local Node.js development.");
  }
  return fs as DevelopmentFileSystem;
}

function state(): PersistedState {
  if (globals.__racPersistentDevelopmentState) return globals.__racPersistentDevelopmentState;

  const fs = developmentFileSystem();
  if (!fs.existsSync(storagePath)) {
    globals.__racPersistentDevelopmentState = { version: 1, stores: {} };
    return globals.__racPersistentDevelopmentState;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(storagePath, "utf8")) as Partial<PersistedState>;
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
  const fs = developmentFileSystem();
  fs.writeFileSync(temporaryPath, serialised, "utf8");
  fs.renameSync(temporaryPath, storagePath);
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
