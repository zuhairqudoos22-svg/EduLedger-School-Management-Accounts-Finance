import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab, UserRole } from '../../types';
import {
  GraduationCap,
  FileText,
  CalendarCheck,
  Receipt,
  Layers,
  TrendingDown,
  Award,
  Calendar,
  Briefcase,
  FileBadge,
  Package,
  Boxes,
  Users,
  BarChart3,
  Settings,
  Info,
  DollarSign,
  AlertTriangle,
  Clock,
  PiggyBank,
  BookOpen,
  Search,
  Sparkles,
  ChevronRight,
  Trophy,
  HardDrive,
  ShieldAlert,
  UserCheck,
  ShoppingBag,
  Filter,
  QrCode,
} from 'lucide-react';

type ModuleCategory = 'All' | 'Academics' | 'Faculty & HR' | 'Accounts & Finance' | 'Store & Assets' | 'Admin & Security';

interface ModuleItem {
  id: ActiveTab;
  name: string;
  category: 'Academics' | 'Faculty & HR' | 'Accounts & Finance' | 'Store & Assets' | 'Admin & Security';
  icon: React.ElementType;
  description: string;
  badge?: string | number;
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | 'cyan' | 'teal' | 'pink' | 'violet' | 'orange';
  iconBoxClasses: string;
  cardBorderHover: string;
  titleHover: string;
  allowedRoles?: UserRole[];
  adminOnly?: boolean;
}

