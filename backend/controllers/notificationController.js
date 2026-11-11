const Notification = require('../models/Notification');
const { httpError } = require('../lib/http');
const { isValidId } = require('../lib/access');

const getNotifications = async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).populate('actor', 'name').sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  res.json({ items, unread });
};

const markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ unread: 0 });
};

const markRead = async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(400, 'Invalid notification id');
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true } },
    { returnDocument: 'after' }
  );
  if (!item) throw httpError(404, 'Notification not found');
  res.json(item);
};

module.exports = { getNotifications, markAllRead, markRead };
