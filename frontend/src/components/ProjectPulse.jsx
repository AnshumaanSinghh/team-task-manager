import React, { useState, useEffect } from 'react';
import api from '../api';
import { Activity, AlertTriangle, Info, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectPulse({ projectId }) {
  const [pulseData, setPulseData] = useState(null);

  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/pulse`);
        setPulseData(res.data);
      } catch (error) {
        console.error('Failed to fetch project pulse', error);
      }
    };

    fetchPulse();
    const interval = setInterval(fetchPulse, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [projectId]);

  if (!pulseData) return null;

  const { score, status, insights, burnoutWarnings } = pulseData;

  const statusColors = {
    healthy: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-500 bg-amber-50 border-amber-200',
    critical: 'text-red-500 bg-red-50 border-red-200'
  };

  const animationSpeed = status === 'healthy' ? '1s' : status === 'warning' ? '2s' : '3s';
  const pulseColor = status === 'healthy' ? '#10B981' : status === 'warning' ? '#F59E0B' : '#EF4444';

  return (
    <div className={`mb-6 p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center justify-between transition-colors ${statusColors[status]}`}>
      {/* Score & Wave */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center bg-white rounded-xl p-3 shadow-sm min-w-[80px]">
          <span className="text-2xl font-black leading-none">{score}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Pulse</span>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} />
            <h3 className="font-bold text-sm">Live Project Health</h3>
            <span className={`px-2 py-0.5 ml-2 text-[10px] font-bold uppercase tracking-wider rounded-full border ${status === 'healthy' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
              {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'At Risk' : 'Critical'}
            </span>
          </div>
          
          {/* Animated ECG Wave */}
          <svg className="w-32 h-8" viewBox="0 0 100 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M0 10 H20 L25 5 L35 15 L40 10 H100" 
              stroke={pulseColor} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: 100,
                animation: `dash ${animationSpeed} linear infinite`
              }}
            />
          </svg>
          <style>{`
            @keyframes dash {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </div>
      </div>

      {/* Insights & Warnings */}
      <div className="flex-1 w-full bg-white/60 rounded-xl p-3 flex flex-col gap-2 shadow-sm text-sm">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex items-start gap-2 text-gray-700">
            <Info size={16} className={`mt-0.5 flex-shrink-0 ${statusColors[status].split(' ')[0]}`} />
            <span className="font-medium">{insight}</span>
          </div>
        ))}
        {burnoutWarnings.map((warn, idx) => (
          <div key={`warn-${idx}`} className="flex items-start gap-2 text-red-600 bg-red-50 p-2 rounded-lg mt-1 border border-red-100">
            <Flame size={16} className="mt-0.5 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-xs">{warn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
