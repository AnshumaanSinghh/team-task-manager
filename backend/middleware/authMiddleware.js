const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  if (!req.user) return res.status(401).json({ message: 'User no longer exists' });
  return next();
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') return next();
  return res.status(403).json({ message: 'Only admins can do that' });
};

module.exports = { protect, admin };
