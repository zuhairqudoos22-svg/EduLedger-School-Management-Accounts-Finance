/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TranslationProvider, useTranslation, SupportedLanguage } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationToastContainer } from './components/common/NotificationToastContainer';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudentManagementView } from './components/students/StudentManagementView';
import { AdmissionFormModal } from './components/students/AdmissionFormModal';
import { StudentAttendanceView } from './components/students/StudentAttendanceView';
import { AttendanceQRGeneratorView } from './components/attendance/AttendanceQRGeneratorView';
import { StaffManagementView } from './components/staff/StaffManagementView';
import { HRManagementView } from './components/hr/HRManagementView';
import { StaffAttendanceView } from './components/staff/StaffAttendanceView';
import { FeeStructureView } from './components/finance/FeeStructureView';
import { FeeCollectionView } from './components/finance/FeeCollectionView';
import { DueFeesView } from './components/finance/DueFeesView';
import { ExpensesView } from './components/finance/ExpensesView';
import { BudgetPlanningView } from './components/finance/BudgetPlanningView';
import { PayrollView } from './components/finance/PayrollView';
import { LedgerView } from './components/finance/LedgerView';
import { ReportsView } from './components/reports/ReportsView';
import { ExamResultsView } from './components/exams/ExamResultsView';
import { TimetableManagementView } from './components/timetable/TimetableManagementView';
import { SettingsView } from './components/settings/SettingsView';
import { ProfileManagementView } from './components/profile/ProfileManagementView';
import { BookshopView } from './components/bookshop/BookshopView';
import { LeaderboardView } from './components/gamification/LeaderboardView';
import { ActivityLogView } from './components/activity/ActivityLogView';
import { CertificatesView } from './components/certificates/CertificatesView';
import { AboutView } from './components/about/AboutView';
import { BreadcrumbNavigation } from './components/navigation/BreadcrumbNavigation';
import { ReceiptModal } from './components/common/ReceiptModal';
import { IDCardModal } from './components/common/IDCardModal';
import { ResultCardModal } from './components/exams/ResultCardModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { FloatingQuickAdd } from './components/common/FloatingQuickAdd';
import { InstallBanner } from './components/pwa/InstallBanner';
import { FirstRunAdminSetup } from './components/auth/FirstRunAdminSetup';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { EmailVerificationBanner } from './components/auth/EmailVerificationBanner';
import { EmailVerificationPendingScreen } from './components/auth/EmailVerificationPendingScreen';
import { AuthActionView } from './components/auth/AuthActionView';
import { EmailMigrationModal } from './components/auth/EmailMigrationModal';
import { SessionTimeoutWarningModal } from './components/common/SessionTimeoutWarningModal';
import { BackupReminderBanner } from './components/common/BackupReminderBanner';
import { DemoDataBanner } from './components/common/DemoDataBanner';
import { DeveloperLogo } from './components/common/DeveloperLogo';
import { ShieldAlert } from 'lucide-react';

