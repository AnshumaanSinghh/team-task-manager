import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, Calendar, Folder, Search, ArrowRight } from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="skeleton w-12 h-12 rounded-xl mb-4"></div>
    <div className="skeleton w-40 h-5 mb-2"></div>
    <div className="skeleton w-full h-4 mb-1"></div>
    <div className="skeleton w-3/4 h-4 mb-6"></div>
    <div className="flex justify-between border-t border-gray-50 pt-4">
      <div className="skeleton w-20 h-3"></div>
      <div className="skeleton w-20 h-3"></div>
    </div>
  </div>
);

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const projectColors = [
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-violet-500 to-fuchsia-500',
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="skeleton w-40 h-8 mb-2"></div>
            <div className="skeleton w-64 h-5"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} /> New Project
        </button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
          />
        </div>
      )}

      {/* Project Grid */}
      {filteredProjects.length === 0 && projects.length > 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Search size={36} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No results found</h3>
          <p className="text-gray-500 mt-1 text-sm">Try a different search term.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-indigo-400">
            <Folder size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-2 mb-6 max-w-sm mx-auto">Get started by creating your first project. Organize tasks, assign team members, and track progress.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-5 py-2.5 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} /> Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project, idx) => (
            <Link
              to={`/projects/${project._id}`}
              key={project._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group block overflow-hidden animate-fadeIn"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Color bar */}
              <div className={`h-1.5 bg-gradient-to-r ${projectColors[idx % projectColors.length]}`}></div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${projectColors[idx % projectColors.length]} text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform`}>
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1.5 truncate">{project.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px] leading-relaxed">{project.description}</p>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="flex -space-x-1.5">
                      {project.members?.slice(0, 3).map((m, mi) => (
                        <div key={mi} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                          {m.name?.charAt(0)?.toUpperCase()}
                        </div>
                      ))}
                      {project.members?.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium flex items-center justify-center border-2 border-white">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="ml-1">{project.members?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateProjectModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
