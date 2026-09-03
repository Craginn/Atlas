// Minimal dependency-free router: method + "/path/:param" patterns. Routes are
// tried in registration order, so literal routes (e.g. /api/projects/import)
// must be registered before a parameterized route that would also match
// (/api/projects/:id). No wildcard support — the API surface is small and fixed.

export function createRouter() {
  const routes = [];

  function compile(pattern) {
    const names = [];
    const source = pattern
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        if (segment.startsWith(':')) {
          names.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    return { regex: new RegExp(`^/?${source}/?$`), names };
  }

  function add(method, pattern, handler) {
    routes.push({ method, ...compile(pattern), handler });
  }

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    put: (pattern, handler) => add('PUT', pattern, handler),
    patch: (pattern, handler) => add('PATCH', pattern, handler),
    delete: (pattern, handler) => add('DELETE', pattern, handler),

    /** Dispatch req/res to the first matching route. True when a route matched. */
    async handle(req, res) {
      const { pathname } = new URL(req.url || '/', 'http://local');
      for (const route of routes) {
        if (route.method !== req.method) continue;
        const match = route.regex.exec(pathname);
        if (!match) continue;
        const params = {};
        route.names.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        await route.handler(req, res, params);
        return true;
      }
      return false;
    },
  };
}
