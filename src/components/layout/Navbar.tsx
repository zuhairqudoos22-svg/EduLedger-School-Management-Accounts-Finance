import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NetlifyPublishModal } from '../common/NetlifyPublishModal';
import { ServerSyncIndicator } from './ServerSyncIndicator';
import { EduLedgerLogo } from '../common/EduLedgerLogo';
import {
  isFileSystemAccessSupported,
  performComputerBackup,
} from '../../utils/fileSystemBackupService';
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  GraduationCap,
  Shield,
  CreditCard,
  User,
  AlertCircle,
  Menu,
  Coins,
  Check,
  ChevronDown,
  Cloud,
  Info,
  UserCheck,
  Users,
  HardDrive,
  Clock,
  ShieldCheck,
  MoreVertical,
  RefreshCw,
  CloudOff,
  Globe,
} from 'lucide-react';
import { useTranslation, exportLanguageLocaleMetadata, SupportedLanguage } from '../../i18n';
import { getTodayDateString } from '../../utils/formatters';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface HeaderTooltipProps {
  id: string;
  content: string;
  children: React.ReactNode;
  place?: 'bottom' | 'top' | 'left' | 'right';
  className?: string;
}

const HeaderTooltip: React.FC<HeaderTooltipProps> = ({
  id,
  content,
  children,
  place = 'bottom',
  className = '',
}) => {
  return (
    <div className={`inline-flex shrink-0 ${className}`}>
      <div
        data-tooltip-id={id}
        data-tooltip-content={content}
        className="inline-flex items-center"
      >
        {children}
      </div>
      <Tooltip
        id={id}
        place={place}
        delayShow={200}
        className="!z-50 !bg-slate-900 !text-white !text-xs !font-medium !py-1.5 !px-3 !rounded-xl !shadow-xl dark:!bg-slate-800 dark:!text-slate-100 dark:!border dark:!border-slate-700 whitespace-nowrap"
      />
    </div>
  );
};

