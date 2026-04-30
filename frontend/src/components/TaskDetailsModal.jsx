import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, CheckCircle2, Circle, Clock, Tag, AlignLeft, User, ListTodo, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskDetailsModal({ task, onClose, onUpdate, userRole }) {
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);

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
            </div>

            {/* Sidebar (Right) */}
            <div className="w-full md:w-56 space-y-5">
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
