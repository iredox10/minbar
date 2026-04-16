import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, CreditCard, ExternalLink, Building2, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../hooks/useAppSettings';
import { cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Donate() {
  const [copied, setCopied] = useState(false);
  const { settings, loading } = useAppSettings();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings.isDonationsEnabled) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-32 flex flex-col items-center">
        <Link to="/" className="self-start p-2 bg-slate-800 rounded-full mb-8 hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} className="text-slate-300" />
        </Link>
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <Heart size={32} className="text-slate-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Donations Paused</h1>
        <p className="text-slate-400 text-center max-w-sm">
          We are currently not accepting donations. Jazakumullahu Khairan for your intention!
        </p>
      </div>
    );
  }

  const donationLinks = [];
  if (settings.paystackUrl) {
    donationLinks.push({
      id: 'paystack',
      title: 'Paystack',
      description: 'Secure payment via Paystack',
      icon: CreditCard,
      url: settings.paystackUrl,
      color: 'bg-[#092E20]',
      hoverColor: 'hover:bg-[#0BA4DB]'
    });
  }
  
  if (settings.flutterwaveUrl) {
    donationLinks.push({
      id: 'flutterwave',
      title: 'Flutterwave',
      description: 'Support us via Flutterwave',
      icon: CreditCard,
      url: settings.flutterwaveUrl,
      color: 'bg-[#FB9129]',
      textColor: 'text-slate-900',
      hoverColor: 'hover:bg-[#F5821F]'
    });
  }

  const hasBankDetails = settings.bankName || settings.accountName || settings.accountNumber;

  return (
    <div className="min-h-screen px-4 pt-8 pb-32">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto mb-10"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mb-6">
          <Heart size={32} className="fill-emerald-500/20" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-4">Support Arewa Central</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          This app is completely free and built to spread beneficial knowledge. 
          Your support helps us cover server costs, maintain the app, and continue adding great content.
        </p>
      </motion.div>

      {/* Donation Options */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-md mx-auto space-y-4"
      >
        {/* Payment Gateways */}
        {donationLinks.map((link) => (
          <motion.a
            key={link.id}
            variants={item}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center p-5 rounded-2xl transition-all group",
              "border border-slate-700/50 shadow-lg",
              link.color,
              link.hoverColor
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 shrink-0",
              link.textColor || "text-white"
            )}>
              <link.icon size={24} />
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className={cn(
                "text-lg font-bold",
                link.textColor || "text-white"
              )}>
                {link.title}
              </h3>
              <p className={cn(
                "text-sm opacity-90",
                link.textColor || "text-white/80"
              )}>
                {link.description}
              </p>
            </div>
            
            <div className={cn(
              "shrink-0 transition-transform group-hover:translate-x-1",
              link.textColor || "text-white/70"
            )}>
              <ExternalLink size={20} />
            </div>
          </motion.a>
        ))}

        {/* Direct Bank Transfer */}
        {hasBankDetails && (
          <motion.div variants={item} className="mt-8 pt-4">
            {donationLinks.length > 0 && (
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="h-[1px] flex-1 bg-slate-800"></div>
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Or</span>
                <div className="h-[1px] flex-1 bg-slate-800"></div>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
              
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="p-2.5 rounded-xl bg-slate-700/50 text-emerald-400">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Direct Bank Transfer</h3>
                  <p className="text-sm text-slate-400">Send directly to our Naira account</p>
                </div>
              </div>

              <div className="space-y-4 relative">
                {settings.bankName && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Bank Name</p>
                    <p className="text-slate-200 font-medium">{settings.bankName}</p>
                  </div>
                )}
                
                {settings.accountName && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Account Name</p>
                    <p className="text-slate-200 font-medium">{settings.accountName}</p>
                  </div>
                )}

                {settings.accountNumber && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Account Number</p>
                    <div className="flex items-center justify-between bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                      <span className="text-xl font-mono text-emerald-400 tracking-wider">{settings.accountNumber}</span>
                      <button 
                        onClick={() => handleCopy(settings.accountNumber!)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span className="text-sm font-medium">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={item} className="pt-8 text-center">
          <p className="text-sm text-slate-500">
            Jazakumullahu Khairan for your generosity.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}