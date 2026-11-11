const Notification = require('../models/Notification');

// Fan a notification out to users, skipping the actor. Never throws:
// a failed notification must not fail the request that triggered it.
async function notify({ users, actor, type, message, project, task }) {
  try {
    const actorId = actor ? String(actor._id || actor) : null;
    const ids = [...new Set((users || []).filter(Boolean).map((u) => String(u._id || u)))]
      .filter((id) => id !== actorId);
    if (ids.length === 0) return;
    await Notification.insertMany(ids.map((user) => ({
      user,
      actor: actorId,
      type,
      message: message.slice(0, 300),
      project,
      task
    })));
  } catch (error) {
    console.error('Notification failed:', error.message);
  }
}

module.exports = { notify };
