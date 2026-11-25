import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BackButton } from '../common/BackButton';
import {
  Info,
  Target,
  Eye,
  Cpu,
  Mail,
  ShieldCheck,
  Smartphone,
  WifiOff,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Code2,
  Building,
} from 'lucide-react';
import { DeveloperLogo } from '../common/DeveloperLogo';
import { BRANDING_CONFIG } from '../../config/branding';

export const AboutView: React.FC = () => {
  const { setActiveTab, settings } = useSchool();

  const handleBack = () => {
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar with Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-950">
        <div className="flex items-center gap-3">
          <BackButton
            onClick={handleBack}
            label="Back to Dashboard"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                System Information
              </span>
              <span className="text-xs text-indigo-200">v2.5.0 PWA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              About NextGen AI SMS
            </h2>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-semibold text-slate-300 block">{settings.schoolName}</span>
          <span className="text-[11px] text-emerald-400 font-mono">Offline-First Cloud Ready</span>
        </div>
      </div>

      {/* Main Grid: Mission, Vision, Technology */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mission Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Our Mission
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Core Purpose &amp; Commitment</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Our mission is to empower educational institutions with a world-class, intelligent, and easy-to-use management system. We believe in leveraging the power of AI to simplify administrative tasks, enhance communication, and provide deep insights into school operations, allowing educators to focus on what matters most: teaching.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Empowering Educators &amp; Administrators Daily</span>
          </div>
        </div>

        {/* Vision Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Our Vision
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Future of Modern Education</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We envision a future where every school, regardless of its size, has access to state-of-the-art technology that drives efficiency and fosters a better learning environment for students. NextGen AI SMS is designed to be the backbone of modern schools, providing a seamless digital experience for administrators, teachers, students, and parents.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Scalable Digital Backbone for Global Schools</span>
          </div>
        </div>
      </div>

      {/* Technology & Architecture Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shadow-2xs">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Technology
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Architectural Stack &amp; Privacy Model</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          This application is built using standard web technologies like HTML, CSS, and JavaScript, enhanced with TailwindCSS for a modern UI. It runs entirely in your browser, ensuring your data stays private and secure on your own device. The system is designed to be a Progressive Web App (PWA), making it installable on any device and capable of working offline. For orders or inquries email us at{' '}
          <a
            href="mailto:nextgentai@proton.me"
            className="font-bold text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
          >
            nextgentai@proton.me
          </a>
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Zero Cloud Leak</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                IndexedDB browser storage keeps student and finance records entirely on your device.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Offline Capability</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Integrated service workers guarantee functionality during internet outages.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Installable PWA</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Fast desktop or mobile home screen installation without app store downloads.
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Inquiries Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Orders &amp; Inquiries
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                nextgentai@proton.me
              </span>
            </div>
          </div>

          <a
            href="mailto:nextgentai@proton.me?subject=Inquiry%20regarding%20NextGen%20AI%20SMS"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send Email</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Dedicated Developer & Creator Section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="p-2 rounded-2xl bg-slate-850/80 border border-slate-700/60 shadow-xl shrink-0">
            <DeveloperLogo size="xl" loading="eager" showCredit={false} />
          </div>

          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Software Engineering &amp; Platform Architecture</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {BRANDING_CONFIG.creditText}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              EduLedger PWA is built and engineered by {BRANDING_CONFIG.developerName} with an offline-first architecture,
              high-security cryptographic key generation, automated financial reconciliation, and cross-platform PWA capabilities.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <a
                href={`mailto:${BRANDING_CONFIG.supportEmail}?subject=Support%20Inquiry%20-%20EduLedger%20by%20NextGenAI`}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95 inline-flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Engineering ({BRANDING_CONFIG.supportEmail})</span>
              </a>

              {BRANDING_CONFIG.websiteUrl && (
                <a
                  href={BRANDING_CONFIG.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit {BRANDING_CONFIG.developerName}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Copyright and Attribution */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2.5">
          <DeveloperLogo size="xs" showCredit={false} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {BRANDING_CONFIG.creditText} Systems &copy; {new Date().getFullYear()}. All Rights Reserved.
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
