type Suffix = `/${string}`;

const keysOf = <T extends object>(obj: T) => Object.keys(obj) as Array<keyof T>;

const makeGroup =
  <P extends string>(prefix: P) =>
  <T extends Record<string, Suffix>>(defs: T) => {
    const out = {} as { [K in keyof T]: `${P}${T[K]}` };

    for (const k of keysOf(defs)) {
      out[k] = `${prefix}${defs[k]}` as `${P}${T[typeof k]}`;
    }

    return out;
  };

export const endpoints = {
  public: makeGroup("")({
    me: "/me",
  }),
} as const;
