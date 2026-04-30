import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Clock, AlertCircle, Briefcase, TrendingUp, AlertTriangle, User, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="skeleton w-12 h-12 rounded-xl mb-4"></div>
    <div className="skeleton w-24 h-4 mb-2"></div>
    <div className="skeleton w-16 h-8"></div>
  </div>
);

const StatCard = ({ title, value, icon, bg, color, delay }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 animate-fadeIn" style={{ animationDelay: `${delay}ms` }}>
    <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</h3>
    <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/tasks/dashboard');
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-fadeIn">
        <div className="mb-8">
          <div className="skeleton w-64 h-8 mb-2"></div>
          <div className="skeleton w-80 h-5"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const CHART_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

  const cards = [
    { title: 'Total Tasks', value: stats.total, icon: <Briefcase size={22} className="text-indigo-600" />, bg: 'bg-indigo-50' },
    { title: 'Completed', value: stats.completed, icon: <CheckCircle2 size={22} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { title: 'In Progress', value: stats.inProgress, icon: <TrendingUp size={22} className="text-amber-600" />, bg: 'bg-amber-50' },
    { title: 'Overdue', value: stats.overdue, icon: <AlertCircle size={22} className="text-red-600" />, bg: 'bg-red-50' },
    { title: 'My Tasks', value: stats.myTasks, icon: <User size={22} className="text-blue-600" />, bg: 'bg-blue-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's an overview of your team's progress today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {cards.map((card, idx) => (
          <StatCard key={idx} {...card} delay={idx * 80} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Completion Ring */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Completion Rate</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={[
                      { value: stats.completionRate },
                      { value: 100 - stats.completionRate }
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={72}
                    startAngle={90} endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#6366F1" />
                    <Cell fill="#E2E8F0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{stats.completionRate}%</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown Pie */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Tasks by Status</h3>
          {stats.total === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No tasks yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={stats.statusBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={35} outerRadius={58}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {stats.statusBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-semibold text-gray-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fadeIn" style={{ animationDelay: '400ms' }}>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Active by Priority</h3>
          <div className="space-y-4 mt-2">
            {[
              { label: 'High', value: stats.highPriority, color: 'bg-red-500', bgLight: 'bg-red-100' },
              { label: 'Medium', value: stats.mediumPriority, color: 'bg-amber-500', bgLight: 'bg-amber-100' },
              { label: 'Low', value: stats.lowPriority, color: 'bg-emerald-500', bgLight: 'bg-emerald-100' },
            ].map((p, i) => {
              const max = Math.max(stats.highPriority, stats.mediumPriority, stats.lowPriority, 1);
              const pct = Math.round((p.value / max) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 font-medium">{p.label}</span>
                    <span className="font-semibold text-gray-900">{p.value}</span>
                  </div>
                  <div className={`w-full h-2.5 ${p.bgLight} rounded-full overflow-hidden`}>
                    <div className={`h-full ${p.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Bar Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks per Project Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fadeIn" style={{ animationDelay: '500ms' }}>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Tasks per Project</h3>
          {stats.tasksByProject?.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No project data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.tasksByProject} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="total" fill="#6366F1" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#10B981" radius={[6, 6, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fadeIn" style={{ animationDelay: '600ms' }}>
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" /> Recent Activity
          </h3>
          {!stats.recentActivity || stats.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Activity size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No activity yet. Create a project to get started!</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
              {stats.recentActivity.map((act, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                    act.action === 'created_task' ? 'bg-emerald-500' :
                    act.action === 'status_change' ? 'bg-amber-500' :
                    act.action === 'deleted_task' ? 'bg-red-500' :
                    act.action === 'created_project' ? 'bg-indigo-500' : 'bg-gray-400'
                  }`}>
                    {act.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">
                      <span className="font-semibold text-gray-900">{act.userId?.name || 'User'}</span>{' '}
                      {act.details}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(act.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Motivational Banner */}
      {stats.overdue > 0 && (
        <div className="mt-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-fadeIn">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-10 rounded-full blur-[50px] transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="flex items-center gap-3 relative z-10">
            <AlertTriangle size={24} />
            <div>
              <h3 className="font-bold text-lg">Attention needed</h3>
              <p className="text-red-100 text-sm">You have {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}. Review and update deadlines to keep your projects on track.</p>
            </div>
          </div>
        </div>
      )}

      {stats.overdue === 0 && stats.total > 0 && (
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-fadeIn">
          <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-10 rounded-full blur-[50px] transform translate-x-1/3 -translate-y-1/3"></div>
          <h3 className="font-bold text-lg relative z-10">You're on track! 🎉</h3>
          <p className="text-indigo-100 text-sm relative z-10 mt-1">No overdue tasks. Keep up the great work and maintain this momentum.</p>
        </div>
      )}
    </div>
  );
}
