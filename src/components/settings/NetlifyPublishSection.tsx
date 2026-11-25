import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  Globe,
  Rocket,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  FileCode,
  ShieldCheck,
  FolderArchive,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Download,
  Server,
  Layers,
  Info,
} from 'lucide-react';

interface NetlifyPublishSectionProps {
  onCloseModal?: () => void;
  isModalView?: boolean;
}

export const NetlifyPublishSection: React.FC<NetlifyPublishSectionProps> = ({
  onCloseModal,
  isModalView = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'drop' | 'git' | 'cli'>('drop');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const netlifyTomlContent = `# Netlify Configuration for EduLedger School Management & Accounts App
[build]
  command = "npm run build"
  publish = "dist"

# Single-Page Application (SPA) redirect rule
# Ensures all client-side routes resolve to index.html with HTTP 200
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security and caching headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Cache immutable Vite static assets (JS, CSS) for 1 year
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Never cache Service Worker or Web App Manifest for instant updates
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"`;

  const redirectsContent = `/*    /index.html   200`;

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 shadow-md border border-teal-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-teal-400/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-teal-300" />
                Netlify Hosting Ready
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-teal-100">
                PWA + Client SPA
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Publish &amp; Deploy EduLedger on Netlify
            </h2>
            <p className="text-xs text-teal-100 max-w-xl mt-1 leading-relaxed">
              EduLedger is fully pre-configured for Netlify with zero-config Single Page App routing,
              PWA asset caching, and automated builds. Publish live in under 60 seconds with free custom domains and HTTPS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://app.netlify.com/drop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-slate-950" />
              <span>Open Netlify Drop</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </a>

            <a
              href="https://app.netlify.com/start"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Netlify Git Deploy</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Core Netlify Config Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Build Command</span>
            <button
              onClick={() => copyToClipboard('npm run build', 'build_cmd')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Copy build command"
            >
              {copiedKey === 'build_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
            <span>npm run build</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Publish Directory</span>
            <button
              onClick={() => copyToClipboard('dist', 'pub_dir')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Copy publish directory"
            >
              {copiedKey === 'pub_dir' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1.5 rounded-lg border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-between">
            <span>dist</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">SPA Redirect Status</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>/* -&gt; /index.html (200)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">PWA &amp; Storage</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-200/70 dark:border-indigo-800/70 flex items-center gap-1.5">
            <FolderArchive className="w-4 h-4 shrink-0" />
            <span>IndexedDB (Offline)</span>
          </div>
        </div>
      </div>

      {/* Deployment Method Tabs */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Choose Your Netlify Deployment Method</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select how you would like to publish this app to your Netlify account.
            </p>
          </div>

          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setSelectedMethod('drop')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedMethod === 'drop'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. Netlify Drop (Fastest)
            </button>
            <button
              onClick={() => setSelectedMethod('git')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedMethod === 'git'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Git CI/CD
            </button>
            <button
              onClick={() => setSelectedMethod('cli')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedMethod === 'cli'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Netlify CLI
            </button>
          </div>
        </div>

        {/* METHOD 1: NETLIFY DROP */}
        {selectedMethod === 'drop' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60">
              <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Instant Drag &amp; Drop Publishing (No GitHub or Git required!)</span>
              </h4>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                Netlify Drop allows you to upload the compiled <code>dist/</code> folder directly into their web interface.
                Your app will be assigned a live SSL URL like <code>eduledger-campus.netlify.app</code> in under 30 seconds.
              </p>
            </div>

            <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">Build the production bundle</p>
                  <p className="text-slate-500 mt-0.5">
                    Run the build command locally or download the build files:
                  </p>
                  <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs">
                    <span>npm run build</span>
                    <button
                      onClick={() => copyToClipboard('npm run build', 'm1_build')}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                    >
                      {copiedKey === 'm1_build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    This generates the complete, optimized <code>dist/</code> folder with all scripts, PWA manifests, and static HTML.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">Open Netlify Drop in your browser</p>
                  <p className="text-slate-500 mt-0.5">
                    Navigate to Netlify's free drag-and-drop deployment portal:
                  </p>
                  <div className="mt-2">
                    <a
                      href="https://app.netlify.com/drop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition shadow-xs cursor-pointer"
                    >
                      <span>Open app.netlify.com/drop</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">Drag &amp; Drop the `dist` folder</p>
                  <p className="text-slate-500 mt-0.5">
                    Drag the entire <code>dist</code> folder into the dashed target box on Netlify Drop. Netlify will instantly upload, issue an SSL certificate, and give you a live production link.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* METHOD 2: GIT REPOSITORY CI/CD */}
        {selectedMethod === 'git' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Continuous Deployment from GitHub / GitLab / Bitbucket</span>
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Every time you push changes to your Git repository, Netlify automatically builds and redeploys your school application.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <h5 className="font-bold text-slate-900 dark:text-white mb-2">Build Settings to provide in Netlify Dashboard:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Repository Branch</span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">main</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Directory</span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">/ (empty or root)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Build Command</span>
                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">npm run build</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Publish Directory</span>
                    <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">dist</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <h5 className="font-bold text-slate-900 dark:text-white mb-1">Automated Detection:</h5>
                <p className="text-slate-500">
                  Because <code>netlify.toml</code> is included in your repository root, Netlify will auto-detect these settings automatically when you click "Import from Git"!
                </p>
                <div className="mt-3">
                  <a
                    href="https://app.netlify.com/start"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
                  >
                    <span>Import Git Repo on Netlify</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* METHOD 3: NETLIFY CLI */}
        {selectedMethod === 'cli' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Command Line Deployment with Netlify CLI</span>
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Deploy directly from your terminal or CI/CD pipelines without ever opening the web browser.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-sans font-bold">1. Log in to Netlify (one-time)</span>
                  <button
                    onClick={() => copyToClipboard('npx netlify-cli login', 'cli_1')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  >
                    {copiedKey === 'cli_1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-emerald-400">npx netlify-cli login</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-sans font-bold">2. Build the app</span>
                  <button
                    onClick={() => copyToClipboard('npm run build', 'cli_2')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  >
                    {copiedKey === 'cli_2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-emerald-400">npm run build</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-sans font-bold">3. Deploy to Production</span>
                  <button
                    onClick={() => copyToClipboard('npx netlify-cli deploy --prod --dir=dist', 'cli_3')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  >
                    {copiedKey === 'cli_3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-emerald-400">npx netlify-cli deploy --prod --dir=dist</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Configuration Files Viewer */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Netlify Configuration Manifests (Active in Project)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These files are actively committed to your workspace and will be used by Netlify upon deployment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFile('netlify.toml', netlifyTomlContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download netlify.toml</span>
            </button>
            <button
              onClick={() => downloadFile('_redirects', redirectsContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download _redirects</span>
            </button>
          </div>
        </div>

        {/* File 1: netlify.toml */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              netlify.toml (Root Configuration)
            </span>
            <button
              onClick={() => copyToClipboard(netlifyTomlContent, 'toml_code')}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              {copiedKey === 'toml_code' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed custom-scrollbar">
            {netlifyTomlContent}
          </pre>
        </div>

        {/* File 2: public/_redirects */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              public/_redirects (SPA Fallback Rule)
            </span>
            <button
              onClick={() => copyToClipboard(redirectsContent, 'redirects_code')}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              {copiedKey === 'redirects_code' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed">
            {redirectsContent}
          </pre>
        </div>
      </div>

      {/* Deployment Readiness Checklist */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Pre-Publish Verification Checklist
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>SPA routing fallback configured in netlify.toml and public/_redirects</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Vite production build target configured for dist output directory</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>IndexedDB offline database ready (No server-side database required)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Progressive Web App (PWA) manifest &amp; service worker headers pre-configured</span>
          </div>
        </div>
      </div>
    </div>
  );
};
