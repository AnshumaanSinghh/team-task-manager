import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { Clock, LayoutTemplate } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const priorityConfig = {
  High: { class: 'bg-red-50 text-red-700 border-red-200' },
  Medium: { class: 'bg-amber-50 text-amber-700 border-amber-200' },
  Low: { class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function PublicProject() {
  const { shareId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await api.get(`/projects/public/${shareId}`);
        setProject(res.data.project);
        setTasks(res.data.tasks);
      } catch (err) {
        setError('Project not found or link has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <LayoutTemplate size={48} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  const columns = [
    { key: 'To Do', color: 'bg-red-500', label: 'To Do' },
    { key: 'In Progress', color: 'bg-amber-500', label: 'In Progress' },
    { key: 'Completed', color: 'bg-emerald-500', label: 'Completed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Public Header */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            T
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">TaskFlow <span className="text-xs font-normal text-gray-500 ml-1 px-2 py-0.5 bg-gray-100 rounded-full">Public View</span></span>
        </div>
        <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
          Log in
        </Link>
      </header>

      <div className="p-6 md:p-8 flex-1 max-w-7xl mx-auto w-full flex flex-col h-[calc(100vh-73px)]">
        {/* Project Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
          <p className="text-gray-600 max-w-3xl">{project.description}</p>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 flex gap-6 items-start">
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="w-80 bg-gray-100/50 rounded-2xl flex flex-col max-h-full border border-gray-200 flex-shrink-0">
                <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-white/60 rounded-t-2xl">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                    {col.label}
                  </h3>
                  <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2.5 rounded-full font-medium">
                    {columnTasks.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-[100px]">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <p className="text-xs italic">No tasks here</p>
                    </div>
                  ) : (
                    columnTasks.map(task => (
                      <div key={task._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-default hover:border-gray-200 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${priorityConfig[task.priority || 'Medium'].class}`}>
                            {task.priority || 'Medium'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 leading-snug text-sm mb-1">{task.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-1.5">
                            {task.assignedTo ? (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white flex items-center justify-center font-bold text-[10px]" title={task.assignedTo.name}>
                                {task.assignedTo.name?.charAt(0)?.toUpperCase()}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 border border-dashed border-gray-300" title="Unassigned"></div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock size={11} />
                            <span>
                              {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