function MainApp() {
  const {
    currentUser,
    pendingVerificationUser,
    logout,
    role,
    isAdmin,
    isFinance,
    isLoading: isAuthLoading,
    isFirstRunSetup,
  } = useAuth();

  // Detect Firebase Auth email action URL (?mode=verifyEmail|resetPassword&oobCode=...)
  const [authActionParams, setAuthActionParams] = useState<{
    mode: 'verifyEmail' | 'resetPassword';
    oobCode: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if ((mode === 'verifyEmail' || mode === 'resetPassword') && oobCode) {
      return { mode, oobCode };
    }
    return null;
  });

  const handleCompleteAuthAction = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setAuthActionParams(null);
  };
  const {
    activeTab,
    setActiveTab,
    settings,
    receiptToPrint,
    setReceiptToPrint,
    idCardStudent,
    setIdCardStudent,
    resultCardToPrint,
    setResultCardToPrint,
    isDarkMode,
    toggleDarkMode,
  } = useSchool();

  const { language, setLanguage } = useTranslation();

  // Synchronize translation language whenever school settings change
  useEffect(() => {
    if (settings.preferredLanguage && settings.preferredLanguage !== language) {
      setLanguage(settings.preferredLanguage as SupportedLanguage);
    }
  }, [settings.preferredLanguage, language, setLanguage]);

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false);

  const showEmailMigration =
    Boolean(
      currentUser &&
      (currentUser.email?.endsWith('@eduledger.local') || !currentUser.email) &&
      (currentUser.role === 'admin' || currentUser.role === 'super_admin' || (currentUser.emailMigrationSkippedCount || 0) < 3)
    ) || isChangeEmailModalOpen;

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Seamless Dark Mode Transition & LocalStorage Persistence Logic
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    // Apply temporary transition class for seamless, ripple-free color interpolation
    root.classList.add('theme-transitioning');

    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      try {
        localStorage.setItem('eduledger_theme', 'dark');
      } catch (err) {
        console.warn('Unable to persist dark theme in localStorage:', err);
      }
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      try {
        localStorage.setItem('eduledger_theme', 'light');
      } catch (err) {
        console.warn('Unable to persist light theme in localStorage:', err);
      }
    }

    // Update meta theme-color dynamically for PWA standalone mode and mobile browser chrome
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#020617' : '#4F46E5');
    }

    // Clean up temporary transition class after transition completes (300ms)
    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 320);

    return () => clearTimeout(timer);
  }, [isDarkMode]);

  // Synchronize with external/cross-tab storage changes without full page reload
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eduledger_theme' && e.newValue) {
        const wantsDark = e.newValue === 'dark';
        if (wantsDark !== isDarkMode) {
          toggleDarkMode();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isDarkMode, toggleDarkMode]);

  // Inactivity Auto-logout (default 15 minutes, with 60s warning popup)
  const timeoutMinutes = settings.autoLogoutMinutes ?? 15;
  const { isWarningOpen, secondsRemaining, stayLoggedIn } = useInactivityTimeout(
    timeoutMinutes,
    () => {
      logout();
    },
    !!currentUser && timeoutMinutes > 0
  );

  // Dedicated landing screen for email verification and password reset links
  if (authActionParams) {
    return (
      <AuthActionView
        mode={authActionParams.mode}
        oobCode={authActionParams.oobCode}
        onComplete={handleCompleteAuthAction}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xs">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold text-slate-400">Loading EduLedger Database...</p>
          <div className="pt-2">
            <DeveloperLogo size="lg" loading="eager" showCredit={true} creditVariant="poweredBy" />
          </div>
        </div>
      </div>
    );
  }

  // Pending email verification gate for unverified real email accounts
  if (pendingVerificationUser) {
    return <EmailVerificationPendingScreen />;
  }

  // First-run setup: if no admin exists, show "Create Admin Account" screen
  if (isFirstRunSetup) {
    return <FirstRunAdminSetup />;
  }

  // If user is not authenticated, display login screen
  if (!currentUser) {
    return <LoginView />;
  }

  // Render view corresponding to activeTab with function/route-level RBAC enforcement
  const renderViewContent = () => {
    // Reusable Unauthorized Card for Non-Admin trying to access restricted routes
    const renderUnauthorizedCard = (moduleName: string) => (
      <div className="p-8 max-w-lg mx-auto my-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Access Denied: Administrator Authority Required
          </h3>
          <p className="text-xs text-slate-500">
            You do not possess the required clearance to access <strong>{moduleName}</strong>. Your current role is <strong>{role}</strong>.
          </p>
        </div>
        <p className="text-[11px] text-slate-400">
          This security incident has been logged in the institutional audit trail.
        </p>
      </div>
    );

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'students':
        return <StudentManagementView />;
      case 'admission-form':
        return <AdmissionFormModal isStandaloneView={true} />;
      case 'student-attendance':
        return <StudentAttendanceView />;
      case 'attendance-qr':
        return <AttendanceQRGeneratorView />;
      case 'staff':
      case 'hr-management':
        return <HRManagementView />;
      case 'staff-attendance':
        return <StaffAttendanceView />;
      case 'exams':
        return <ExamResultsView />;
      case 'timetable':
        return <TimetableManagementView />;
      case 'certificates':
      case 'certification':
        return <CertificatesView initialSubTab="studio" />;
      case 'certificate-registry':
        return <CertificatesView initialSubTab="registry" />;
      case 'fee-structure':
        return <FeeStructureView />;
      case 'fee-collection':
        return <FeeCollectionView />;
      case 'due-fees':
        return <DueFeesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'budget':
        return <BudgetPlanningView />;
      case 'payroll':
        if (!isAdmin && !isFinance) {
          return renderUnauthorizedCard('Payroll & Human Resources');
        }
        return <PayrollView />;
      case 'ledger':
        return <LedgerView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        if (!isAdmin) return renderUnauthorizedCard('School Settings & Parameters');
        return <SettingsView />;
      case 'data-management':
        if (!isAdmin) return renderUnauthorizedCard('Data Management: Clear & Reset');
        return <SettingsView initialTab="data-management" />;
      case 'integrity':
      case 'data-integrity':
        if (!isAdmin) return renderUnauthorizedCard('Data Integrity & Audit Hub');
        return <SettingsView initialTab="integrity" />;
      case 'backup':
        if (!isAdmin) return renderUnauthorizedCard('Local Database Backup & Restoration');
        return <SettingsView initialTab="backup" />;
      case 'profile':
        return <ProfileManagementView initialSubTab="my-profile" />;
      case 'users':
        if (!isAdmin) return renderUnauthorizedCard('User Accounts & Role Permissions');
        return <ProfileManagementView initialSubTab="all-users" />;
      case 'bookshop':
      case 'inventory':
        return <BookshopView initialTab="inventory" />;
      case 'assets':
        return <BookshopView initialTab="assets" />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'activity-log':
        if (!isAdmin) return renderUnauthorizedCard('Security & Operations Audit Trail');
        return <ActivityLogView />;
      case 'about':
        return <AboutView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 ease-in-out">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <EmailVerificationBanner onOpenChangeEmail={() => setIsChangeEmailModalOpen(true)} />
        <DemoDataBanner onOpenDataManagement={() => setActiveTab('data-management')} />
        <BackupReminderBanner />

        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 w-full max-w-[1600px] mx-auto space-y-6 transition-colors duration-300 min-w-0">
          <BreadcrumbNavigation />
          <InstallBanner />
          {renderViewContent()}
        </main>
      </div>

      {/* Modals & Overlays */}
      <ReceiptModal
        receipt={receiptToPrint}
        settings={settings}
        onClose={() => setReceiptToPrint(null)}
      />

      <IDCardModal
        student={idCardStudent}
        settings={settings}
        onClose={() => setIdCardStudent(null)}
      />

      <ResultCardModal
        result={resultCardToPrint}
        settings={settings}
        onClose={() => setResultCardToPrint(null)}
      />

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <FloatingQuickAdd />

      <OfflineIndicator />

      {/* In-App Notification Toast Alerts Layer */}
      <NotificationToastContainer />

      {/* 60-second Session Inactivity Warning Modal */}
      <SessionTimeoutWarningModal
        isOpen={isWarningOpen}
        secondsRemaining={secondsRemaining}
        onStayLoggedIn={stayLoggedIn}
        onLogoutNow={logout}
      />

      {/* Mandatory Password Change Modal for admin reset accounts */}
      <ForcePasswordChangeModal isOpen={!!currentUser?.forcePasswordChange} />

      {/* One-Time Real Email Migration Modal */}
      <EmailMigrationModal
        isOpen={showEmailMigration}
        onClose={() => setIsChangeEmailModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <SchoolProvider>
          <NotificationProvider>
            <MainApp />
          </NotificationProvider>
        </SchoolProvider>
      </AuthProvider>
    </TranslationProvider>
  );
}
