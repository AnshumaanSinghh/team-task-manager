// Small in-memory fixed-window rate limiter (per process). Good enough for
// brute-force protection on auth routes without an extra dependency.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many attempts. Please wait a few minutes and try again.' } = {}) {
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
    return next();
  };
}

module.exports = { rateLimit };