export const QuickActionsHub: React.FC = () => {
  const {
    setActiveTab,
    getDefaultersList,
    staffLeaves,
    students,
    staff,
    allUsers,
    books,
    assets,
  } = useSchool();
  const { role, isAdmin } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const defaultersCount = getDefaultersList().length;
  const pendingLeavesCount = (staffLeaves || []).filter(l => l.status === 'pending').length;

  const allModules: ModuleItem[] = [
    // --- ACADEMICS ---
    {
      id: 'students',
      name: 'Students Directory',
      category: 'Academics',
      icon: GraduationCap,
      description: 'Directory, enrollment profiles & student ID cards',
      badge: `${students.length} Total`,
      badgeColor: 'blue',
      iconBoxClasses: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
      cardBorderHover: 'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-500/10',
      titleHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
      adminOnly: true,
    },
    {
      id: 'admission-form',
      name: 'Admissions Form',
      category: 'Academics',
      icon: FileText,
      description: 'New applicant registration, form print & verification',
      badgeColor: 'indigo',
      iconBoxClasses: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
      cardBorderHover: 'hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-indigo-500/10',
      titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      adminOnly: true,
    },
    {
      id: 'student-attendance',
      name: 'Student Attendance',
      category: 'Academics',
      icon: CalendarCheck,
      description: 'Daily classroom roll-call, biometric sync & reports',
      badgeColor: 'emerald',
      iconBoxClasses: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
      cardBorderHover: 'hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-500/10',
      titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    },
    {
      id: 'attendance-qr',
      name: 'QR Attendance & Badges',
      category: 'Academics',
      icon: QrCode,
      description: 'Contactless roll call, live camera scanner & printable scannable ID cards',
      badge: 'Scanner',
      badgeColor: 'violet',
      iconBoxClasses: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white',
      cardBorderHover: 'hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-violet-500/10',
      titleHover: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    },
    {
      id: 'timetable',
      name: 'Class Timetable',
      category: 'Academics',
      icon: Calendar,
      description: 'Weekly schedule grid, period allocation & teachers',
      badgeColor: 'cyan',
      iconBoxClasses: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white',
      cardBorderHover: 'hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-cyan-500/10',
      titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    },
    {
      id: 'exams',
      name: 'Exams & Results',
      category: 'Academics',
      icon: Award,
      description: 'Grade books, marks sheets & digital report cards',
      badgeColor: 'amber',
      iconBoxClasses: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950',
      cardBorderHover: 'hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-amber-500/10',
      titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    },
    {
      id: 'certificates',
      name: 'Certificates & Awards',
      category: 'Academics',
      icon: FileBadge,
      description: 'Issue character, merit, sports & completion certs',
      badgeColor: 'teal',
      iconBoxClasses: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
      cardBorderHover: 'hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-teal-500/10',
      titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    },
    {
      id: 'leaderboard',
      name: 'Leaderboard & Badges',
      category: 'Academics',
      icon: Trophy,
      description: 'Student & faculty gamified points, medals & badges',
      badgeColor: 'amber',
      iconBoxClasses: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950',
      cardBorderHover: 'hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/15',
      titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    },

    // --- FACULTY & HR ---
    {
      id: 'staff',
      name: 'Staff Directory',
      category: 'Faculty & HR',
      icon: Users,
      description: 'Faculty profiles, subject specialization & contact data',
      badge: `${staff.length} Faculty`,
      badgeColor: 'purple',
      iconBoxClasses: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
      cardBorderHover: 'hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-purple-500/10',
      titleHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
      adminOnly: true,
    },
    {
      id: 'hr-management',
      name: 'HRMS & Leaves',
      category: 'Faculty & HR',
      icon: Briefcase,
      description: 'Leave applications, approvals & HR documents',
      badge: pendingLeavesCount > 0 ? `${pendingLeavesCount} Req` : undefined,
      badgeColor: 'amber',
      iconBoxClasses: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white',
      cardBorderHover: 'hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-violet-500/10',
      titleHover: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
      adminOnly: true,
    },
    {
      id: 'staff-attendance',
      name: 'Staff Attendance',
      category: 'Faculty & HR',
      icon: Clock,
      description: 'Faculty check-in, presence log & attendance audit',
      badgeColor: 'orange',
      iconBoxClasses: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white',
      cardBorderHover: 'hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-orange-500/10',
      titleHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
      adminOnly: true,
    },
    {
      id: 'payroll',
      name: 'Staff Payroll',
      category: 'Faculty & HR',
      icon: DollarSign,
      description: 'Monthly payroll generator, allowances & payslips',
      badgeColor: 'violet',
      iconBoxClasses: 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-400 group-hover:bg-fuchsia-600 group-hover:text-white',
      cardBorderHover: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-600 hover:shadow-fuchsia-500/10',
      titleHover: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400',
      adminOnly: true,
    },

    // --- ACCOUNTS & FINANCE ---
    {
      id: 'fee-collection',
      name: 'Fee Collection',
      category: 'Accounts & Finance',
      icon: Receipt,
      description: 'Receive payments, generate instant receipts & vouchers',
      badgeColor: 'emerald',
      iconBoxClasses: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
      cardBorderHover: 'hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-500/10',
      titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    },
    {
      id: 'due-fees',
      name: 'Pending & Due Fees',
      category: 'Accounts & Finance',
      icon: AlertTriangle,
      description: 'Defaulters roster, aging analysis & reminder SMS',
      badge: defaultersCount > 0 ? `${defaultersCount} Dues` : undefined,
      badgeColor: 'amber',
      iconBoxClasses: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950',
      cardBorderHover: 'hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-amber-500/10',
      titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    },
    {
      id: 'fee-structure',
      name: 'Fee Structures',
      category: 'Accounts & Finance',
      icon: Layers,
      description: 'Grade-wise tuition slabs, admission & transport fees',
      badgeColor: 'teal',
      iconBoxClasses: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
      cardBorderHover: 'hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-teal-500/10',
      titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    },
    {
      id: 'expenses',
      name: 'Expense Tracker',
      category: 'Accounts & Finance',
      icon: TrendingDown,
      description: 'Operational expenses, vendor payments & receipts',
      badgeColor: 'rose',
      iconBoxClasses: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white',
      cardBorderHover: 'hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-rose-500/10',
      titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    },
    {
      id: 'budget',
      name: 'Budget Planning',
      category: 'Accounts & Finance',
      icon: PiggyBank,
      description: 'Annual capital allocations & actual vs budget variance',
      badgeColor: 'cyan',
      iconBoxClasses: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white',
      cardBorderHover: 'hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-cyan-500/10',
      titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    },
    {
      id: 'ledger',
      name: 'Accounts Ledger',
      category: 'Accounts & Finance',
      icon: BookOpen,
      description: 'Double-entry accounting journal & balance sheets',
      badgeColor: 'indigo',
      iconBoxClasses: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
      cardBorderHover: 'hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-indigo-500/10',
      titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    },

    // --- STORE, INVENTORY & ASSETS ---
    {
      id: 'bookshop',
      name: 'Bookstore & POS',
      category: 'Store & Assets',
      icon: ShoppingBag,
      description: 'Textbooks, stationery, uniforms & point-of-sale cash register',
      badge: `${books.length} Items`,
      badgeColor: 'pink',
      iconBoxClasses: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white',
      cardBorderHover: 'hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-pink-500/10',
      titleHover: 'group-hover:text-pink-600 dark:group-hover:text-pink-400',
    },
    {
      id: 'inventory',
      name: 'Store Inventory',
      category: 'Store & Assets',
      icon: Boxes,
      description: 'Stock levels, restock alerts, suppliers & order tracking',
      badgeColor: 'teal',
      iconBoxClasses: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
      cardBorderHover: 'hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-teal-500/10',
      titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    },
    {
      id: 'assets',
      name: 'Fixed Assets & Lab',
      category: 'Store & Assets',
      icon: Package,
      description: 'School furniture, lab equipment, IT hardware & depreciation',
      badge: `${assets?.length || 0} Assets`,
      badgeColor: 'blue',
      iconBoxClasses: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
      cardBorderHover: 'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-500/10',
      titleHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    },

    // --- ADMIN & SECURITY ---
    {
      id: 'users',
      name: 'User Management',
      category: 'Admin & Security',
      icon: Users,
      description: 'User accounts, role authorities & password resets',
      badge: `${allUsers.length} Users`,
      badgeColor: 'rose',
      iconBoxClasses: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white',
      cardBorderHover: 'hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-rose-500/10',
      titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
      adminOnly: true,
    },
    {
      id: 'profile',
      name: isAdmin ? 'Profile & Users' : 'My User Profile',
      category: 'Admin & Security',
      icon: UserCheck,
      description: 'User details, password change & 2FA security settings',
      badgeColor: 'teal',
      iconBoxClasses: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
      cardBorderHover: 'hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-teal-500/10',
      titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    },
    {
      id: 'activity-log',
      name: 'Activity & Audit Log',
      category: 'Admin & Security',
      icon: ShieldAlert,
      description: 'Tamper-proof audit logs, fee deletions & login history',
      badgeColor: 'rose',
      iconBoxClasses: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white',
      cardBorderHover: 'hover:border-red-400 dark:hover:border-red-600 hover:shadow-red-500/10',
      titleHover: 'group-hover:text-red-600 dark:group-hover:text-red-400',
      adminOnly: true,
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      category: 'Admin & Security',
      icon: BarChart3,
      description: 'Revenue trends, turnout metrics & PDF exports',
      badgeColor: 'blue',
      iconBoxClasses: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white',
      cardBorderHover: 'hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-sky-500/10',
      titleHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
    },
    {
      id: 'backup',
      name: 'Data Backup & Vault',
      category: 'Admin & Security',
      icon: HardDrive,
      description: 'Automated background scheduler, safety snapshots & JSON export',
      badgeColor: 'cyan',
      iconBoxClasses: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white',
      cardBorderHover: 'hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-cyan-500/10',
      titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
      adminOnly: true,
    },
    {
      id: 'settings',
      name: 'School Settings',
      category: 'Admin & Security',
      icon: Settings,
      description: 'Institutional identity, academic year & class sections',
      badgeColor: 'indigo',
      iconBoxClasses: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-700 group-hover:text-white',
      cardBorderHover: 'hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-slate-500/10',
      titleHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-200',
      adminOnly: true,
    },
    {
      id: 'about',
      name: 'About NextGen AI',
      category: 'Admin & Security',
      icon: Info,
      description: 'App release notes, PWA offline status & system info',
      badgeColor: 'indigo',
      iconBoxClasses: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
      cardBorderHover: 'hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-indigo-500/10',
      titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    },
  ];

  // Role-based filtering
  const permittedModules = allModules.filter(mod => {
    if (mod.adminOnly && !isAdmin) return false;
    if (mod.allowedRoles && (!role || !mod.allowedRoles.includes(role))) return false;
    return true;
  });

  // Category and search filtering
  const filteredModules = permittedModules.filter(mod => {
    if (selectedCategory !== 'All' && mod.category !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      mod.name.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.category.toLowerCase().includes(q)
    );
  });

  const getBadgeClasses = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'rose':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'amber':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'purple':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 'teal':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'pink':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800';
      case 'violet':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-300 dark:border-violet-800';
      case 'orange':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    }
  };

  const categories: { label: ModuleCategory; activeColor: string; inactiveColor: string }[] = [
    {
      label: 'All',
      activeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/50',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
    },
    {
      label: 'Academics',
      activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-1 ring-blue-400/50',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40',
    },
    {
      label: 'Faculty & HR',
      activeColor: 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400/50',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40',
    },
    {
      label: 'Accounts & Finance',
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/50',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
    },
    {
      label: 'Store & Assets',
      activeColor: 'bg-pink-600 text-white shadow-md shadow-pink-600/25 ring-1 ring-pink-400/50',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40',
    },
    {
      label: 'Admin & Security',
      activeColor: 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25 ring-1 ring-amber-300/60',
      inactiveColor: 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header and Jump-To Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Quick Actions &amp; Navigation</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {permittedModules.length} Modules Online
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant 1-tap jump to school administration, academic tools, finance and faculty records
          </p>
        </div>

        {/* Jump To Module Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or module..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.label;
          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => setSelectedCategory(cat.label)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isSelected ? cat.activeColor : cat.inactiveColor
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Distinctly Colored Icon Cards: 4 columns desktop, 2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
        {filteredModules.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <button
              key={`${mod.id}-${idx}`}
              type="button"
              onClick={() => setActiveTab(mod.id)}
              className={`group flex flex-col items-start p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-left transition-all shadow-2xs hover:shadow-md active:scale-[0.98] cursor-pointer relative overflow-hidden ${mod.cardBorderHover}`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className={`p-2.5 rounded-xl transition-all shadow-xs ${mod.iconBoxClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {mod.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${getBadgeClasses(
                      mod.badgeColor
                    )}`}
                  >
                    {mod.badge}
                  </span>
                )}
              </div>

              <div className="w-full">
                <div className="flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white transition-colors ${mod.titleHover}`}>
                    {mod.name}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-snug">
                  {mod.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="py-8 text-center text-xs text-slate-400">
          No modules found matching &ldquo;{searchQuery}&rdquo;. Try another keyword or category tab.
        </div>
      )}
    </div>
  );
};
