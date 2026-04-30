import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const generateMockTasks = (prompt) => {
  // Simple heuristic to create plausible tasks based on prompt length/keywords
  const p = prompt.toLowerCase();
  const tasks = [];
  
  if (p.includes('website') || p.includes('landing page') || p.includes('design')) {
    tasks.push({ title: 'Design high-fidelity wireframes in Figma', desc: 'Create mobile and desktop layouts for the main views.', priority: 'High', subtasks: ['Header', 'Hero section', 'Footer'] });
    tasks.push({ title: 'Setup project repository and framework', desc: 'Initialize Vite + React and configure Tailwind CSS.', priority: 'High', subtasks: [] });
    tasks.push({ title: 'Implement responsive navigation', desc: 'Build the Navbar with mobile hamburger menu.', priority: 'Medium', subtasks: ['Desktop menu', 'Mobile drawer'] });
    tasks.push({ title: 'Write copy for hero section', desc: 'Draft compelling marketing copy for the main header.', priority: 'Medium', subtasks: [] });
  } else if (p.includes('marketing') || p.includes('campaign') || p.includes('launch')) {
    tasks.push({ title: 'Define target audience personas', desc: 'Research and create 3 main customer personas.', priority: 'High', subtasks: ['Demographics', 'Pain points'] });
    tasks.push({ title: 'Draft email sequence', desc: 'Write 4-part email drip campaign for the launch.', priority: 'High', subtasks: ['Welcome email', 'Value prop email', 'Offer email'] });
    tasks.push({ title: 'Create social media assets', desc: 'Design graphics for Twitter, LinkedIn, and Instagram.', priority: 'Medium', subtasks: [] });
    tasks.push({ title: 'Setup tracking links', desc: 'Generate UTM parameters and bitly links for all assets.', priority: 'Low', subtasks: [] });
  } else {
    // Generic tasks
    tasks.push({ title: 'Initial Research & Discovery', desc: 'Gather all requirements and scope out the project.', priority: 'High', subtasks: ['Review docs', 'Stakeholder meeting'] });
    tasks.push({ title: 'Create Project Timeline', desc: 'Map out milestones and assign deadlines.', priority: 'High', subtasks: [] });
    tasks.push({ title: 'Draft Phase 1 Implementation', desc: 'Begin execution of the primary deliverables.', priority: 'Medium', subtasks: ['Setup', 'Execution', 'Review'] });
    tasks.push({ title: 'Quality Assurance Review', desc: 'Test all deliverables before final sign-off.', priority: 'Medium', subtasks: [] });
  }
  return tasks;
};

export default function AIGeneratorModal({ projectId, onClose, onSuccess }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const steps = [
    "Analyzing project context...",
    "Drafting task structures...",
    "Adding subtask checklists...",
    "Finalizing priority levels..."
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate AI thinking process
    for (let i = 0; i < steps.length; i++) {
      setGenerationStep(i);
      await new Promise(r => setTimeout(r, 800)); // 800ms per step
    }

    const mockTasks = generateMockTasks(prompt);
    
    // Create tasks via API
    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7); // Due in 7 days
      
      const promises = mockTasks.map(t => 
        api.post('/tasks', {
          title: t.title,
          description: t.desc,
          projectId,
          status: 'To Do',
          priority: t.priority,
          deadline: deadlineDate.toISOString(),
          subtasks: t.subtasks.map(st => ({ title: st, isCompleted: false }))
        })
      );
      
      await Promise.all(promises);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#8B5CF6', '#EC4899', '#3B82F6']
      });
      
      toast.success('AI successfully generated tasks!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to generate tasks');
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" 
        onClick={!isGenerating ? onClose : undefined}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-gray-900 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-800 relative" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Magic glow effect behind modal */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/30 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex justify-between items-center p-6 border-b border-gray-800 relative z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" /> AI Task Magic
            </h2>
            {!isGenerating && (
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800">
                <X size={20} />
              </button>
            )}
          </div>

          <div className="p-6 relative z-10">
            {!isGenerating ? (
              <form onSubmit={handleGenerate} className="space-y-4">
                <p className="text-gray-400 text-sm mb-2">
                  Describe what you want to build or achieve. Our AI will automatically break it down into actionable tasks and subtasks for your team.
                </p>
                <textarea
                  required rows={4} value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none text-sm placeholder-gray-500"
                  placeholder="e.g., We need to launch a new landing page for our marketing campaign..."
                />
                <button 
                  type="submit" 
                  disabled={!prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                >
                  <Wand2 size={18} /> Generate Tasks
                </button>
              </form>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center space-y-6">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <Sparkles size={32} className="text-pink-400 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-white animate-pulse">AI is thinking...</h3>
                  <p className="text-sm text-purple-300 h-5 transition-all duration-300">
                    {steps[generationStep]}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
