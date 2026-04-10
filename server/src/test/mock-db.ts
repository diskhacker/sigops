let _results: unknown[][] = [];
let _index = 0;

export function queueResults(rows: unknown[][]): void {
  _results = rows;
  _index = 0;
}

export function resetMockDb(): void {
  _results = [];
  _index = 0;
}

function makeChain(): any {
  let done = false;
  let value: unknown[] = [];
  const get = () => {
    if (!done) {
      value = _results[_index++] ?? [];
      done = true;
    }
    return value;
  };
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "limit",
    "offset",
    "orderBy",
    "set",
    "values",
    "leftJoin",
    "innerJoin",
    "groupBy",
    "having",
  ]) {
    chain[m] = () => chain;
  }
  chain.returning = () => Promise.resolve(get());
  chain.then = (ok: any, err: any) => Promise.resolve(get()).then(ok, err);
  return chain;
}

export const mockDb = {
  select: () => makeChain(),
  insert: () => makeChain(),
  update: () => makeChain(),
  delete: () => makeChain(),
};

export const mockAuthMiddleware = {
  requireAuth: async (c: any, next: any) => {
    c.set("user", { sub: "u-1", tid: "t-1", email: "x@y.z", name: "U", roles: [], perms: [] });
    c.set("tenantId", "t-1");
    await next();
  },
};
