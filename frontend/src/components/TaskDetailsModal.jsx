import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, CheckCircle2, Circle, Clock, Tag, AlignLeft, User, ListTodo, Plus, MessageSquare, Send, Pin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function TaskDetailsModal({ task, onClose, onUpdate, userRole }) {
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  React.useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await api.get(`/tasks/${task._id}/comments`);
        setComments(res.data);
      } catch (error) {
        console.error('Failed to load comments:', error);
      }
    };
    fetchComments();
  }, [task._id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, { text: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleToggleDecision = async (commentId) => {
    try {
      const res = await api.put(`/tasks/${task._id}/comments/${commentId}/decision`);
      onUpdate(res.data);
      toast.success('Decision updated');
    } catch (error) {
      toast.error('Failed to update decision');
    }
  };

  const handleSuggestNextStep = async () => {
    setLoadingSuggestion(true);
    try {
      const res = await api.get(`/tasks/${task._id}/suggest-next-step`);
      setSuggestion(res.data.suggestion);
    } catch (error) {
      toast.error('Failed to get suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const completedCount = subtasks.filter(st => st.isCompleted).length;
  const progress = subtasks.length === 0 ? 0 : Math.round((completedCount / subtasks.length) * 100);

  const saveSubtasks = async (updatedSubtasks) => {
    try {
      await api.put(`/tasks/${task._id}`, { subtasks: updatedSubtasks });
      onUpdate({ ...task, subtasks: updatedSubtasks });
    } catch (error) {
      toast.error('Failed to update subtasks');
    }
  };

  const handleToggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].isCompleted = !updated[index].isCompleted;
    setSubtasks(updated);
    saveSubtasks(updated);
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { title: newSubtask.trim(), isCompleted: false }];
    setSubtasks(updated);
    setNewSubtask('');
    saveSubtasks(updated);
  };

  const priorityColors = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const statusColors = {
    'To Do': 'bg-gray-100 text-gray-700',
    'In Progress': 'bg-indigo-100 text-indigo-700',
    'Completed': 'bg-emerald-100 text-emerald-700'
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${priorityColors[task.priority]}`}>
                {task.priority} Priority
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusColors[task.status]}`}>
                {task.status}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-200">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col md:flex-row gap-8">
            {/* Main Content (Left) */}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{task.title}</h1>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <AlignLeft size={16} className="text-gray-400" /> Description
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {task.description}
                </p>
              </div>

              {/* Decisions Section (Pinned Comments) */}
              {task.decisionLog && task.decisionLog.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-3">
                    <Pin size={16} className="text-amber-600 fill-amber-600" /> Key Decisions
                  </h3>
                  <div className="space-y-3">
                    {task.decisionLog.map((decision, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 text-sm text-gray-800 shadow-sm border border-amber-100 flex gap-2 items-start">
                        <div className="flex-1 prose prose-sm max-w-none prose-a:text-indigo-600">
                          <ReactMarkdown>{decision.text}</ReactMarkdown>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 flex-shrink-0 text-right">
                          <p className="font-semibold">{decision.markedBy?.name}</p>
                          <p>{new Date(decision.markedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks Section */}
              <div>
                <h3 className="flex items-center justify-between text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-gray-400" /> Checklists
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {progress}%
                  </span>
                </h3>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  />
                </div>

                <div className="space-y-2 mb-3">
                  {subtasks.map((st, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <button onClick={() => handleToggleSubtask(i)} className="focus:outline-none flex-shrink-0">
                        {st.isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <Circle size={18} className="text-gray-300 group-hover:text-gray-400" />
                        )}
                      </button>
                      <span className={`text-sm ${st.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {st.title}
                      </span>
                    </motion.div>
                  ))}
                  {subtasks.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-2">No subtasks added yet.</p>
                  )}
                </div>

                {/* Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add an item..." 
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="submit" disabled={!newSubtask.trim()} className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                    Add
                  </button>
                </form>
              </div>

              {/* Comments Section */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
                  <MessageSquare size={16} className="text-gray-400" /> Comments
                </h3>
                
                <form onSubmit={handleAddComment} className="mb-6 relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... (Markdown supported)"
                    className="w-full pl-4 pr-12 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50/50"
                    rows="2"
                  ></textarea>
                  <button 
                    type="submit" 
                    disabled={!newComment.trim()} 
                    className="absolute bottom-3 right-3 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </form>

                <div className="space-y-4">
                  {comments.map((comment) => {
                    const isDecision = task.decisionLog?.some(d => d.commentId === comment._id);
                    return (
                      <div key={comment._id} className={`flex gap-3 relative group ${isDecision ? 'opacity-50' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 mt-1">
                          {comment.userId?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className={`flex-1 rounded-xl p-3 border ${isDecision ? 'bg-amber-50/50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm text-gray-900">{comment.userId?.name}</span>
                            <div className="flex items-center gap-2">
                              {userRole === 'Admin' && !isDecision && (
                                <button 
                                  onClick={() => handleToggleDecision(comment._id)}
                                  className="text-[10px] bg-white border border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 px-2 py-0.5 rounded transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                >
                                  <Pin size={10} /> Mark Decision
                                </button>
                              )}
                              {isDecision && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Pin size={10} className="fill-amber-700" /> Decision
                                </span>
                              )}
                              <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 prose prose-sm max-w-none prose-p:leading-snug prose-a:text-indigo-600">
                            <ReactMarkdown>{comment.text}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the discussion!</p>
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar (Right) */}
            <div className="w-full md:w-56 space-y-5">
              {/* AI Next Best Action */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
                <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles size={14} className="text-indigo-500" /> AI Assistant
                </h4>
                {suggestion ? (
                  <p className="text-sm text-indigo-900 leading-snug font-medium">{suggestion}</p>
                ) : (
                  <button 
                    onClick={handleSuggestNextStep}
                    disabled={loadingSuggestion}
                    className="w-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {loadingSuggestion ? 'Analyzing...' : 'Suggest Next Step'}
                  </button>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignee</h4>
                {task.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {task.assignedTo.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 leading-tight">{task.assignedTo.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <User size={16} /> Unassigned
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deadline</h4>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <Clock size={16} className="text-indigo-500" />
                  {new Date(task.deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Created At */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Created {new Date(task.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
