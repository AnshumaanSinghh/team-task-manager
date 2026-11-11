const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { httpError } = require('../lib/http');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const serializeFocus = (focus) => {
  if (!focus?.task || !focus.endsAt) return null;
  return {
    task: focus.task._id ? { _id: focus.task._id, title: focus.task.title } : { _id: focus.task },
    project: focus.project,
    startedAt: focus.startedAt,
    endsAt: focus.endsAt
  };
};

const serializeUser = (user, token) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  focus: serializeFocus(user.focus),
  ...(token ? { token } : {})
});

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) throw httpError(400, 'Please add all required fields');
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw httpError(400, 'Invalid input');
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw httpError(400, 'Please provide a valid email address');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (password.length > 128) throw httpError(400, 'Password cannot exceed 128 characters');
  if (!cleanName || cleanName.length > 100) throw httpError(400, 'Name must be 1-100 characters');

  const exists = await User.findOne({ email: cleanEmail });
  if (exists) throw httpError(400, 'User already exists with this email');

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password,
    role: role === 'Admin' ? 'Admin' : 'Member'
  });

  res.status(201).json(serializeUser(user, generateToken(user._id)));
};

const loginUser = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || !(await user.matchPassword(password))) throw httpError(401, 'Invalid email or password');

  res.json(serializeUser(user, generateToken(user._id)));
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('focus.task', 'title');
  if (user.focus?.endsAt && user.focus.task && !user.focus.task._id) user.focus.task = null;
  res.json(serializeUser(user));
};

const getUsers = async (req, res) => {
  const users = await User.find({}).select('name email role createdAt').sort({ name: 1 });
  res.json(users);
};

module.exports = { registerUser, loginUser, getMe, getUsers, serializeFocus };
