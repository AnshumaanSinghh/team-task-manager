import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Shield, ArrowRight, Zap } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signup(name, email, password, role);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[15%] right-[10%] w-72 h-72 bg-white/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[15%] left-[10%] w-64 h-64 bg-emerald-300/20 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Start building something amazing</h1>
          <p className="text-lg text-emerald-100 leading-relaxed">
            Join TaskFlow and supercharge your team's productivity. Create projects, assign tasks, and watch progress in real-time.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Kanban Boards', desc: 'Visual workflow' },
              { label: 'Role-Based Access', desc: 'Admin & Member' },
              { label: 'Analytics', desc: 'Track progress' },
              { label: 'Real-time', desc: 'Instant updates' }
            ].map((f, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-xs text-emerald-200">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="absolute lg:hidden top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full bg-emerald-500 blur-[120px] opacity-15 pointer-events-none"></div>
        <div className="absolute lg:hidden bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full bg-teal-500 blur-[120px] opacity-15 pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 animate-fadeIn">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-2xl mx-auto mb-5 shadow-lg lg:hidden">T</div>
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 mt-2">Get started with TaskFlow for free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><User size={18} /></div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  placeholder="John Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Mail size={18} /></div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  placeholder="you@company.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Lock size={18} /></div>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  placeholder="Min. 6 characters" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Shield size={18} /></div>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white">
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-2.5 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 focus:ring-4 focus:ring-emerald-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
