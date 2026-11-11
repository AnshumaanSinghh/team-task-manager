import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pin, PinOff, Send, Sparkles, Timer, Heart, Trash2, Lock, Plus, CheckCircle2, Circle, Pencil, Play, RotateCcw, MessageSquare, ListChecks } from 'lucide-react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFocus } from '../context/FocusContext';
import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import TagInput from './ui/TagInput';
import BlockerPicker from './BlockerPicker';
import { DeadlineChip, PriorityBars, Segmented, StatusIcon } from './ui/Bits';
import { ESTIMATES, STATUSES, deadlineState, firstName, fmtClock, fmtDate, fmtDuration, openBlockers, relTime, toDateInput, toDeadlineISO } from '../lib/format';
import { celebrate } from '../lib/confetti';

const linkMentions = (text) => text.replace(/(^|\s)(@[\p{L}\p{N}._-]{2,40})/gu, '$1[$2](#mention)');

const mdComponents = {
  a: ({ href, children }) => (href === '#mention'
    ? <span className="mention">{children}</span>
    : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>)
};

function Section({ icon: Icon, title, right, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-subtle flex items-center gap-2"><Icon size={14} /> {title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Prop({ label, children }) {
  return (
    <div>
      <p className="label !mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function TitleField({ initial, onSave }) {
  const [value, setValue] = useState(initial);
  const commit = () => {
    const next = value.trim();
    if (!next) setValue(initial);
    else if (next !== initial) onSave(next);
  };
  return (
    <textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} rows={1} maxLength={200}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      className="w-full bg-transparent text-2xl font-bold font-display leading-tight outline-none resize-none rounded-lg -mx-2 px-2 py-1 hover:bg-surface-2 focus:bg-surface-2 field-sizing-content" aria-label="Task title" />
  );
}

export default function TaskDetailsModal({ task, tasks = [], members = [], onClose, onChange, onDelete }) {
  const { user, isAdmin } = useAuth();
  const focus = useFocus();
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(task.description || '');
  const [comments, setComments] = useState(null);
  const [comment, setComment] = useState('');
  const [mention, setMention] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [thinking, setThinking] = useState(false);
  const textRef = useRef(null);
  const pendingCaret = useRef(null);

  // Place the caret right after an inserted @mention, before the next keystroke is handled.
  useLayoutEffect(() => {
    if (pendingCaret.current === null || !textRef.current) return;
    textRef.current.focus();
    textRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [comment]);

  useEffect(() => {
    let alive = true;
    api.get(`/tasks/${task._id}/comments`).then((r) => alive && setComments(r.data)).catch(() => alive && setComments([]));
    return () => { alive = false; };
  }, [task._id]);

  const blockers = openBlockers(task, tasks);
  const blockerIds = (task.blockedBy || []).map((b) => String(b._id || b));
  const decisions = task.decisionLog || [];
  const isAssignee = String(task.assignedTo?._id || '') === String(user?._id);
  const gaveKudos = (task.kudos || []).some((k) => String(k.user?._id || k.user) === String(user?._id));
  const focusingHere = focus.focus && String(focus.focus.task?._id) === String(task._id);
  const tagSuggestions = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags || []))], [tasks]);

  const patch = async (body, success) => {
    try {
      const { data } = await api.put(`/tasks/${task._id}`, body);
      onChange(data);
      if (success) toast.success(success);
      return data;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save'));
      return null;
    }
  };

  const setStatus = async (status) => {
    if (status === task.status) return;
    const data = await patch({ status });
    if (data && status === 'Completed') {
      celebrate();
      toast.success('Shipped. Nice work.');
    }
  };

  const saveDesc = async () => {
    if (desc !== (task.description || '')) await patch({ description: desc }, 'Details updated');
    setEditingDesc(false);
  };

  // Checklist
  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter((s) => s.isCompleted).length;
  const toggleItem = (i) => patch({ subtasks: subtasks.map((s, j) => (j === i ? { ...s, isCompleted: !s.isCompleted } : s)) });
  const removeItem = (i) => patch({ subtasks: subtasks.filter((_, j) => j !== i) });
  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const ok = await patch({ subtasks: [...subtasks, { title: newItem.trim(), isCompleted: false }] });
    if (ok) setNewItem('');
  };

  // Comments + mentions
  const mentionToken = (m) => {
    const fn = firstName(m.name);
    const dup = members.filter((x) => firstName(x.name).toLowerCase() === fn.toLowerCase()).length > 1;
    return dup ? m.name.replace(/\s+/g, '') : fn;
  };
  const mentionOptions = mention
    ? members.filter((m) => m.name.toLowerCase().split(/\s+/).some((p) => p.startsWith(mention.query)) || m.name.toLowerCase().replace(/\s+/g, '').startsWith(mention.query)).slice(0, 5)
    : [];

  const onCommentChange = (e) => {
    const value = e.target.value;
    setComment(value);
    const caret = e.target.selectionStart;
    const m = value.slice(0, caret).match(/(^|\s)@([\p{L}\p{N}._-]*)$/u);
    setMention(m ? { query: m[2].toLowerCase(), start: caret - m[2].length - 1, caret, index: 0 } : null);
  };

  const insertMention = (m) => {
    const token = `@${mentionToken(m)} `;
    const next = comment.slice(0, mention.start) + token + comment.slice(mention.caret);
    pendingCaret.current = mention.start + token.length;
    setComment(next);
    setMention(null);
  };

  const sendComment = async (e) => {
    e?.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/tasks/${task._id}/comments`, { text: comment.trim() });
      setComments((c) => [data, ...(c || [])]);
      setComment('');
      setMention(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not post the comment'));
    }
  };

  const onCommentKey = (e) => {
    if (mention && mentionOptions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMention({ ...mention, index: (mention.index + 1) % mentionOptions.length }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMention({ ...mention, index: (mention.index - 1 + mentionOptions.length) % mentionOptions.length }); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mention.index]); return; }
      if (e.key === 'Escape') { e.stopPropagation(); setMention(null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendComment(e);
  };

  const removeComment = async (id) => {
    try {
      const { data } = await api.delete(`/tasks/${task._id}/comments/${id}`);
      setComments((c) => c.filter((x) => x._id !== id));
      onChange(data);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete the comment'));
    }
  };

  const toggleDecision = async (commentId) => {
    try {
      const { data } = await api.put(`/tasks/${task._id}/comments/${commentId}/decision`);
      onChange(data);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update decisions'));
    }
  };

  const toggleKudos = async () => {
    try {
      const { data } = await api.post(`/tasks/${task._id}/kudos`);
      onChange(data);
      if (!gaveKudos) celebrate({ y: 0.4, x: 0.8 });
    } catch (error) {
      toast.error(errorMessage(error, 'Could not send kudos'));
    }
  };

  const suggest = async () => {
    setThinking(true);
    try {
      const { data } = await api.get(`/tasks/${task._id}/suggest-next-step`);
      setSuggestions(data.suggestions || [data.suggestion]);
    } catch (error) {
      toast.error(errorMessage(error, 'No suggestion right now'));
    } finally {
      setThinking(false);
    }
  };

  const startFocus = async (minutes) => {
    const updated = await focus.start(task, minutes);
    if (updated) onChange(updated);
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      onDelete(task._id);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete the task'));
    }
  };

  const state = deadlineState(task.deadline, task.status);

  return (
    <Modal onClose={onClose} size="full" bodyClassName="p-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-surface-2/60">
        <div className="overflow-x-auto scroll-thin -my-1 py-1">
          <Segmented id={`status-${task._id}`} value={task.status} onChange={setStatus} size="sm"
            options={STATUSES.map((s) => ({ value: s, label: s, icon: <StatusIcon status={s} size={12} className={s === task.status ? '!text-current' : ''} /> }))} />
        </div>
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm text-muted" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] max-h-[calc(100vh-150px)] overflow-y-auto lg:overflow-visible scroll-thin">
        {/* Main column */}
        <div className="p-5 sm:p-6 space-y-7 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto scroll-thin">
          <div>
            {isAdmin ? (
              <TitleField key={task.title} initial={task.title} onSave={(title) => patch({ title }, 'Title updated')} />
            ) : (
              <h2 className="text-2xl font-bold leading-tight">{task.title}</h2>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-subtle">
              <PriorityBars priority={task.priority} showLabel />
              <span>·</span>
              <DeadlineChip state={state} date={fmtDate(task.deadline, { weekday: 'short', month: 'short', day: 'numeric' })} />
              {task.tags?.map((t) => <span key={t} className="text-accent-text font-semibold">#{t}</span>)}
            </div>
          </div>

          {blockers.length > 0 && (
            <div className="hazard border rounded-xl p-3.5">
              <p className="text-sm font-semibold flex items-center gap-2 mb-1.5"><Lock size={15} /> Waiting on {blockers.length} task{blockers.length === 1 ? '' : 's'}</p>
              <ul className="text-sm space-y-1">
                {blockers.map((b) => (
                  <li key={b._id} className="flex items-center gap-2"><StatusIcon status={b.status} size={13} /> {b.title}{b.assignedTo && <span className="text-muted">· {b.assignedTo.name}</span>}</li>
                ))}
              </ul>
              <p className="text-xs mt-2 opacity-80">This task cannot be completed until these are done.</p>
            </div>
          )}

          <Section icon={Pencil} title="Details" right={isAdmin && !editingDesc && <button type="button" onClick={() => { setDesc(task.description || ''); setEditingDesc(true); }} className="text-xs font-semibold text-accent-text hover:underline">Edit</button>}>
            {editingDesc ? (
              <div className="space-y-2">
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} maxLength={2000} className="input resize-y" autoFocus placeholder="Context, acceptance criteria, links. Markdown works." />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setDesc(task.description || ''); setEditingDesc(false); }} className="btn btn-sm">Cancel</button>
                  <button type="button" onClick={saveDesc} className="btn btn-sm btn-primary">Save</button>
                </div>
              </div>
            ) : task.description ? (
              <div className="prose-task rounded-xl border border-line bg-surface-2 p-4"><ReactMarkdown components={mdComponents}>{task.description}</ReactMarkdown></div>
            ) : (
              <p className="text-sm text-subtle italic">No details yet.</p>
            )}
          </Section>

          {decisions.length > 0 && (
            <Section icon={Pin} title="Key decisions">
              <div className="space-y-2">
                {decisions.map((d) => (
                  <motion.div layout key={d._id || d.commentId} className="relative rounded-xl border border-accent/30 bg-accent/[0.07] p-3.5 pl-4">
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-accent" />
                    <div className="prose-task"><ReactMarkdown components={mdComponents}>{linkMentions(d.text)}</ReactMarkdown></div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-subtle">
                      <span>Pinned by {d.markedBy?.name || 'an admin'} · {fmtDate(d.markedAt)}</span>
                      {isAdmin && <button type="button" onClick={() => toggleDecision(d.commentId)} className="flex items-center gap-1 hover:text-fg"><PinOff size={12} /> Unpin</button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Section>
          )}

          <Section icon={ListChecks} title="Checklist" right={subtasks.length > 0 && <span className="font-mono text-xs text-muted">{doneCount}/{subtasks.length}</span>}>
            {subtasks.length > 0 && (
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mb-3">
                <motion.div className="h-full bg-accent rounded-full" animate={{ width: `${(doneCount / subtasks.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
              </div>
            )}
            <ul className="space-y-1 mb-2">
              <AnimatePresence initial={false}>
                {subtasks.map((s, i) => (
                  <motion.li key={s._id || `${s.title}-${i}`} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    className="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2">
                    <button type="button" onClick={() => toggleItem(i)} aria-label={s.isCompleted ? 'Mark not done' : 'Mark done'} className="flex-none">
                      <motion.span key={String(s.isCompleted)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="grid">
                        {s.isCompleted ? <CheckCircle2 size={18} className="text-accent" /> : <Circle size={18} className="text-line-strong group-hover:text-subtle" />}
                      </motion.span>
                    </button>
                    <span className={`flex-1 text-sm ${s.isCompleted ? 'line-through text-subtle' : ''}`}>{s.title}</span>
                    <button type="button" onClick={() => removeItem(i)} className="opacity-0 group-hover:opacity-100 text-subtle hover:text-fg transition-opacity" aria-label="Remove item"><X size={14} /></button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <form onSubmit={addItem} className="flex gap-2">
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} maxLength={200} placeholder="Add a checklist item" className="input !py-2" />
              <button type="submit" disabled={!newItem.trim()} className="btn btn-sm btn-icon !mb-0" aria-label="Add item"><Plus size={16} /></button>
            </form>
          </Section>

          <Section icon={MessageSquare} title={`Discussion${comments?.length ? ` · ${comments.length}` : ''}`}>
            <form onSubmit={sendComment} className="relative mb-5">
              <textarea ref={textRef} value={comment} onChange={onCommentChange} onKeyDown={onCommentKey} rows={3} maxLength={1000}
                placeholder="Write a comment. Type @ to mention someone. Markdown works." className="input resize-none !pr-14" aria-label="Comment" />
              <button type="submit" disabled={!comment.trim()} className="btn btn-primary btn-icon btn-sm absolute right-2.5 bottom-3 !mb-0" aria-label="Send comment"><Send size={14} /></button>
              <AnimatePresence>
                {mention && mentionOptions.length > 0 && (
                  <motion.ul initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="absolute left-2 top-full mt-1 z-10 w-64 card p-1" role="listbox">
                    {mentionOptions.map((m, i) => (
                      <li key={m._id}>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left ${i === mention.index ? 'bg-accent/15 text-fg' : 'text-muted'}`}>
                          <Avatar name={m.name} size="sm" /> {m.name}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </form>

            {comments === null ? (
              <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-16" />)}</div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-subtle text-center py-6">No comments yet. Start the conversation.</p>
            ) : (
              <ul className="space-y-4">
                <AnimatePresence initial={false}>
                  {comments.map((c) => {
                    const pinned = decisions.some((d) => String(d.commentId) === String(c._id));
                    const mine = String(c.userId?._id) === String(user?._id);
                    return (
                      <motion.li key={c._id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="group flex gap-3">
                        <Avatar name={c.userId?.name} size="md" />
                        <div className={`flex-1 min-w-0 rounded-xl border p-3 ${pinned ? 'border-accent/40 bg-accent/[0.06]' : 'border-line bg-surface-2'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">{c.userId?.name}</span>
                            <span className="text-[11px] text-subtle">{relTime(c.createdAt)}</span>
                            {pinned && <span className="chip chip-accent !text-[10px]"><Pin size={10} /> Decision</span>}
                            <div className="flex-1" />
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              {isAdmin && (
                                <button type="button" onClick={() => toggleDecision(c._id)} className="text-[11px] font-semibold text-muted hover:text-accent-text flex items-center gap-1 px-1.5 py-0.5 rounded">
                                  {pinned ? <><PinOff size={11} /> Unpin</> : <><Pin size={11} /> Mark decision</>}
                                </button>
                              )}
                              {(mine || isAdmin) && (
                                <button type="button" onClick={() => removeComment(c._id)} className="text-muted hover:text-fg p-0.5" aria-label="Delete comment"><Trash2 size={12} /></button>
                              )}
                            </div>
                          </div>
                          <div className="prose-task"><ReactMarkdown components={mdComponents}>{linkMentions(c.text)}</ReactMarkdown></div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="border-t lg:border-t-0 lg:border-l border-line p-5 space-y-5 bg-surface-2/40 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto scroll-thin">
          <div className="rounded-2xl border border-line bg-surface p-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
            <p className="label flex items-center gap-1.5 relative"><Timer size={13} /> Focus</p>
            {focusingHere ? (
              <button type="button" onClick={focus.openOverlay} className="btn btn-primary w-full relative font-mono"><span className="live-dot !bg-accent-ink" /> {fmtClock(focus.remaining)} left</button>
            ) : (
              <div className="grid grid-cols-2 gap-2 relative">
                {[25, 50].map((m) => (
                  <button type="button" key={m} disabled={task.status === 'Completed'} onClick={() => startFocus(m)} className={`btn btn-sm ${m === 25 ? 'btn-primary' : 'btn-invert'}`}>
                    <Play size={13} className="fill-current" /> {m} min
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-subtle mt-1 relative">{task.timeSpent ? `${fmtDuration(task.timeSpent)} logged so far` : 'No focus time logged yet'}</p>
          </div>

          <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
            <p className="label flex items-center gap-1.5 !text-accent-text"><Sparkles size={13} /> Next best step</p>
            {suggestions ? (
              <>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <motion.li key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="text-sm leading-snug flex gap-2">
                      <span className="text-accent-text font-mono text-xs mt-0.5">{i + 1}.</span> {s}
                    </motion.li>
                  ))}
                </ul>
                <button type="button" onClick={suggest} className="mt-3 text-xs font-semibold text-accent-text flex items-center gap-1 hover:underline"><RotateCcw size={12} /> Re-check</button>
              </>
            ) : (
              <button type="button" onClick={suggest} disabled={thinking} className="btn btn-sm w-full">{thinking ? 'Reading the board…' : 'What should happen next?'}</button>
            )}
          </div>

          {task.status === 'Completed' && task.assignedTo && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="label flex items-center gap-1.5"><Heart size={13} /> Kudos</p>
              <div className="flex items-center gap-3">
                <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={toggleKudos} disabled={isAssignee}
                  className={`btn btn-sm ${gaveKudos ? 'btn-primary' : ''}`} title={isAssignee ? 'You cannot send yourself kudos' : undefined}>
                  <Heart size={14} className={gaveKudos ? 'fill-current' : ''} /> {gaveKudos ? 'Sent' : `Thank ${firstName(task.assignedTo.name)}`}
                </motion.button>
                <span className="text-xs text-subtle">{task.kudos?.length || 0} total</span>
              </div>
              {task.kudos?.length > 0 && <p className="text-xs text-muted mt-2">{task.kudos.map((k) => k.user?.name).filter(Boolean).join(', ')}</p>}
            </div>
          )}

          <Prop label="Owner">
            {isAdmin ? (
              <select value={task.assignedTo?._id || ''} onChange={(e) => patch({ assignedTo: e.target.value || null }, 'Owner updated')} className="input !py-2">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            ) : task.assignedTo ? (
              <span className="flex items-center gap-2 text-sm"><Avatar name={task.assignedTo.name} size="sm" /> {task.assignedTo.name}</span>
            ) : <span className="text-sm text-subtle">Unassigned</span>}
          </Prop>

          <Prop label="Due date">
            {isAdmin ? (
              <input type="date" value={toDateInput(task.deadline)} onChange={(e) => e.target.value && patch({ deadline: toDeadlineISO(e.target.value) }, 'Due date updated')} className="input !py-2 font-mono" />
            ) : <span className="text-sm font-mono">{fmtDate(task.deadline, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          </Prop>

          <Prop label="Priority">
            {isAdmin ? (
              <Segmented id={`prio-${task._id}`} size="sm" value={task.priority} onChange={(priority) => patch({ priority })} options={['Low', 'Medium', 'High']} />
            ) : <PriorityBars priority={task.priority} showLabel />}
          </Prop>

          <Prop label="Estimate">
            {isAdmin ? (
              <div className="flex flex-wrap gap-1">
                {ESTIMATES.map((n) => (
                  <button type="button" key={n} onClick={() => patch({ estimate: n })}
                    className={`w-8 h-8 rounded-lg font-mono text-xs border transition-all ${task.estimate === n ? 'bg-accent text-accent-ink border-accent shadow-[0_2px_0_0_var(--accent-edge)]' : 'border-line hover:border-line-strong'}`}>{n || '–'}</button>
                ))}
              </div>
            ) : <span className="text-sm font-mono">{task.estimate ? `${task.estimate} pts` : 'Not estimated'}</span>}
          </Prop>

          <Prop label="Tags">
            {isAdmin ? <TagInput value={task.tags || []} onChange={(tags) => patch({ tags })} suggestions={tagSuggestions} placeholder="Add a tag" />
              : task.tags?.length ? <div className="flex flex-wrap gap-1">{task.tags.map((t) => <span key={t} className="chip chip-accent">#{t}</span>)}</div>
                : <span className="text-sm text-subtle">None</span>}
          </Prop>

          <Prop label="Blocked by">
            {isAdmin ? <BlockerPicker tasks={tasks} value={blockerIds} excludeId={task._id} onChange={(blockedBy) => patch({ blockedBy })} />
              : blockerIds.length ? <ul className="text-sm space-y-1">{tasks.filter((t) => blockerIds.includes(t._id)).map((t) => <li key={t._id} className="flex items-center gap-2"><StatusIcon status={t.status} size={13} /> {t.title}</li>)}</ul>
                : <span className="text-sm text-subtle">Nothing</span>}
          </Prop>

          <div className="pt-4 border-t border-line text-xs text-subtle space-y-1">
            {task.createdBy?.name && <p>Created by {task.createdBy.name}</p>}
            <p>Created {fmtDate(task.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · updated {relTime(task.updatedAt)}</p>
            {task.completedAt && <p>Completed {fmtDate(task.completedAt, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
          </div>

          {isAdmin && <button type="button" onClick={remove} className="btn btn-sm w-full"><Trash2 size={14} /> Delete task</button>}
        </aside>
      </div>
    </Modal>
  );
}
