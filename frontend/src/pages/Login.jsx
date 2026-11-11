import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell, { Field } from '../components/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up where your team left off."
      footer={<>New to TaskFlow? <Link to="/signup" className="font-semibold text-accent-text hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" icon={Mail}>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input !pl-10" placeholder="you@company.com" autoFocus />
        </Field>
        <Field label="Password" icon={Lock}>
          <input type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input !pl-10 !pr-11" placeholder="••••••••" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </Field>
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full !mt-6">
          {loading ? <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>Sign in <ArrowRight size={18} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
