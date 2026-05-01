import React, { useState, useEffect } from 'react';
import api from '../api';
import { Play, Pause, FastForward, Trophy, AlertTriangle, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GhostPlayback({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/playback-highlights`);
        setData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  useEffect(() => {
    let interval;
    if (isPlaying && data && currentIndex < data.activities.length) {
      interval = setInterval(() => {
        setCurrentIndex(prev => prev + 1);
      }, 800); // 800ms delay per activity for smooth playback
    } else if (data && currentIndex >= data.activities.length) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, data]);

  if (loading) return null;

  const { activities, highlights } = data;
  const currentActivity = activities[currentIndex - 1]; // Activity currently being "played"
  const playedActivities = activities.slice(0, currentIndex);

  const togglePlay = () => {
    if (currentIndex >= activities.length) setCurrentIndex(0);
    setIsPlaying(!isPlaying);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gray-900 text-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col h-[80vh]" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-xl">
                <Play size={24} className="fill-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Ghost Playback</h1>
                <p className="text-gray-400 text-sm">Reviewing project history...</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Playback Area (Left) */}
            <div className="flex-1 p-8 flex flex-col justify-center items-center relative border-r border-gray-800 overflow-hidden">
              {/* Background Graph Lines */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              <AnimatePresence mode="popLayout">
                {currentActivity ? (
                  <motion.div
                    key={currentActivity._id}
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, y: -50 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="bg-gray-800/80 backdrop-blur border border-gray-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center relative z-10"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                      {currentActivity.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <p className="text-lg font-medium text-gray-200 mb-2">{currentActivity.details}</p>
                    <p className="text-xs text-gray-500">{new Date(currentActivity.createdAt).toLocaleString()}</p>
                  </motion.div>
                ) : (
                  <motion.div className="text-gray-500 text-center relative z-10">
                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Click Play to start the timeline replay</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress Bar */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${(currentIndex / activities.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Smart Highlights & Controls (Right) */}
            <div className="w-full md:w-80 bg-gray-900/50 p-6 flex flex-col">
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Smart Highlights</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                      <Activity size={16} /> <span className="font-semibold text-sm">Peak Activity</span>
                    </div>
                    <p className="text-sm text-gray-300">{highlights.peakActivityDate || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">{highlights.maxCount} actions recorded</p>
                  </div>

                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                      <Trophy size={16} /> <span className="font-semibold text-sm">Largest Task</span>
                    </div>
                    <p className="text-sm text-gray-300 truncate" title={highlights.largestTaskCompleted}>{highlights.largestTaskCompleted}</p>
                  </div>

                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-red-400">
                      <AlertTriangle size={16} /> <span className="font-semibold text-sm">Missed Deadlines</span>
                    </div>
                    <p className="text-sm text-gray-300">{highlights.missedDeadlines} tasks overdue</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
                    className="p-3 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
                  >
                    <FastForward size={20} className="rotate-180" />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 bg-white text-gray-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    {isPlaying ? <Pause size={28} className="fill-gray-900" /> : <Play size={28} className="fill-gray-900 ml-1" />}
                  </button>
                  <button 
                    onClick={() => setCurrentIndex(activities.length)}
                    className="p-3 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors"
                  >
                    <FastForward size={20} />
                  </button>
                </div>
                <p className="text-center text-gray-500 text-xs mt-4">
                  {currentIndex} / {activities.length} Events
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
