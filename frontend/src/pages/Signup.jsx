import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell, { Field } from '../components/AuthShell';
import { Segmented } from '../components/ui/Bits';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Member' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const strength = Math.min(4, [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signup(form.name, form.email, form.password, form.role);
    setLoading(false);
  };

  return (
    <AuthShell title="Create your account" subtitle="Set up your workspace in under a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-accent-text hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" icon={User}>
          <input required value={form.name} onChange={set('name')} maxLength={100} autoComplete="name" className="input !pl-10" placeholder="Jordan Lee" autoFocus />
        </Field>
        <Field label="Work email" icon={Mail}>
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" className="input !pl-10" placeholder="you@company.com" />
        </Field>
        <Field label="Password" icon={Lock}>
          <input type="password" required minLength={6} maxLength={128} value={form.password} onChange={set('password')} autoComplete="new-password" className="input !pl-10" placeholder="At least 6 characters" />
        </Field>
        <div className="flex gap-1.5 -mt-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: i < strength ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <div>
          <span className="label">Role</span>
          <Segmented id="role" value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} className="w-full [&>button]:flex-1 [&>button]:justify-center"
            options={[{ value: 'Member', label: 'Member', icon: <UserRound size={14} /> }, { value: 'Admin', label: 'Admin', icon: <Shield size={14} /> }]} />
          <p className="text-xs text-subtle mt-2">
            {form.role === 'Admin' ? 'Admins create projects, plan work, assign tasks and manage members.' : 'Members move their tasks, tick checklists, comment and log focus time.'}
          </p>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full !mt-6">
          {loading ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>Create account <ArrowRight size={18} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
