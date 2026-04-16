import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Settings, Heart, Building2, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAppSettings, updateAppSettings } from '../../lib/appwrite';
import type { AppSettingsDoc } from '../../types';

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<AppSettingsDoc>>({
    isDonationsEnabled: true,
    paystackUrl: '',
    flutterwaveUrl: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getAppSettings();
      if (data) {
        setFormData({
          isDonationsEnabled: data.isDonationsEnabled ?? true,
          paystackUrl: data.paystackUrl || '',
          flutterwaveUrl: data.flutterwaveUrl || '',
          bankName: data.bankName || '',
          accountName: data.accountName || '',
          accountNumber: data.accountNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAppSettings({
        isDonationsEnabled: formData.isDonationsEnabled,
        paystackUrl: formData.paystackUrl,
        flutterwaveUrl: formData.flutterwaveUrl,
        bankName: formData.bankName,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            App Settings
          </h1>
          <p className="text-slate-400 mt-1">Manage global application configurations</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Donations Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Donations Configuration</h2>
                <p className="text-sm text-slate-400">Manage payment links and bank details</p>
              </div>
            </div>
            
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isDonationsEnabled}
                  onChange={(e) => setFormData({ ...formData, isDonationsEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
              <span className="ml-3 text-sm font-medium text-slate-300">
                {formData.isDonationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className={`space-y-6 transition-opacity ${!formData.isDonationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* Payment Gateways */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Payment Gateways
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Paystack Link</label>
                  <input
                    type="url"
                    value={formData.paystackUrl}
                    onChange={e => setFormData({ ...formData, paystackUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="https://paystack.com/pay/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Flutterwave Link</label>
                  <input
                    type="url"
                    value={formData.flutterwaveUrl}
                    onChange={e => setFormData({ ...formData, flutterwaveUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="https://flutterwave.com/pay/..."
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-700/50" />

            {/* Direct Bank Transfer */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Direct Bank Transfer
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Guaranty Trust Bank (GTB)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Account Name</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Arewa Central"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="0123456789"
                  />
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
