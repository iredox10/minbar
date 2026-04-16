import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminAccount } from '../../lib/admin';
import { cn } from '../../lib/utils';

export function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setMessage('Please enter your email');
      return;
    }

    setStatus('loading');
    try {
      const resetUrl = `${window.location.origin}/admin/reset-password`;
      await adminAccount.createRecovery(email, resetUrl);
      setStatus('success');
      setMessage('A password reset link has been sent to your email address.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to send reset link. Please check your email address.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Forgot Password</h1>
            <p className="text-slate-400 mt-2">Enter your email to receive a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm"
              >
                <AlertCircle size={16} />
                {message}
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm"
              >
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <p>{message}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              whileHover={{ scale: (status === 'loading' || status === 'success') ? 1 : 1.02 }}
              whileTap={{ scale: (status === 'loading' || status === 'success') ? 1 : 0.98 }}
              className={cn(
                "w-full py-3 rounded-xl font-medium transition-all",
                (status === 'loading' || status === 'success')
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-primary text-slate-900 hover:bg-primary-light"
              )}
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Sending Link...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/admin" 
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}