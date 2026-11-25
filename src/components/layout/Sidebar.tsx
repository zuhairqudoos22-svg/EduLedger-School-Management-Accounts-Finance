import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useTranslation } from '../../i18n';
import { ActiveTab } from '../../types';
import { EduLedgerLogo } from '../common/EduLedgerLogo';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  Users,
  Clock,
  Briefcase,
  Layers,
  Receipt,
  AlertTriangle,
  TrendingDown,
  PiggyBank,
  DollarSign,
  BookOpen,
  BarChart3,
  Settings,
  HardDrive,
  Info,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  Award,
  FileBadge,
  FileCheck2,
  FileText,
  ShoppingBag,
  Boxes,
  Package,
  Trophy,
  Cloud,
  ArrowUpRight,
  Sun,
  Moon,
  LogOut,
  QrCode,
} from 'lucide-react';
import { DeveloperLogo } from '../common/DeveloperLogo';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string | number;
  iconColor?: string;
  activeBg?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile }) => {
  const { currentUser, role, isAdmin, isFinance, logout } = useAuth();
  const { activeTab, setActiveTab, getDefaultersList, staffLeaves, isDarkMode, toggleDarkMode } = useSchool();
  const { t, isRTL } = useTranslation();

  const defaultersCount = getDefaultersList().length;
  const pendingLeavesCount = (staffLeaves || []).filter(l => l.status === 'pending').length;

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: t('nav.overview', 'Overview'),
      items: [
        {
          id: 'dashboard',
          label: t('nav.dashboard', 'Dashboard'),
          icon: LayoutDashboard,
          iconColor: 'text-blue-400',
          activeBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/30',
        },
        {
          id: 'leaderboard',
          label: t('nav.leaderboard', 'Leaderboard & Badges'),
          icon: Trophy,
          iconColor: 'text-amber-400',
          activeBg: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
        },
      ],
    },
    {
      title: t('nav.academicStudents', 'Academic & Students'),
      items: [
        {
          id: 'students',
          label: t('nav.students', 'Students Directory'),
          icon: GraduationCap,
          adminOnly: true,
          iconColor: 'text-cyan-400',
          activeBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
        },
        {
          id: 'admission-form',
          label: t('nav.admissionForm', 'Admission Form'),
          icon: FileText,
          adminOnly: true,
          iconColor: 'text-indigo-400',
          activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
        },
        {
          id: 'student-attendance',
          label: t('nav.studentAttendance', 'Student Attendance'),
          icon: CalendarCheck,
          iconColor: 'text-emerald-400',
          activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
        },
        {
          id: 'attendance-qr',
          label: t('nav.attendanceQR', 'QR Attendance Badges'),
          icon: QrCode,
          iconColor: 'text-teal-400',
          activeBg: 'bg-teal-600 text-white shadow-md shadow-teal-600/30',
          badge: 'Scanner',
        },
        {
          id: 'timetable',
          label: t('nav.timetable', 'Class Timetable'),
          icon: CalendarDays,
          iconColor: 'text-sky-400',
          activeBg: 'bg-sky-600 text-white shadow-md shadow-sky-600/30',
        },
        {
          id: 'exams',
          label: t('nav.exams', 'Exams & Results'),
          icon: Award,
          iconColor: 'text-yellow-400',
          activeBg: 'bg-yellow-600 text-white shadow-md shadow-yellow-600/30',
        },
        {
          id: 'certificates',
          label: t('nav.certificates', 'Certificates & Awards'),
          icon: FileBadge,
          iconColor: 'text-lime-400',
          activeBg: 'bg-lime-600 text-white shadow-md shadow-lime-600/30',
        },
        {
          id: 'certificate-registry',
          label: t('nav.certificateRegistry', 'Certificate Registry'),
          icon: FileCheck2,
          iconColor: 'text-emerald-400',
          activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
        },
      ],
    },
    {
      title: t('nav.staffFaculty', 'Faculty & HR Management'),
      items: [
        {
          id: 'staff',
          label: t('nav.staff', 'Staff Directory'),
          icon: Users,
          adminOnly: true,
          iconColor: 'text-purple-400',
          activeBg: 'bg-purple-600 text-white shadow-md shadow-purple-600/30',
        },
        {
          id: 'hr-management',
          label: t('nav.hrms', 'HR Management (HRMS)'),
          icon: Briefcase,
          adminOnly: true,
          badge: pendingLeavesCount > 0 ? `${pendingLeavesCount} Req` : undefined,
          iconColor: 'text-violet-400',
          activeBg: 'bg-violet-600 text-white shadow-md shadow-violet-600/30',
        },
        {
          id: 'staff-attendance',
          label: t('nav.staffAttendance', 'Staff Attendance'),
          icon: Clock,
          adminOnly: true,
          iconColor: 'text-orange-400',
          activeBg: 'bg-orange-600 text-white shadow-md shadow-orange-600/30',
        },
      ],
    },
    {
      title: t('nav.financialAccounting', 'Accounts & Finance'),
      items: [
        {
          id: 'fee-collection',
          label: t('nav.feeCollection', 'Fee Collection'),
          icon: Receipt,
          iconColor: 'text-emerald-400',
          activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
        },
        {
          id: 'due-fees',
          label: t('nav.dueFees', 'Pending & Due Fees'),
          icon: AlertTriangle,
          badge: defaultersCount > 0 ? defaultersCount : undefined,
          iconColor: 'text-amber-400',
          activeBg: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
        },
        {
          id: 'fee-structure',
          label: t('nav.feeStructure', 'Fee Structures'),
          icon: Layers,
          iconColor: 'text-teal-400',
          activeBg: 'bg-teal-600 text-white shadow-md shadow-teal-600/30',
        },
        {
          id: 'expenses',
          label: t('nav.expenses', 'Expense Tracker'),
          icon: TrendingDown,
          iconColor: 'text-rose-400',
          activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/30',
        },
        {
          id: 'budget',
          label: t('nav.budgetPlanning', 'Budget Planning'),
          icon: PiggyBank,
          iconColor: 'text-cyan-400',
          activeBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
        },
        {
          id: 'payroll',
          label: t('nav.payroll', 'Payroll & HR'),
          icon: DollarSign,
          iconColor: 'text-fuchsia-400',
          activeBg: 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30',
        },
        {
          id: 'ledger',
          label: t('nav.ledger', 'Accounts Ledger'),
          icon: BookOpen,
          iconColor: 'text-indigo-400',
          activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
        },
      ],
    },
    {
      title: t('nav.campusOperations', 'Store, Inventory & Assets'),
      items: [
        {
          id: 'bookshop',
          label: t('nav.bookshop', 'Bookstore & POS'),
          icon: ShoppingBag,
          iconColor: 'text-pink-400',
          activeBg: 'bg-pink-600 text-white shadow-md shadow-pink-600/30',
        },
        {
          id: 'inventory',
          label: t('nav.inventory', 'Store Inventory & Stock'),
          icon: Boxes,
          iconColor: 'text-teal-400',
          activeBg: 'bg-teal-600 text-white shadow-md shadow-teal-600/30',
        },
        {
          id: 'assets',
          label: t('nav.assets', 'Fixed Assets & Equipment'),
          icon: Package,
          iconColor: 'text-blue-400',
          activeBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/30',
        },
      ],
    },
    {
      title: t('settings.userAccounts', 'Account & Security'),
      items: [
        {
          id: 'users',
          label: t('nav.users', 'User Management'),
          icon: Users,
          adminOnly: true,
          iconColor: 'text-rose-400',
          activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/30',
        },
        {
          id: 'profile',
          label: isAdmin ? t('nav.profileSettings', 'Profile & Settings') : t('nav.profile', 'My Profile'),
          icon: UserCheck,
          iconColor: 'text-teal-400',
          activeBg: 'bg-teal-600 text-white shadow-md shadow-teal-600/30',
        },
        {
          id: 'activity-log',
          label: t('nav.activityLogs', 'Activity Log & Audit'),
          icon: ShieldAlert,
          adminOnly: true,
          iconColor: 'text-red-400',
          activeBg: 'bg-red-600 text-white shadow-md shadow-red-600/30',
        },
      ],
    },
    {
      title: t('nav.examinationReports', 'Intelligence & Admin'),
      items: [
        {
          id: 'reports',
          label: t('nav.reports', 'Reports & Analytics'),
          icon: BarChart3,
          iconColor: 'text-sky-400',
          activeBg: 'bg-sky-600 text-white shadow-md shadow-sky-600/30',
        },
        {
          id: 'settings',
          label: t('nav.settings', 'School Settings'),
          icon: Settings,
          adminOnly: true,
          iconColor: 'text-slate-400',
          activeBg: 'bg-slate-700 text-white shadow-md shadow-slate-700/30',
        },
        {
          id: 'backup',
          label: t('nav.backup', 'Backup Data'),
          icon: HardDrive,
          adminOnly: true,
          iconColor: 'text-cyan-400',
          activeBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
        },
        {
          id: 'about',
          label: t('nav.about', 'About EduLedger'),
          icon: Info,
          iconColor: 'text-indigo-400',
          activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30',
        },
      ],
    },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <EduLedgerLogo
            src="/pwa-192x192.png"
            alt="EduLedger Logo"
            size={36}
            className="w-9 h-9 rounded-xl shadow-md shadow-indigo-600/30 object-contain shrink-0"
          />
          <div className="min-w-0">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5 truncate">
              <span>EduLedger</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-bold">PWA</span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium truncate">Offline School Management</p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-5 min-h-0">
          {navSections.map((section, sIdx) => {
            // Filter out items not allowed for current role
            const visibleItems = section.items.filter(item => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.id === 'payroll' && !isAdmin && !isFinance) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx}>
                <p className="px-3 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id || (item.id === 'certificates' && activeTab === 'certification');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        title={item.label}
                        className={`group w-full h-10 flex items-center justify-between gap-2 px-3 rounded-xl text-[13px] font-semibold transition-all cursor-pointer min-w-0 ${
                          isActive
                            ? (item.activeBg || 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30')
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-white' : (item.iconColor || 'text-slate-400')
                            }`}
                          />
                          <span className="truncate leading-tight text-left">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              isActive
                                ? 'bg-white text-indigo-700'
                                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Netlify Deploy Quick Action */}
        <div className="px-3 pb-2">
          <button
            onClick={() => {
              setActiveTab('settings');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800/80 text-teal-300 text-xs font-bold transition group cursor-pointer shadow-2xs"
            title="Publish app to Netlify"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
              <span>Publish on Netlify</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition" />
          </button>
        </div>

        {/* Footer Role, Dark Mode & Storage Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
          {/* Dark Mode Enable Button */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-xs font-semibold text-slate-300 transition cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="flex items-center gap-2">
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isDarkMode ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {isDarkMode ? 'Dark Enabled' : 'Enable Dark'}
            </span>
          </button>

          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-slate-300">IndexedDB Local DB</p>
                <p className="text-[9px] text-slate-500">100% Offline Capable</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* User Session & Logout in Sidebar */}
          {currentUser && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-400 capitalize">@{currentUser.username} · {role?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-bold transition cursor-pointer"
                title="Log Out of system"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Session</span>
              </button>
            </div>
          )}

          {/* Developer / Creator Credit */}
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-center">
            <DeveloperLogo
              size="sm"
              showCredit={true}
              creditVariant="poweredBy"
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </aside>
    </>
  );
};