interface NavbarProps {
  onOpenSearch: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  isDarkMode,
  onToggleDarkMode,
  onToggleMobileSidebar,
}) => {
  const { currentUser, role, logout } = useAuth();
  const {
    settings,
    updateSettings,
    studentAttendance,
    staffAttendance,
    getDefaultersList,
    setActiveTab,
    allUsers,
    autoBackupConfig,
    isAutoBackupRunning,
    students,
    staff,
    feePayments,
    expenses,
    getBackupJsonString,
    serverSyncInfo,
    triggerServerSync,
    isServerSyncing,
  } = useSchool();

  const isOnline = serverSyncInfo?.isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMoreMenuCurrencyOpen, setIsMoreMenuCurrencyOpen] = useState(false);
  const [isMoreMenuLanguageOpen, setIsMoreMenuLanguageOpen] = useState(false);
  const [isNetlifyModalOpen, setIsNetlifyModalOpen] = useState(false);
  const [customCurrencyInput, setCustomCurrencyInput] = useState('');
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const { language, setLanguage, languages, currentLanguageInfo, isRTL, t } = useTranslation();

  // Exact header width measurement via ResizeObserver for zoom & responsive safety
  const headerRef = useRef<HTMLElement>(null);
  const [headerWidth, setHeaderWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1280;
  });

  useEffect(() => {
    if (!headerRef.current) return;
    const updateWidth = () => {
      if (headerRef.current) {
        setHeaderWidth(headerRef.current.clientWidth);
      }
    };
    updateWidth();

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setHeaderWidth(entry.contentRect.width);
        }
      }
    });

    ro.observe(headerRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Priority-based collapsing states based on actual available header width (zoom-safe)
  // Priority 1: About -> collapses below 1450px header width
  const showAboutInline = headerWidth >= 1450;
  // Priority 2: Publish / Netlify -> collapses below 1380px header width
  const showPublishInline = headerWidth >= 1380;
  // Priority 3: Backup status icon -> collapses below 1300px header width
  const showBackupInline = headerWidth >= 1300;
  // Priority 4: Currency selector -> collapses below 1200px header width
  const showCurrencyInline = headerWidth >= 1200;
  // Priority 4.5: Language selector -> collapses below 1120px header width
  const showLanguageInline = headerWidth >= 1120;
  // Priority 5: Synced indicator -> collapses below 1040px header width
  const showSyncInline = headerWidth >= 1040;

  // School name text hides when space is short (below 780px)
  const showSchoolNameText = headerWidth >= 780;
  // Profile name and role text shows when space allows (>= 1050px)
  const showProfileName = headerWidth >= 1050;
  // Global search input bar is visible on >= 640px and desktop (>= 900px viewport); collapses to search icon below that
  const showSearchInput = headerWidth >= 640 && (typeof window === 'undefined' || window.innerWidth >= 900);
  // Ctrl+K hint inside search field is visible when field has ample room (>= 1000px)
  const showCtrlKHint = headerWidth >= 1000;

  // More menu is shown whenever any item is collapsed
  const hasCollapsedItems =
    !showAboutInline ||
    !showPublishInline ||
    !showBackupInline ||
    !showCurrencyInline ||
    !showLanguageInline ||
    !showSyncInline;

  const handleSelectLanguage = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    updateSettings(exportLanguageLocaleMetadata(langCode, settings));
    setShowLanguageMenu(false);
    setIsMoreMenuLanguageOpen(false);
    setShowMoreMenu(false);
  };

  const handleLogout = async () => {
    if (role === 'admin' || role === 'super_admin') {
      try {
        if (isFileSystemAccessSupported() && autoBackupConfig?.folderBackupEnabled !== false) {
          const json = await getBackupJsonString();
          await performComputerBackup({
            databaseJson: json,
            students,
            staff,
            feePayments,
            expenses,
            settings,
            encryptPassword: autoBackupConfig?.encryptWithPassword ? autoBackupConfig?.backupPassword : undefined,
            maxKeepBackups: 30,
          });
        }
      } catch (err) {
        console.warn('Logout computer backup skipped:', err);
      }
    }
    logout();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(target)
      ) {
        setShowCurrencyMenu(false);
      }
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(target)
      ) {
        setShowLanguageMenu(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setShowUserMenu(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target)
      ) {
        setShowMoreMenu(false);
        setIsMoreMenuCurrencyOpen(false);
        setIsMoreMenuLanguageOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCurrencyMenu || showLanguageMenu || showUserMenu || showMoreMenu || showNotifications) {
          setShowCurrencyMenu(false);
          setShowLanguageMenu(false);
          setShowUserMenu(false);
          setShowMoreMenu(false);
          setIsMoreMenuCurrencyOpen(false);
          setIsMoreMenuLanguageOpen(false);
          setShowNotifications(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCurrencyMenu, showLanguageMenu, showUserMenu, showMoreMenu, showNotifications]);

  const quickCurrencies = [
    { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee', display: 'PKR (Rs.)', flag: '🇵🇰' },
    { code: 'PKR', symbol: 'PKR', label: 'Pakistani Rupee (ISO)', display: 'PKR (PKR)', flag: '🇵🇰' },
    { code: 'USD', symbol: '$', label: 'US Dollar', display: 'USD ($)', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', label: 'Euro', display: 'EUR (€)', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', label: 'British Pound', display: 'GBP (£)', flag: '🇬🇧' },
    { code: 'INR', symbol: '₹', label: 'Indian Rupee', display: 'INR (₹)', flag: '🇮🇳' },
    { code: 'AED', symbol: 'AED', label: 'UAE Dirham', display: 'AED', flag: '🇦🇪' },
    { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal', display: 'SAR', flag: '🇸🇦' },
  ];

  const handleSelectCurrency = async (code: string, symbol: string) => {
    await updateSettings({
      ...settings,
      currencyCode: code,
      currencySymbol: symbol,
    });
    setShowCurrencyMenu(false);
  };

  const handleApplyCustomCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCurrencyInput.trim()) return;
    const clean = customCurrencyInput.trim();
    await updateSettings({
      ...settings,
      currencyCode: clean.toUpperCase(),
      currencySymbol: clean,
    });
    setCustomCurrencyInput('');
    setShowCurrencyMenu(false);
  };

  const today = getTodayDateString();
  const todayStudentAbsent = studentAttendance.filter(
    a => a.date === today && (a.status === 'absent' || a.status === 'leave')
  );
  const todayStaffAbsent = staffAttendance.filter(
    a => a.date === today && (a.status === 'absent' || a.status === 'leave')
  );
  const defaulters = getDefaultersList();

  const totalAlertsCount =
    todayStudentAbsent.length + todayStaffAbsent.length + (defaulters.length > 0 ? 1 : 0);

  return (
    <header
      ref={headerRef}
      className="navbar-main-wrapper sticky top-0 z-30 h-16 sm:h-[68px] w-full max-w-[100vw] box-border border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 flex items-center gap-2 sm:gap-3 overflow-visible"
    >
      {/* Zone 1 (Left): Static-width branding (Logo, school name, academic-year chip) */}
      <div className="navbar-school-branding flex items-center gap-2 sm:gap-2.5 shrink-0 flex-shrink-0 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <EduLedgerLogo
          src="/pwa-192x192.png"
          alt="EduLedger Logo"
          size={36}
          className="w-9 h-9 rounded-xl shadow-md shadow-indigo-600/20 shrink-0 flex-shrink-0 object-contain"
        />

        {/* School name & tagline (hidden when space is very short < 780px, generous max-width to prevent early truncation) */}
        {showSchoolNameText && (
          <div className="flex flex-col min-w-0 max-w-[180px] md:max-w-[240px] xl:max-w-[320px]">
            <h1
              className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate"
              title={settings.schoolName || 'EduLedger'}
            >
              {settings.schoolName || 'EduLedger'}
            </h1>
            {settings.schoolTagline && (
              <p className="text-[11px] text-slate-500 truncate leading-none mt-0.5" title={settings.schoolTagline}>
                {settings.schoolTagline}
              </p>
            )}
          </div>
        )}

        {/* Academic Session Chip (never overlapped or truncated) */}
        <span
          className="shrink-0 flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap select-none"
          title={`Academic Session: ${settings.currentAcademicYear || '2026-2027'}`}
        >
          {settings.currentAcademicYear || '2026-2027'}
        </span>
      </div>

      {/* Zone 2 (Center): Global search bar (flex: 1 1 220px, min-width: 200px, max-width: 480px, never shrinks below 200px on desktop) */}
      {showSearchInput && (
        <div className="navbar-search-wrapper flex-[1_1_220px] min-w-[200px] max-w-[480px] overflow-hidden">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full max-w-[480px] h-9 flex items-center justify-between px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 text-xs transition border border-transparent hover:border-slate-300 dark:hover:border-slate-700 min-w-0 gap-2 whitespace-nowrap cursor-pointer box-border overflow-hidden"
            title="Search student, staff, or roll no (Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <Search className="w-4 h-4 text-slate-400 shrink-0 flex-shrink-0" />
              <span className="truncate text-left text-slate-400">Search student, staff, or roll no...</span>
            </div>
            {showCtrlKHint && (
              <kbd className="shrink-0 flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 text-slate-500 rounded border border-slate-200 dark:border-slate-600">
                Ctrl+K
              </kbd>
            )}
          </button>
        </div>
      )}

      {/* Zone 3 (Right): Static-width action buttons group (shrink-0, margin-inline-start: auto, never shrinks, never overflows) */}
      <div className="navbar-actions-group flex items-center gap-1.5 sm:gap-2 shrink-0 flex-shrink-0 ml-auto min-w-0">
        {/* Mobile Search Icon (only shown when search input bar is collapsed below 640px) */}
        {!showSearchInput && (
          <HeaderTooltip
            id="tooltip-mobile-search"
            content="Search student, staff, or roll no (Ctrl+K)"
          >
            <button
              onClick={onOpenSearch}
              className="h-9 w-9 p-0 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
              aria-label="Open search dialog"
            >
              <Search className="w-4 h-4" />
            </button>
          </HeaderTooltip>
        )}

        {/* PWA Install Button wrapped with Tooltip (Icon on < 1440px, full label on >= 1440px) */}
        <HeaderTooltip
          id="tooltip-pwa-install"
          content="Install EduLedger Progressive Web App"
        >
          <PWAInstallButton className="w-9 p-0 min-[1440px]:w-auto min-[1440px]:px-3 min-[1440px]:gap-1.5" />
        </HeaderTooltip>

        {/* Offline-First Background Server Sync Status Indicator (Shown inline when space allows) */}
        {showSyncInline && (
          <div className="shrink-0">
            <ServerSyncIndicator />
          </div>
        )}

        {/* Netlify Publish Button wrapped with Tooltip (Shown inline when wide; otherwise in More menu) */}
        {showPublishInline && (
          <HeaderTooltip
            id="tooltip-publish"
            content="Publish & Deploy App on Netlify"
          >
            <button
              onClick={() => setIsNetlifyModalOpen(true)}
              className="h-9 items-center justify-center w-auto px-3 gap-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 flex"
              aria-label="Publish to Netlify"
            >
              <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Publish</span>
            </button>
          </HeaderTooltip>
        )}

        {/* About App Quick Link wrapped with Tooltip (Shown inline when wide; otherwise in More menu) */}
        {showAboutInline && (
          <HeaderTooltip
            id="tooltip-about"
            content="About EduLedger"
          >
            <button
              onClick={() => setActiveTab('about')}
              className="h-9 items-center justify-center w-auto px-3 gap-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 flex"
              aria-label="About EduLedger"
            >
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>About</span>
            </button>
          </HeaderTooltip>
        )}

        {/* Automated Backup Quick Status Button (Shown inline when space allows; otherwise in More menu) */}
        {showBackupInline && (
          <HeaderTooltip
            id="tooltip-backup"
            content={
              isAutoBackupRunning
                ? 'Automated Backup in Progress...'
                : autoBackupConfig?.enabled
                ? `Automated Backup Active (${autoBackupConfig.frequency})`
                : 'Automated Backup is Paused'
            }
          >
            <button
              onClick={() => setActiveTab('backup')}
              className={`h-9 items-center justify-center w-9 p-0 min-[1500px]:w-auto min-[1500px]:px-3 min-[1500px]:gap-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border whitespace-nowrap shrink-0 flex ${
                isAutoBackupRunning
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : autoBackupConfig?.enabled
                  ? 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80'
              }`}
              aria-label="Automated Backup Status"
            >
              {isAutoBackupRunning ? (
                <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <HardDrive className={`w-3.5 h-3.5 shrink-0 ${autoBackupConfig?.enabled ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
              )}
              <span className="hidden min-[1500px]:inline">{isAutoBackupRunning ? 'Backing Up...' : 'Backup'}</span>
              {autoBackupConfig?.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              )}
            </button>
          </HeaderTooltip>
        )}

        {/* More Actions Dropdown wrapped with Tooltip (Active whenever any secondary items are collapsed) */}
        {hasCollapsedItems && (
          <div className="relative shrink-0" ref={moreMenuRef}>
            <HeaderTooltip id="tooltip-more-actions" content="More Options">
              <button
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowCurrencyMenu(false);
                  setShowNotifications(false);
                  setShowUserMenu(false);
                }}
                className="h-9 w-9 p-0 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                aria-label="More Actions"
                aria-expanded={showMoreMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </HeaderTooltip>

            {showMoreMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in space-y-1"
                style={{ maxWidth: 'min(280px, calc(100vw - 24px))' }}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-1">
                  Quick Access &amp; Tools
                </div>

                {/* 1. About EduLedger */}
                {!showAboutInline && (
                  <button
                    onClick={() => {
                      setActiveTab('about');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>About EduLedger</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">Info</span>
                  </button>
                )}

                {/* 2. Publish to Netlify */}
                {!showPublishInline && (
                  <button
                    onClick={() => {
                      setIsNetlifyModalOpen(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Cloud className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>Publish to Netlify</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-600 font-bold">Deploy</span>
                  </button>
                )}

                {/* 3. Automated Backup */}
                {!showBackupInline && (
                  <button
                    onClick={() => {
                      setActiveTab('backup');
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <HardDrive className={`w-4 h-4 shrink-0 ${autoBackupConfig?.enabled ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                      <span>Automated Backup</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isAutoBackupRunning
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : autoBackupConfig?.enabled
                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isAutoBackupRunning ? 'Backing Up' : autoBackupConfig?.enabled ? autoBackupConfig.frequency : 'Paused'}
                    </span>
                  </button>
                )}

                {/* 4. Currency Selector */}
                {!showCurrencyInline && (
                  <>
                    <button
                      onClick={() => {
                        setIsMoreMenuCurrencyOpen(!isMoreMenuCurrencyOpen);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Currency Selector</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {settings.currencyCode || 'PKR'}
                      </span>
                    </button>

                    {isMoreMenuCurrencyOpen && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-400 px-1">Select Currency:</div>
                        <div className="grid grid-cols-2 gap-1">
                          {quickCurrencies.map((curr, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                handleSelectCurrency(curr.code, curr.symbol);
                                setIsMoreMenuCurrencyOpen(false);
                                setShowMoreMenu(false);
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                settings.currencyCode === curr.code && settings.currencySymbol === curr.symbol
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              }`}
                            >
                              <span>{curr.flag} {curr.code}</span>
                              <span className="font-mono text-[10px] opacity-80">{curr.symbol}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 4.5 Language Selector (Urdu, Hindi, Arabic, etc.) */}
                {!showLanguageInline && (
                  <>
                    <button
                      onClick={() => {
                        setIsMoreMenuLanguageOpen(!isMoreMenuLanguageOpen);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Language ({currentLanguageInfo.name})</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <span>{currentLanguageInfo.flag}</span>
                        <span>{currentLanguageInfo.code.toUpperCase()}</span>
                      </span>
                    </button>

                    {isMoreMenuLanguageOpen && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-400 px-1 flex items-center justify-between">
                          <span>Select Language (15 Locales):</span>
                          <span className="text-[9px] lowercase font-normal">{isRTL ? 'rtl active' : 'ltr active'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                          {languages.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => handleSelectLanguage(lang.code)}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                language === lang.code
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                              }`}
                            >
                              <span className="truncate">{lang.flag} {lang.nativeName}</span>
                              <span className="text-[9px] uppercase font-mono opacity-80">{lang.dir}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 5. Server Sync Status */}
                {!showSyncInline && (
                  <button
                    onClick={() => {
                      triggerServerSync();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isServerSyncing ? (
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      ) : !isOnline ? (
                        <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>Cloud Server Sync</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isServerSyncing
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : !isOnline
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isServerSyncing ? 'Syncing...' : !isOnline ? 'Offline' : 'Synced'}
                    </span>
                  </button>
                )}

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Currency Switcher Dropdown (Shown inline when wide) */}
        {showCurrencyInline && (
          <div className="relative shrink-0" ref={currencyDropdownRef}>
            <button
              onClick={() => {
                setShowCurrencyMenu(!showCurrencyMenu);
                setShowNotifications(false);
                setShowMoreMenu(false);
                setShowUserMenu(false);
              }}
              className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title={`Currency: ${settings.currencyCode || 'PKR'} (${settings.currencySymbol || 'Rs.'})`}
              aria-label="Select Currency"
              aria-expanded={showCurrencyMenu}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                {settings.currencyCode || 'PKR'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showCurrencyMenu && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in space-y-3"
                style={{ maxWidth: 'min(300px, calc(100vw - 24px))' }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Currency Selection</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                    {settings.currencyCode || 'PKR'}
                  </span>
                </div>

                {/* Quick Preset Currencies */}
                <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                  {quickCurrencies.map((curr, idx) => {
                    const isSelected =
                      settings.currencyCode === curr.code && settings.currencySymbol === curr.symbol;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectCurrency(curr.code, curr.symbol)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{curr.flag}</span>
                          <span>{curr.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-500">{curr.symbol}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Currency Form */}
                <form onSubmit={handleApplyCustomCurrency} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Add Custom Currency / Symbol:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customCurrencyInput}
                      onChange={e => setCustomCurrencyInput(e.target.value)}
                      placeholder="e.g. PKR or Rs. or ₨"
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Language Switcher Dropdown (Shown inline when wide) */}
        {showLanguageInline && (
          <div className="relative shrink-0" ref={languageDropdownRef}>
            <button
              onClick={() => {
                setShowLanguageMenu(!showLanguageMenu);
                setShowCurrencyMenu(false);
                setShowNotifications(false);
                setShowMoreMenu(false);
                setShowUserMenu(false);
              }}
              className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title={`Language: ${currentLanguageInfo.name} (${currentLanguageInfo.nativeName}) - ${currentLanguageInfo.dir.toUpperCase()}`}
              aria-label="Select Language"
              aria-expanded={showLanguageMenu}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {currentLanguageInfo.code.toUpperCase()}
              </span>
              <span className="text-[11px]">{currentLanguageInfo.flag}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showLanguageMenu && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in space-y-3"
                style={{ maxWidth: 'min(300px, calc(100vw - 24px))' }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Language &amp; Script</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isRTL
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {currentLanguageInfo.dir.toUpperCase()} • {currentLanguageInfo.nativeName}
                  </span>
                </div>

                {/* 15 Languages Selection List */}
                <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
                  {languages.map(lang => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <div className="text-left flex flex-col">
                            <span className="font-semibold text-xs leading-tight">{lang.nativeName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{lang.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            lang.dir === 'rtl'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {lang.dir.toUpperCase()}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dark/Light mode toggle wrapped with Tooltip (hidden on mobile < 768px) */}
        <HeaderTooltip
          id="tooltip-darkmode"
          content={isDarkMode ? 'Theme: Dark (Click to enable Light Mode)' : 'Theme: Light (Click to enable Dark Mode)'}
          className="hidden md:inline-flex"
        >
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`h-9 w-9 p-0 flex items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border whitespace-nowrap shrink-0 ${
              isDarkMode
                ? 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/60 text-indigo-200'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            aria-label="Toggle Dark Mode Theme"
          >
            {isDarkMode ? (
              <Moon className="w-4 h-4 text-indigo-400 shrink-0 animate-in spin-in-180" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </button>
        </HeaderTooltip>

        {/* Notifications Popover wrapped with Tooltip */}
        <div className="relative shrink-0" ref={notificationsRef}>
          <HeaderTooltip
            id="tooltip-notifications"
            content={totalAlertsCount > 0 ? `${totalAlertsCount} Live School Alerts` : 'Notifications & Alerts'}
          >
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowCurrencyMenu(false);
                setShowMoreMenu(false);
                setShowUserMenu(false);
              }}
              className="h-9 w-9 p-0 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative shrink-0 cursor-pointer"
              aria-label="Notifications & Alerts"
              aria-expanded={showNotifications}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalAlertsCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>
          </HeaderTooltip>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live School Alerts
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                  {totalAlertsCount} alerts
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                {todayStudentAbsent.length > 0 && (
                  <div
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => {
                      setActiveTab('student-attendance');
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {todayStudentAbsent.length} Students Absent / On Leave Today
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tap to inspect section-wise attendance records.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {todayStaffAbsent.length > 0 && (
                  <div
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => {
                      setActiveTab('staff-attendance');
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {todayStaffAbsent.length} Staff Member(s) Absent / On Leave
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          View staff roster and substitute arrangement.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {defaulters.length > 0 && (
                  <div
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => {
                      setActiveTab('due-fees');
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 mt-0.5">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {defaulters.length} Outstanding Fee Accounts
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Generate reminder statements or record fee payments.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thin vertical divider between utilities and user profile */}
        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

        {/* User Profile Block: avatar circle + name + role stacked on 2 lines with ellipsis, max-width: 140px; on < 1100px show only avatar */}
        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowCurrencyMenu(false);
              setShowNotifications(false);
              setShowMoreMenu(false);
            }}
            className="h-9 flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer group shrink-0"
            title={`Account: ${currentUser?.fullName} (${role === 'admin' ? 'Administrator' : 'Finance Officer'})`}
            aria-label="User Account Menu"
            aria-expanded={showUserMenu}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-xs ring-2 ring-transparent group-hover:ring-indigo-400 transition shrink-0">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.fullName?.charAt(0) || <User className="w-4 h-4" />
              )}
            </div>
            {showProfileName && (
              <div className="flex flex-col text-left min-w-0 max-w-[140px]">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                  {currentUser?.fullName}
                </p>
                <div className="flex items-center gap-1 mt-0.5 truncate">
                  {role === 'admin' ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                      <Shield className="w-3 h-3 shrink-0" /> Administrator
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                      <CreditCard className="w-3 h-3 shrink-0" /> Finance Officer
                    </span>
                  )}
                </div>
              </div>
            )}
            {showProfileName && (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>

          {/* User Account Switcher Dropdown (Right-aligned, max-width contained) */}
          {showUserMenu && (
            <div
              className="absolute right-0 top-12 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in space-y-3"
              style={{ maxWidth: 'min(320px, calc(100vw - 24px))' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Account</h4>
                  <p className="text-[11px] text-slate-500 font-mono">@{currentUser?.username}</p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>

              {/* Account Security Information & Actions */}
              <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                      Last Login
                    </span>
                    <span className="font-mono text-[11px]">
                      {currentUser?.previousLogin
                        ? new Date(currentUser.previousLogin).toLocaleString()
                        : currentUser?.lastLogin
                        ? new Date(currentUser.lastLogin).toLocaleString()
                        : 'Initial active session'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-750">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div className="text-[11px]">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                      Storage Policy
                    </span>
                    <span>Ephemeral (sessionStorage Only)</span>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Controls (Dark Mode & Currency shortcuts for < 768px) */}
              <div className="md:hidden pt-1 pb-1 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Appearance</span>
                  <button
                    onClick={onToggleDarkMode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {isDarkMode ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{isDarkMode ? 'Dark' : 'Light'}</span>
                  </button>
                </div>
              </div>

              {/* Action Links */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Change Password &amp; Profile</span>
                  </span>
                </button>

                {role === 'admin' && (
                  <button
                    onClick={() => {
                      setActiveTab('users');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Manage User Accounts ({allUsers?.length || 0})</span>
                    </span>
                  </button>
                )}
              </div>

              {/* Logout current session */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of System</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Logout button wrapped with Tooltip: Always visible, never pushed off-screen */}
        <HeaderTooltip
          id="tooltip-logout"
          content="Logout (Saves automated backup & closes session)"
          className="inline-flex shrink-0 ml-1 sm:ml-2"
        >
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 w-9 p-0 min-[1500px]:w-auto min-[1500px]:px-2.5 min-[1500px]:gap-1.5 flex items-center justify-center rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition cursor-pointer shrink-0 shadow-2xs whitespace-nowrap"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="hidden min-[1500px]:inline">Logout</span>
          </button>
        </HeaderTooltip>
      </div>

      {/* Global Netlify Publish Modal */}
      <NetlifyPublishModal
        isOpen={isNetlifyModalOpen}
        onClose={() => setIsNetlifyModalOpen(false)}
      />
    </header>
  );
};
