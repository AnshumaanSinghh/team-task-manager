import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import { Search, FolderKanban, LayoutDashboard, Moon, Sun, ArrowRight, Folder, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const inputRef = useRef(null);

  // Toggle with Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      api.get('/projects').then(res => setProjects(res.data)).catch(() => {});
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to ensure input focuses after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  const commands = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Go to Dashboard', action: () => navigate('/dashboard') },
    { id: 'projects', icon: <FolderKanban size={18} />, label: 'View all Projects', action: () => navigate('/projects') },
    { id: 'theme', icon: darkMode ? <Sun size={18} /> : <Moon size={18} />, label: `Toggle ${darkMode ? 'Light' : 'Dark'} Mode`, action: toggleDarkMode },
  ].filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...(query.length > 0 ? filteredProjects.map(p => ({ ...p, type: 'project' })) : []),
    ...commands.map(c => ({ ...c, type: 'command' }))
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems.length > 0) {
        executeItem(allItems[selectedIndex]);
      }
    }
  };

  const executeItem = (item) => {
    if (item.type === 'project') {
      navigate(`/projects/${item._id}`);
    } else if (item.type === 'command') {
      item.action();
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4" onClick={() => setIsOpen(false)}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-4 border-b border-gray-100 dark:border-gray-800 relative">
            <Search size={20} className="text-gray-400 absolute left-6" />
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-12 py-2 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
              placeholder="Search projects or type a command..."
            />
            <div className="absolute right-6 flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-semibold text-gray-500">
              ESC
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
            {allItems.length === 0 ? (
              <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                <Command size={32} className="mb-3 opacity-20" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {query.length > 0 && filteredProjects.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</div>
                )}
                
                {allItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div 
                      key={item.id || item._id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executeItem(item)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {item.type === 'project' ? <Folder size={18} /> : item.icon}
                        </div>
                        <span className="font-medium text-sm">{item.name || item.label}</span>
                      </div>
                      {isSelected && <ArrowRight size={16} className="opacity-50" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 flex justify-between">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-gray-800 border dark:border-gray-700 px-1.5 rounded shadow-sm">↑↓</kbd> to navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-gray-800 border dark:border-gray-700 px-1.5 rounded shadow-sm">Enter</kbd> to select</span>
            </div>
            <span>TaskFlow Command</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
