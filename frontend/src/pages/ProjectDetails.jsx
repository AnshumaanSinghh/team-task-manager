import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, ArrowLeft, Clock, Trash2, Search, Filter, AlertTriangle, Flag, CheckSquare, Sparkles } from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import AIGeneratorModal from '../components/AIGeneratorModal';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const priorityConfig = {
  High: { class: 'priority-high', icon: '🔴' },
  Medium: { class: 'priority-medium', icon: '🟡' },
  Low: { class: 'priority-low', icon: '🟢' },
};

const getDeadlineStatus = (deadline, status) => {
  if (status === 'Completed') return { label: 'Done', color: 'text-emerald-500' };
  const now = new Date();
  const dl = new Date(deadline);
  const diffDays = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', color: 'text-red-500 font-semibold' };
  if (diffDays <= 2) return { label: 'Due soon', color: 'text-amber-500 font-medium' };
  return { label: '', color: 'text-gray-400' };
};

const SkeletonBoard = () => (
  <div className="flex gap-5 h-full items-start">
    {[1, 2, 3].map(i => (
      <div key={i} className="w-80 bg-gray-100/50 rounded-2xl border border-gray-200 p-4">
        <div className="skeleton w-24 h-5 mb-4"></div>
        {[1, 2].map(j => (
          <div key={j} className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
            <div className="skeleton w-3/4 h-4 mb-3"></div>
            <div className="skeleton w-full h-3 mb-2"></div>
            <div className="skeleton w-1/2 h-3"></div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?projectId=${id}`)
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = !filterPriority || t.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  const onDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const prevTasks = [...tasks];

    setTasks(prev => prev.map(task =>
      task._id === draggableId ? { ...task, status: newStatus } : task
    ));

    // Gamification: Confetti on Complete
    if (newStatus === 'Completed') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#6366F1']
      });
    }

    try {
      await api.put(`/tasks/${draggableId}`, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update task');
      setTasks(prevTasks);
    }
  }, [tasks]);

  const handleDeleteTask = useCallback(async (taskId) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col max-w-7xl mx-auto animate-fadeIn">
        <div className="flex items-center gap-4 mb-6">
          <div className="skeleton w-10 h-10 rounded-lg"></div>
          <div>
            <div className="skeleton w-48 h-7 mb-1"></div>
            <div className="skeleton w-72 h-4"></div>
          </div>
        </div>
        <SkeletonBoard />
      </div>
    );
  }

  const columns = [
    { key: 'To Do', color: 'bg-red-500', label: 'To Do' },
    { key: 'In Progress', color: 'bg-amber-500', label: 'In Progress' },
    { key: 'Completed', color: 'bg-emerald-500', label: 'Completed' },
  ];

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
        <button onClick={() => navigate('/projects')} className="p-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors border border-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{project?.name}</h1>
          <p className="text-gray-500 text-sm truncate">{project?.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* AI Magic Generator */}
          {user?.role === 'Admin' && (
            <button
              onClick={() => setIsGenerating(true)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all text-sm disabled:opacity-50"
            >
              <Sparkles size={16} /> <span className="hidden sm:inline">Magic Generate</span>
            </button>
          )}
          {/* Member avatars */}
          <div className="hidden sm:flex -space-x-2 mr-2">
            {project?.members?.slice(0, 4).map((m, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm" title={m.name}>
                {m.name?.charAt(0)?.toUpperCase()}
              </div>
            ))}
          </div>
          {user?.role === 'Admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 text-sm"
            >
              <Plus size={18} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            filterPriority ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter size={16} /> Filter {filterPriority && `(${filterPriority})`}
        </button>
        {filterPriority && (
          <button onClick={() => setFilterPriority('')} className="text-xs text-gray-500 hover:text-red-500 transition-colors">Clear</button>
        )}

        {showFilters && (
          <div className="w-full flex gap-2 animate-fadeIn">
            {['High', 'Medium', 'Low'].map(p => (
              <button
                key={p}
                onClick={() => { setFilterPriority(filterPriority === p ? '' : p); setShowFilters(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPriority === p ? 'ring-2 ring-indigo-500' : ''} ${priorityConfig[p].class}`}
              >
                {priorityConfig[p].icon} {p}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto text-xs text-gray-400">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 h-full items-start min-w-max">
            {columns.map(col => {
              const columnTasks = filteredTasks.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="w-80 bg-gray-100/50 rounded-2xl flex flex-col max-h-[calc(100vh-260px)] border border-gray-200">
                  {/* Column header */}
                  <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-white/60 rounded-t-2xl">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                      {col.label}
                    </h3>
                    <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2.5 rounded-full font-medium">
                      {columnTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 transition-colors min-h-[100px] ${snapshot.isDraggingOver ? 'bg-indigo-50/40' : ''}`}
                      >
                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                            <div className="text-2xl mb-1">📋</div>
                            <p className="text-xs">No tasks here</p>
                          </div>
                        )}
                        {columnTasks.map((task, index) => {
                          const dlStatus = getDeadlineStatus(task.deadline, task.status);
                          return (
                            <Draggable key={task._id} draggableId={task._id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedTask(task)}
                                  className={`bg-white rounded-xl p-4 border shadow-sm transition-all duration-200 group cursor-pointer ${
                                    snapshot.isDragging
                                      ? 'shadow-xl ring-2 ring-indigo-400 rotate-1 scale-[1.03] border-indigo-300 z-50'
                                      : 'border-gray-100 hover:shadow-md hover:border-indigo-100'
                                  }`}
                                >
                                  {/* Priority + Delete */}
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${priorityConfig[task.priority || 'Medium'].class}`}>
                                      {task.priority || 'Medium'}
                                    </span>
                                    {user?.role === 'Admin' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-50"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <h4 className="font-semibold text-gray-900 leading-snug text-sm mb-1">{task.title}</h4>
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>

                                  {/* Footer */}
                                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                      {task.assignedTo ? (
                                        <div className="flex items-center gap-1.5" title={task.assignedTo.name}>
                                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-[10px]">
                                            {task.assignedTo.name?.charAt(0)?.toUpperCase()}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-dashed border-gray-300" title="Unassigned"></div>
                                      )}
                                      
                                      {/* Subtask Indicator */}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                                          <CheckSquare size={10} />
                                          {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                        </div>
                                      )}
                                    </div>
                                    <div className={`flex items-center gap-1 text-[11px] ${dlStatus.color}`}>
                                      {dlStatus.label === 'Overdue' && <AlertTriangle size={12} />}
                                      <Clock size={11} />
                                      <span>
                                        {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                      {dlStatus.label && dlStatus.label !== 'Done' && (
                                        <span className="ml-0.5">· {dlStatus.label}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {isModalOpen && (
        <CreateTaskModal
          projectId={id}
          members={project?.members || []}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          userRole={user?.role}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setSelectedTask(updatedTask);
          }}
        />
      )}

      {isGenerating && (
        <AIGeneratorModal
          projectId={id}
          onClose={() => setIsGenerating(false)}
          onSuccess={() => {
            setIsGenerating(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
