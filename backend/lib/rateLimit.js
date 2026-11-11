// Small in-memory fixed-window rate limiter (per process). Good enough for
// brute-force protection on auth routes without an extra dependency.
// With skipSuccessful, only failed requests (4xx/5xx) count, so a busy office or
// classroom behind one IP is never locked out by people signing in correctly.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, skipSuccessful = false, message = 'Too many attempts. Please wait a few minutes and try again.' } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (hits.size > 10000) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ message });
    }
    if (skipSuccessful) {
      const counted = entry;
      res.on('finish', () => {
        if (res.statusCode < 400 && counted.count > 0) counted.count -= 1;
      });
    }
    return next();
  };
}

module.exports = { rateLimit };
