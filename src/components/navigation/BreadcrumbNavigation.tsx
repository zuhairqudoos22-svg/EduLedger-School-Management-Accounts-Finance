import React, { useState, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useTranslation } from '../../i18n';
import { ActiveTab } from '../../types';
import { BackButton } from '../common/BackButton';
import {
  Home,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Users,
  CreditCard,
  ShoppingBag,
  BarChart3,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Award,
  FileText,
  User,
  CalendarCheck,
  CalendarDays,
  Receipt,
  BookOpen,
  Boxes,
  Package,
  Info,
  QrCode,
} from 'lucide-react';

interface CategorySibling {
  tab: ActiveTab;
  label: string;
}

interface CrumbItem {
  id: string;
  label: string;
  tab?: ActiveTab;
  isCategory?: boolean;
  categoryTabTarget?: ActiveTab;
  categorySiblings?: CategorySibling[];
  icon?: React.ElementType;
  isDetail?: boolean;
}

export const BreadcrumbNavigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    canGoBack,
    goBackTab,
    students,
    staff,
    selectedStudentIdForDetail,
    setSelectedStudentIdForDetail,
    selectedStaffIdForDetail,
    setSelectedStaffIdForDetail,
    idCardStudent,
    setIdCardStudent,
    receiptToPrint,
    setReceiptToPrint,
    resultCardToPrint,
    setResultCardToPrint,
    saleReceiptToPrint,
    setSaleReceiptToPrint,
  } = useSchool();
  const { t } = useTranslation();

  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Check if we are on dashboard with no open detail modals
  const isHomeOnly =
    activeTab === 'dashboard' &&
    !idCardStudent &&
    !receiptToPrint &&
    !resultCardToPrint &&
    !saleReceiptToPrint &&
    !selectedStudentIdForDetail &&
    !selectedStaffIdForDetail;

  if (isHomeOnly) {
    return null;
  }

  // Base Root Crumb
  const crumbs: CrumbItem[] = [
    {
      id: 'root-home',
      label: t('nav.overview', 'Home'),
      tab: 'dashboard',
      icon: Home,
    },
  ];

  // Helper definitions for categories and their sibling sub-pages
  const ACADEMIC_SIBLINGS: CategorySibling[] = [
    { tab: 'students', label: t('nav.students', 'Student Directory') },
    { tab: 'admission-form', label: t('nav.admissionForm', 'Admission Form') },
    { tab: 'student-attendance', label: t('nav.studentAttendance', 'Student Attendance') },
    { tab: 'attendance-qr', label: t('nav.attendanceQR', 'QR Attendance Badges') },
    { tab: 'timetable', label: t('nav.timetable', 'Class Timetable') },
    { tab: 'exams', label: t('nav.exams', 'Exams & Results') },
    { tab: 'certificates', label: t('nav.certificates', 'Certificates & Awards') },
    { tab: 'certificate-registry', label: t('nav.certificateRegistry', 'Certificate Registry') },
  ];

  const FACULTY_SIBLINGS: CategorySibling[] = [
    { tab: 'hr-management', label: t('nav.hrms', 'HR Management (HRMS)') },
    { tab: 'staff', label: t('nav.staff', 'Staff Directory') },
    { tab: 'staff-attendance', label: t('nav.staffAttendance', 'Staff Attendance') },
  ];

  const FINANCE_SIBLINGS: CategorySibling[] = [
    { tab: 'fee-collection', label: t('nav.feeCollection', 'Fee Collection') },
    { tab: 'due-fees', label: t('nav.dueFees', 'Pending & Due Fees') },
    { tab: 'fee-structure', label: t('nav.feeStructure', 'Fee Structures') },
    { tab: 'expenses', label: t('nav.expenses', 'Expense Tracker') },
    { tab: 'budget', label: t('nav.budgetPlanning', 'Budget Planning') },
    { tab: 'payroll', label: t('nav.payroll', 'Staff Payroll') },
    { tab: 'ledger', label: t('nav.ledger', 'Accounts Ledger') },
  ];

  const CONFIG_SIBLINGS: CategorySibling[] = [
    { tab: 'users', label: t('settings.userAccounts', 'User Management') },
    { tab: 'settings', label: t('nav.settings', 'Settings & Data') },
    { tab: 'profile', label: t('nav.profile', 'Profile & Security') },
    { tab: 'activity-log', label: t('nav.activityLogs', 'Activity Log & Audit') },
    { tab: 'about', label: t('nav.about', 'About EduLedger') },
  ];

  // Map activeTab to category + module crumbs
  switch (activeTab) {
    // --- ACADEMIC & STUDENTS ---
    case 'students':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-students', label: 'Student Directory', tab: 'students', icon: User });
      break;

    case 'admission-form':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-admission-form', label: 'Admission Form', tab: 'admission-form', icon: FileText });
      break;

    case 'student-attendance':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({
        id: 'mod-student-att',
        label: 'Student Attendance',
        tab: 'student-attendance',
        icon: CalendarCheck,
      });
      break;

    case 'attendance-qr':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({
        id: 'mod-attendance-qr',
        label: 'QR Attendance Badges',
        tab: 'attendance-qr',
        icon: QrCode,
      });
      break;

    case 'exams':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-exams', label: 'Exams & Results', tab: 'exams', icon: Award });
      break;

    case 'timetable':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-timetable', label: 'Class Timetable', tab: 'timetable', icon: CalendarDays });
      break;

    case 'certificates':
    case 'certification':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-certificates', label: 'Certificates & Awards', tab: 'certificates', icon: Award });
      break;

    case 'certificate-registry':
      crumbs.push({
        id: 'cat-academic',
        label: 'Academic & Students',
        isCategory: true,
        categoryTabTarget: 'students',
        categorySiblings: ACADEMIC_SIBLINGS,
        icon: GraduationCap,
      });
      crumbs.push({ id: 'mod-certificate-registry', label: 'Certificate Registry', tab: 'certificate-registry', icon: FileText });
      break;

    // --- FACULTY & STAFF ---
    case 'hr-management':
    case 'staff':
      crumbs.push({
        id: 'cat-staff',
        label: 'Faculty & HR',
        isCategory: true,
        categoryTabTarget: 'hr-management',
        categorySiblings: FACULTY_SIBLINGS,
        icon: Users,
      });
      crumbs.push({
        id: 'mod-hr-management',
        label: 'HR Management (HRMS)',
        tab: 'hr-management',
        icon: Users,
      });
      break;

    case 'staff-attendance':
      crumbs.push({
        id: 'cat-staff',
        label: 'Faculty & Staff',
        isCategory: true,
        categoryTabTarget: 'staff',
        categorySiblings: FACULTY_SIBLINGS,
        icon: Users,
      });
      crumbs.push({
        id: 'mod-staff-att',
        label: 'Staff Attendance',
        tab: 'staff-attendance',
        icon: CalendarCheck,
      });
      break;

    // --- ACCOUNTS & FINANCE ---
    case 'fee-collection':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-fees', label: 'Fee Collection', tab: 'fee-collection', icon: Receipt });
      break;

    case 'due-fees':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-due-fees', label: 'Pending & Due Fees', tab: 'due-fees' });
      break;

    case 'fee-structure':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-fee-struct', label: 'Fee Structures', tab: 'fee-structure' });
      break;

    case 'expenses':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-expenses', label: 'Expense Tracker', tab: 'expenses' });
      break;

    case 'budget':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-budget', label: 'Budget Planning', tab: 'budget' });
      break;

    case 'payroll':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-payroll', label: 'Staff Payroll', tab: 'payroll' });
      break;

    case 'ledger':
      crumbs.push({
        id: 'cat-finance',
        label: 'Accounts & Finance',
        isCategory: true,
        categoryTabTarget: 'fee-collection',
        categorySiblings: FINANCE_SIBLINGS,
        icon: CreditCard,
      });
      crumbs.push({ id: 'mod-ledger', label: 'Accounts Ledger', tab: 'ledger' });
      break;

    // --- STORE, INVENTORY & ASSETS ---
    case 'bookshop':
    case 'inventory':
    case 'assets':
      crumbs.push({
        id: 'cat-bookshop',
        label: 'Store, Inventory & Assets',
        isCategory: true,
        categoryTabTarget: 'bookshop',
        icon: Boxes,
      });
      crumbs.push({
        id: 'mod-bookshop',
        label:
          activeTab === 'assets'
            ? 'Fixed Assets & Equipment'
            : activeTab === 'inventory'
            ? 'Store Inventory & Stock'
            : 'Bookstore & POS',
        tab: activeTab,
        icon: activeTab === 'assets' ? Package : Boxes,
      });
      break;

    // --- INTELLIGENCE & REPORTS ---
    case 'reports':
      crumbs.push({
        id: 'cat-reports',
        label: 'Intelligence & Reports',
        isCategory: true,
        categoryTabTarget: 'reports',
        icon: BarChart3,
      });
      crumbs.push({ id: 'mod-reports', label: 'Reports & Analytics', tab: 'reports' });
      break;

    // --- GAMIFICATION & CAMPUS ---
    case 'leaderboard':
      crumbs.push({
        id: 'cat-gamification',
        label: 'Gamification & Campus',
        isCategory: true,
        categoryTabTarget: 'leaderboard',
        icon: Trophy,
      });
      crumbs.push({
        id: 'mod-leaderboard',
        label: 'Leaderboard & Badges',
        tab: 'leaderboard',
        icon: Trophy,
      });
      break;

    // --- CONFIGURATION ---
    case 'settings':
      crumbs.push({
        id: 'cat-config',
        label: 'Configuration',
        isCategory: true,
        categoryTabTarget: 'settings',
        categorySiblings: CONFIG_SIBLINGS,
        icon: Settings,
      });
      crumbs.push({ id: 'mod-settings', label: 'School Settings', tab: 'settings' });
      break;

    case 'backup':
      crumbs.push({
        id: 'cat-config',
        label: 'Configuration',
        isCategory: true,
        categoryTabTarget: 'settings',
        categorySiblings: CONFIG_SIBLINGS,
        icon: Settings,
      });
      crumbs.push({ id: 'mod-backup', label: 'Data Backup & Recovery', tab: 'backup' });
      break;

    case 'users':
      crumbs.push({
        id: 'cat-config',
        label: 'Administration & Security',
        isCategory: true,
        categoryTabTarget: 'users',
        categorySiblings: CONFIG_SIBLINGS,
        icon: ShieldCheck,
      });
      crumbs.push({ id: 'mod-users', label: 'User Management', tab: 'users', icon: Users });
      break;

    case 'profile':
      crumbs.push({
        id: 'cat-config',
        label: 'Configuration',
        isCategory: true,
        categoryTabTarget: 'profile',
        categorySiblings: CONFIG_SIBLINGS,
        icon: ShieldCheck,
      });
      crumbs.push({ id: 'mod-profile', label: 'Profile Management', tab: 'profile' });
      break;

    case 'activity-log':
      crumbs.push({
        id: 'cat-config',
        label: 'Security & Audit',
        isCategory: true,
        categoryTabTarget: 'activity-log',
        categorySiblings: CONFIG_SIBLINGS,
        icon: ShieldAlert,
      });
      crumbs.push({ id: 'mod-activity-log', label: 'Activity Log & Audit Trail', tab: 'activity-log' });
      break;

    case 'about':
      crumbs.push({
        id: 'cat-config',
        label: 'System & Information',
        isCategory: true,
        categoryTabTarget: 'about',
        categorySiblings: CONFIG_SIBLINGS,
        icon: Info,
      });
      crumbs.push({ id: 'mod-about', label: 'About NextGen AI SMS', tab: 'about', icon: Info });
      break;

    default:
      break;
  }

  // --- DETAIL PAGES & ACTIVE PREVIEWS AS DEEPEST LEAF CRUMBS ---
  if (selectedStudentIdForDetail) {
    const student = students.find(s => s.id === selectedStudentIdForDetail);
    crumbs.push({
      id: 'detail-student',
      label: student ? `Student: ${student.fullName} (${student.rollNo})` : 'Student Details',
      icon: GraduationCap,
      isDetail: true,
    });
  } else if (selectedStaffIdForDetail) {
    const st = staff.find(s => s.id === selectedStaffIdForDetail);
    crumbs.push({
      id: 'detail-staff',
      label: st ? `Staff: ${st.fullName} (${st.designation})` : 'Staff Details',
      icon: Users,
      isDetail: true,
    });
  } else if (idCardStudent) {
    crumbs.push({
      id: 'detail-id-card',
      label: `ID Card: ${idCardStudent.fullName}`,
      icon: Award,
      isDetail: true,
    });
  } else if (receiptToPrint) {
    crumbs.push({
      id: 'detail-receipt',
      label: `Fee Voucher #${receiptToPrint.receiptNumber}`,
      icon: Receipt,
      isDetail: true,
    });
  } else if (resultCardToPrint) {
    crumbs.push({
      id: 'detail-result-card',
      label: `Result Card: ${resultCardToPrint.studentName}`,
      icon: Award,
      isDetail: true,
    });
  } else if (saleReceiptToPrint) {
    crumbs.push({
      id: 'detail-sale-receipt',
      label: `Sale Invoice #${saleReceiptToPrint.invoiceNo}`,
      icon: FileText,
      isDetail: true,
    });
  }

  // Navigate back to an ancestor crumb
  const handleCrumbClick = (crumb: CrumbItem) => {
    setOpenCategoryDropdown(false);

    // Dismiss active modals or detail selections
    if (idCardStudent) setIdCardStudent(null);
    if (receiptToPrint) setReceiptToPrint(null);
    if (resultCardToPrint) setResultCardToPrint(null);
    if (saleReceiptToPrint) setSaleReceiptToPrint(null);
    if (selectedStudentIdForDetail) setSelectedStudentIdForDetail(null);
    if (selectedStaffIdForDetail) setSelectedStaffIdForDetail(null);

    // Navigate to target tab
    if (crumb.tab) {
      setActiveTab(crumb.tab);
    } else if (crumb.categoryTabTarget) {
      setActiveTab(crumb.categoryTabTarget);
    }
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="print:hidden flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xs text-xs"
    >
      {/* Left side: Back Button & Progressive Breadcrumbs Trail */}
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        {canGoBack && (
          <BackButton
            onClick={goBackTab}
            label="Back"
            variant="default"
            className="shrink-0"
            ariaLabel="Return to previous screen"
          />
        )}

        <ol className="flex items-center gap-1 sm:gap-1.5 flex-wrap list-none p-0 m-0 text-slate-500 dark:text-slate-400">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            const Icon = crumb.icon;
            const hasSiblings = crumb.isCategory && crumb.categorySiblings && crumb.categorySiblings.length > 0;

            return (
              <li key={crumb.id || idx} className="flex items-center gap-1 sm:gap-1.5">
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" aria-hidden="true" />
                )}

                {isLast ? (
                  /* Current Page / Detail Leaf */
                  <span
                    aria-current="page"
                    className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                    title={crumb.label}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </span>
                ) : (
                  /* Ancestor Navigation Item */
                  <div className="relative flex items-center" ref={hasSiblings ? dropdownRef : undefined}>
                    <button
                      type="button"
                      onClick={() => handleCrumbClick(crumb)}
                      className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      title={`Return to ${crumb.label}`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate max-w-[140px] sm:max-w-none">{crumb.label}</span>
                    </button>

                    {/* Sibling Views Dropdown Indicator for Parent Categories */}
                    {hasSiblings && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setOpenCategoryDropdown(prev => !prev);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          aria-label={`Show other pages under ${crumb.label}`}
                          aria-expanded={openCategoryDropdown}
                          title={`Show options under ${crumb.label}`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Dropdown Menu of Parent Category Sub-pages */}
                        {openCategoryDropdown && crumb.categorySiblings && (
                          <div className="absolute left-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                              {crumb.label} Modules
                            </div>
                            {crumb.categorySiblings.map(sibling => (
                              <button
                                key={sibling.tab}
                                type="button"
                                onClick={() => {
                                  handleCrumbClick({
                                    id: `sibling-${sibling.tab}`,
                                    label: sibling.label,
                                    tab: sibling.tab,
                                  });
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-slate-700 transition ${
                                  activeTab === sibling.tab
                                    ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-slate-700/50'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{sibling.label}</span>
                                {activeTab === sibling.tab && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right side: Quick Jump to Leaderboard & Achievement Hub */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
          }`}
          title="Open Campus Leaderboard & Achievements"
        >
          <Trophy className={`w-3.5 h-3.5 ${activeTab === 'leaderboard' ? 'text-white' : 'text-amber-500'}`} />
          <span>Leaderboard</span>
        </button>
      </div>
    </nav>
  );
};
