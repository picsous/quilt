interface MemoizeMap<T, U> {
  get(key: T): U;
  has(key: T): boolean;
  set(key: T, value: U): MemoizeMap<T, U>;
}

type Resolver<T extends Function> = T extends (...args: infer T) => any
  ? T
  : any;

export const MAX_MAP_ENTRIES = 50;

export default function memoize<F extends Function>(
  resolver?: Resolver<F>,
): MethodDecorator {
  return function<F>(
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<F>,
  ) {
    const method: F | undefined = descriptor.value;

    if (!method || !(method instanceof Function)) {
      return descriptor;
    }

    descriptor.value = memoized(method, resolver);
    return descriptor;
  };
}

function memoized<F extends Function>(method: F, resolver?: Resolver<F>): F {
  const weakMapCache = new WeakMap();
  const mapCache = new Map();

  return (function(...args) {
    if (typeof window === 'undefined') {
      return method.apply(this, args);
    }

    const useWeakMap =
      args.length === 1 && typeof args[0] === 'object' && !resolver;

    let key;
    if (useWeakMap) {
      key = args[0];
    } else if (resolver) {
      key = resolver(...args);
    } else {
      key = args[0];
    }

    const cache: MemoizeMap<any, any> = useWeakMap ? weakMapCache : mapCache;
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = method.apply(this, args);

    if (useWeakMap) {
      weakMapCache.set(key, result);
    } else {
      mapCache.set(key, result);

      if (mapCache.size > MAX_MAP_ENTRIES) {
        const oldestKey = mapCache.keys().next().value;
        mapCache.delete(oldestKey);
      }
    }

    return result;
  } as unknown) as F;
}
