import { CloudSyncSection } from "./CloudSyncSection";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  SchoolSettings,
  User,
  UserRole,
  AdmissionFormSettings,
  canUserAdmissionAction,
} from '../../types';
import { resolveAdmissionFormSettings } from '../../admissions/admissionTemplates';
import { hashString } from '../../utils/crypto';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BackupInspectionResult } from '../../db/indexedDB';
import { AutomatedBackupSection } from './AutomatedBackupSection';
import { DataPurgeResetSection } from './DataPurgeResetSection';
import { DataIntegrityTab } from './DataIntegrityTab';
import { ManageClassesPanel } from './ManageClassesPanel';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Users,
  Shield,
  Clock,
  Save,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  Coins,
  Check,
  GraduationCap,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Layers,
  AlertCircle,
  Sparkles,
  BookOpen,
  X,
  Cloud,
  Sun,
  Moon,
  Database,
  Copy,
  Eye,
  CheckCheck,
  Calendar,
  FileCode,
  Globe,
  Mail,
} from 'lucide-react';
import { useTranslation, exportLanguageLocaleMetadata, SupportedLanguage } from '../../i18n';
import { DeveloperLogo } from '../common/DeveloperLogo';
import { BRANDING_CONFIG } from '../../config/branding';
import { ConfirmModal } from '../common/ConfirmModal';
import { NetlifyPublishSection } from './NetlifyPublishSection';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { ClearableDataModule } from '../../types';

const CURRENCY_PRESETS = [
  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee', display: 'PKR (Rs.)', flag: '🇵🇰' },
  { code: 'PKR', symbol: 'PKR', label: 'Pakistani Rupee (ISO)', display: 'PKR (PKR)', flag: '🇵🇰' },
  { code: 'USD', symbol: '$', label: 'US Dollar', display: 'USD ($)', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', label: 'Euro', display: 'EUR (€)', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', label: 'British Pound', display: 'GBP (£)', flag: '🇬🇧' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', display: 'INR (₹)', flag: '🇮🇳' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham', display: 'AED', flag: '🇦🇪' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal', display: 'SAR', flag: '🇸🇦' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', display: 'CAD (C$)', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', display: 'AUD (A$)', flag: '🇦🇺' },
];

interface SettingsViewProps {
  initialTab?: 'general' | 'classes' | 'users' | 'backup' | 'purge' | 'data-management' | 'netlify' | 'sync' | 'integrity' | 'data-integrity';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'general' }) => {
  const {
    settings,
    updateSettings,
    allUsers,
    refreshAllUsers,
    backupDatabase,
    restoreDatabase,
    inspectBackup,
    getBackupJsonString,
    resetToDemo,
    autoBackupConfig,
    setActiveTab: setSchoolActiveTab,
    students,
    staff,
    feePayments,
    expenses,
    exams,
    books,
    studentAttendance,
    staffAttendance,
    activityLogs,
    addClass,
    addMultipleClasses,
    removeClass,
    renameClass,
    reorderClasses,
    addSection,
    removeSection,
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  } = useSchool();
  const { currentUser, isAdmin, createUser, toggleUserStatus, updateUser } = useAuth();

  // Settings form state
  const [formData, setFormData] = useState<SchoolSettings>({
    schoolName: settings.schoolName || '',
    schoolTagline: settings.schoolTagline || '',
    schoolAddress: settings.schoolAddress || '',
    schoolPhone: settings.schoolPhone || '',
    schoolEmail: settings.schoolEmail || '',
    schoolWebsite: settings.schoolWebsite || '',
    currencySymbol: settings.currencySymbol || '$',
    currencyCode: settings.currencyCode || 'USD',
    currentAcademicYear: settings.currentAcademicYear || '2026-2027',
    autoLogoutMinutes: settings.autoLogoutMinutes ?? 30,
    receiptPrefix: settings.receiptPrefix || 'REC-2026',
    certificatePrefix: settings.certificatePrefix || 'CERT',
    allowTeacherOwnClassCertificates: settings.allowTeacherOwnClassCertificates ?? false,
    standardClasses: settings.standardClasses || [],
    standardSections: settings.standardSections || [],
    preferredLanguage: settings.preferredLanguage,
    localeMetadata: settings.localeMetadata,
    showDeveloperCreditOnPrint: settings.showDeveloperCreditOnPrint ?? true,
    admissionFormSettings: resolveAdmissionFormSettings(settings),
  });

  const canEditAdmissionTemplates = canUserAdmissionAction(currentUser, 'edit_templates');

  const updateAdmissionFormSetting = <K extends keyof AdmissionFormSettings>(
    key: K,
    value: AdmissionFormSettings[K]
  ) => {
    if (!canEditAdmissionTemplates) return;
    setFormData(prev => ({
      ...prev,
      admissionFormSettings: {
        ...resolveAdmissionFormSettings(prev),
        [key]: value,
      },
    }));
  };

  const { language, setLanguage, languages, currentLanguageInfo, isRTL, t } = useTranslation();

  const handleSelectLangInSettings = (code: SupportedLanguage) => {
    setLanguage(code);
    const updated = exportLanguageLocaleMetadata(code, formData);
    setFormData(prev => ({
      ...prev,
      preferredLanguage: code,
      localeMetadata: updated.localeMetadata,
    }));
    updateSettings(exportLanguageLocaleMetadata(code, settings));
  };

  const [activeTab, setActiveTab] = useState<
    'general' | 'classes' | 'users' | 'backup' | 'purge' | 'data-management' | 'netlify' | 'sync' | 'integrity' | 'data-integrity'
  >(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [saveNotice, setSaveNotice] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isQuickExporting, setIsQuickExporting] = useState(false);
  const [quickExportSuccess, setQuickExportSuccess] = useState<string | null>(null);

  const handleQuickExportBackup = async () => {
    setIsQuickExporting(true);
    try {
      const res = await backupDatabase();
      setQuickExportSuccess(`Exported "${res.filename}" (${(res.sizeBytes / 1024).toFixed(1)} KB) containing ${res.recordsCount} records.`);
      setTimeout(() => setQuickExportSuccess(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export database.');
    } finally {
      setIsQuickExporting(false);
    }
  };

  // Class Management state for settings
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [classNotice, setClassNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingClassName, setEditingClassName] = useState<string | null>(null);
  const [editingClassInput, setEditingClassInput] = useState('');
  const [newSectionInput, setNewSectionInput] = useState('');
  const [isClassBatchOpen, setIsClassBatchOpen] = useState(false);
  const [batchClassesInput, setBatchClassesInput] = useState('');

  const currentClasses = useMemo(() => settings.standardClasses || [], [settings.standardClasses]);
  const currentSections = useMemo(() => settings.standardSections || ['A', 'B', 'C'], [settings.standardSections]);

  const studentCountPerClass = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of currentClasses) counts[c] = 0;
    for (const s of students) {
      if (counts[s.className] !== undefined) counts[s.className]++;
      else counts[s.className] = 1;
    }
    return counts;
  }, [currentClasses, students]);

  const currentTotalRecords = useMemo(() => {
    return (
      (students?.length || 0) +
      (staff?.length || 0) +
      (feePayments?.length || 0) +
      (expenses?.length || 0) +
      (studentAttendance?.length || 0) +
      (staffAttendance?.length || 0) +
      (allUsers?.length || 0) +
      (exams?.length || 0) +
      (books?.length || 0) +
      (activityLogs?.length || 0)
    );
  }, [
    students,
    staff,
    feePayments,
    expenses,
    studentAttendance,
    staffAttendance,
    allUsers,
    exams,
    books,
    activityLogs,
  ]);

  const lastBackupTime = typeof window !== 'undefined' ? localStorage.getItem('eduledger_last_backup_timestamp') : null;
  const lastBackupFilename = typeof window !== 'undefined' ? localStorage.getItem('eduledger_last_backup_filename') : null;
  const lastRestoreTime = typeof window !== 'undefined' ? localStorage.getItem('eduledger_last_restore_timestamp') : null;

  const popularClassPresets = [
    'Pre-K',
    'Kindergarten',
    'Nursery',
    'Grade 11',
    'Grade 12',
    'O-Level 1',
    'O-Level 2',
    'A-Level 1',
    'A-Level 2',
  ];
  const availableClassPresets = popularClassPresets.filter(
    p => !currentClasses.some(c => c.toLowerCase() === p.toLowerCase())
  );

  const showClassNotice = (type: 'success' | 'error', message: string) => {
    setClassNotice({ type, message });
    setTimeout(() => setClassNotice(null), 3500);
  };

  const handleSettingsAddClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to add classes.');
      return;
    }
    const trimmed = newClassNameInput.trim();
    if (!trimmed) {
      showClassNotice('error', 'Please enter a valid class name.');
      return;
    }
    if (currentClasses.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showClassNotice('error', `Class "${trimmed}" already exists in the academic catalog.`);
      return;
    }
    const ok = await addClass(trimmed);
    if (ok) {
      showClassNotice('success', `Class "${trimmed}" added successfully to institutional curriculum.`);
      setNewClassNameInput('');
    } else {
      showClassNotice('error', 'Failed to add class.');
    }
  };

  const handleSettingsAddPreset = async (preset: string) => {
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to add classes.');
      return;
    }
    const ok = await addClass(preset);
    if (ok) {
      showClassNotice('success', `Class "${preset}" added successfully!`);
    } else {
      showClassNotice('error', `Failed to add "${preset}".`);
    }
  };

  const handleSettingsBatchAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to add classes.');
      return;
    }
    const names = batchClassesInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      showClassNotice('error', 'Please enter at least one class name.');
      return;
    }
    if (addMultipleClasses) {
      const res = await addMultipleClasses(names);
      if (res.added.length > 0) {
        showClassNotice(
          'success',
          `Added ${res.added.length} classes: ${res.added.join(', ')}.${
            res.duplicates.length > 0 ? ` (${res.duplicates.length} duplicate(s) skipped)` : ''
          }`
        );
        setBatchClassesInput('');
        setIsClassBatchOpen(false);
      } else {
        showClassNotice('error', 'All specified classes already exist.');
      }
    }
  };

  const handleSettingsRenameClass = async () => {
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to rename classes.');
      return;
    }
    if (!editingClassName) return;
    const trimmed = editingClassInput.trim();
    if (!trimmed || trimmed === editingClassName) {
      setEditingClassName(null);
      return;
    }
    if (currentClasses.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingClassName)) {
      showClassNotice('error', `A class named "${trimmed}" already exists.`);
      return;
    }
    const enrolled = studentCountPerClass[editingClassName] || 0;
    const ok = await renameClass(editingClassName, trimmed);
    if (ok) {
      showClassNotice('success', `Renamed "${editingClassName}" to "${trimmed}". Updated ${enrolled} enrolled student(s).`);
      setEditingClassName(null);
    } else {
      showClassNotice('error', 'Failed to rename class.');
    }
  };

  const handleSettingsDeleteClass = async (className: string) => {
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to delete classes.');
      return;
    }
    const count = studentCountPerClass[className] || 0;
    if (count > 0) {
      const okConfirm = window.confirm(
        `There are currently ${count} student(s) enrolled in ${className}. Are you sure you want to remove this class from standard classes?`
      );
      if (!okConfirm) return;
    } else {
      const okConfirm = window.confirm(`Remove class "${className}"?`);
      if (!okConfirm) return;
    }
    const ok = await removeClass(className);
    if (ok) {
      showClassNotice('success', `Class "${className}" removed.`);
    } else {
      showClassNotice('error', 'Failed to remove class.');
    }
  };

  const handleSettingsReorder = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to reorder classes.');
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentClasses.length) return;
    const copy = [...currentClasses];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    await reorderClasses(copy);
  };

  const handleSettingsAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to add sections.');
      return;
    }
    const trimmed = newSectionInput.trim().toUpperCase();
    if (!trimmed) {
      showClassNotice('error', 'Please enter a section name.');
      return;
    }
    if (currentSections.includes(trimmed)) {
      showClassNotice('error', `Section "${trimmed}" already exists.`);
      return;
    }
    const ok = await addSection(trimmed);
    if (ok) {
      showClassNotice('success', `Section "${trimmed}" added.`);
      setNewSectionInput('');
    } else {
      showClassNotice('error', 'Failed to add section.');
    }
  };

  const handleSettingsRemoveSection = async (section: string) => {
    if (!isAdmin) {
      showClassNotice('error', 'Administrator authority required to remove sections.');
      return;
    }
    if (currentSections.length <= 1) {
      showClassNotice('error', 'At least one active section is required.');
      return;
    }
    const ok = await removeSection(section);
    if (ok) {
      showClassNotice('success', `Section "${section}" removed.`);
    } else {
      showClassNotice('error', 'Failed to remove section.');
    }
  };

  // User management modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    password: string;
    securityQuestion: string;
    securityAnswer: string;
  }>({
    username: '',
    fullName: '',
    email: '',
    role: 'finance',
    password: '',
    securityQuestion: 'What is the official school mascot?',
    securityAnswer: '',
  });

  // Manual Database Backup & Restore State
  const [backupNotice, setBackupNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    name: string;
    size: number;
    content: string;
    inspection: BackupInspectionResult;
  } | null>(null);
  const [isRestoreInspectionModalOpen, setIsRestoreInspectionModalOpen] = useState(false);
  const [isJsonPreviewModalOpen, setIsJsonPreviewModalOpen] = useState(false);
  const [previewJsonString, setPreviewJsonString] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.preferredLanguage) {
      setLanguage(formData.preferredLanguage as SupportedLanguage);
    }
    const payload: SchoolSettings = canEditAdmissionTemplates
      ? formData
      : { ...formData, admissionFormSettings: settings.admissionFormSettings };
    await updateSettings(payload);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  const handleDownloadBackup = async () => {
    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Administrative Privilege Required',
        details: 'Only system administrators have permission to download full database snapshots.',
      });
      return;
    }
    setIsBackingUp(true);
    try {
      const result = await backupDatabase();
      setBackupNotice({
        type: 'success',
        message: 'Database Backup Successfully Downloaded',
        details: `Saved ${result.filename} (${(result.sizeBytes / 1024).toFixed(1)} KB) containing ${result.recordsCount} records across all 17 database object stores.`,
      });
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Backup Export Failed',
        details: err instanceof Error ? err.message : 'An error occurred while generating the database snapshot.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      setBackupNotice({
        type: 'error',
        message: 'Administrative Privilege Required',
        details: 'Only system administrators have authorization to restore database snapshots.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const content = ev.target?.result as string;
        const inspection = inspectBackup(content);
        if (!inspection.valid) {
          setBackupNotice({
            type: 'error',
            message: 'Invalid Backup File',
            details: inspection.error || 'The uploaded file is not a valid EduLedger JSON database backup.',
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Open inspection modal with parsed entities before restoring
        setPendingRestore({
          name: file.name,
          size: file.size,
          content,
          inspection,
        });
        setIsRestoreInspectionModalOpen(true);
      } catch (err: unknown) {
        setBackupNotice({
          type: 'error',
          message: 'Failed to Parse Backup File',
          details: err instanceof Error ? err.message : 'The selected file could not be parsed as JSON.',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      const ok = await restoreDatabase(pendingRestore.content);
      if (ok) {
        setBackupNotice({
          type: 'success',
          message: 'Database Restored Successfully',
          details: `All local records have been restored from "${pendingRestore.name}" (${pendingRestore.inspection.entityCounts.students} students, ${pendingRestore.inspection.entityCounts.staff} faculty, ${pendingRestore.inspection.entityCounts.feePayments} fee collections).`,
        });
        setIsRestoreInspectionModalOpen(false);
        setPendingRestore(null);
      } else {
        setBackupNotice({
          type: 'error',
          message: 'Database Restore Failed',
          details: 'An error occurred while writing records to IndexedDB.',
        });
      }
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Restore Failed',
        details: err instanceof Error ? err.message : 'Unknown database error occurred during restoration.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenJsonPreview = async () => {
    try {
      const json = await getBackupJsonString();
      setPreviewJsonString(json);
      setIsJsonPreviewModalOpen(true);
      setIsCopied(false);
    } catch (err: unknown) {
      setBackupNotice({
        type: 'error',
        message: 'Failed to Generate JSON Preview',
        details: err instanceof Error ? err.message : 'Error retrieving database JSON state.',
      });
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(previewJsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setIsCopied(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      fullName: '',
      email: '',
      role: 'finance',
      password: '',
      securityQuestion: 'What is the official school mascot?',
      securityAnswer: 'eagle',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      password: '',
      securityQuestion: user.securityQuestion,
      securityAnswer: '',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username.trim() || !userFormData.fullName.trim()) {
      alert('Username and full name are required.');
      return;
    }

    if (editingUser) {
      const passwordHash = userFormData.password.trim()
        ? await hashString(userFormData.password.trim())
        : editingUser.passwordHash;

      const securityAnswerHash = userFormData.securityAnswer.trim()
        ? await hashString(userFormData.securityAnswer.trim())
        : editingUser.securityAnswerHash;

      await updateUser({
        ...editingUser,
        fullName: userFormData.fullName,
        email: userFormData.email,
        role: userFormData.role,
        passwordHash,
        securityQuestion: userFormData.securityQuestion,
        securityAnswerHash,
      });
    } else {
      if (!userFormData.password.trim()) {
        alert('Password is required for new accounts.');
        return;
      }

      await createUser({
        username: userFormData.username.trim().toLowerCase(),
        fullName: userFormData.fullName.trim(),
        email: userFormData.email.trim(),
        role: userFormData.role,
        passwordHash: '',
        passwordPlain: userFormData.password.trim(),
        securityQuestion: userFormData.securityQuestion,
        securityAnswerHash: '',
        isActive: true,
      });
    }

    await refreshAllUsers();
    setIsUserModalOpen(false);
  };

  const handleToggleUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    await toggleUserStatus(userId);
    await refreshAllUsers();
  };

  const handleResetDemoData = async () => {
    await resetToDemo();
    setIsResetConfirmOpen(false);
    alert('System database reset to initial demonstration state with sample students, staff, and records!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>{t('settings.title', 'School Settings & Data Governance')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('settings.subtitle', 'Configure school profile, academic parameters, accounts access, and offline database backup & restore')}
          </p>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{t('settings.savedNotice', 'School settings updated and stored locally!')}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 w-full box-border min-w-0">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'general'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t('settings.schoolProfile', 'School Profile')}</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>{t('settings.classesSections', 'Classes & Sections')}</span>
          {currentClasses.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono font-bold">
              {currentClasses.length}
            </span>
          )}
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('settings.userAccounts', 'User Accounts & RBAC')}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>{t('settings.backupData', 'Backup Data')}</span>
          {autoBackupConfig?.enabled && (
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              title="Automated Backup Active"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'integrity' || activeTab === 'data-integrity'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t('settings.dataIntegrity', 'Data Integrity')}</span>
        </button>

        <button
          onClick={() => setActiveTab('data-management')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'data-management' || activeTab === 'purge'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{t('settings.dataManagement', 'Data Management')}</span>
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sync'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-400" />
          <span>{t('settings.cloudSync', 'Cloud Sync (Firebase)')}</span>
        </button>
        <button
          onClick={() => setActiveTab('netlify')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'netlify'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4 text-teal-400" />
          <span>{t('settings.netlifyPublish', 'Netlify & Publish')}</span>
        </button>
      </div>

      {/* TAB 1: SCHOOL PROFILE SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              Institution Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motto / Tagline
                </label>
                <input
                  type="text"
                  value={formData.schoolTagline}
                  onChange={e => setFormData({ ...formData, schoolTagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.schoolPhone}
                  onChange={e => setFormData({ ...formData, schoolPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={formData.schoolEmail}
                  onChange={e => setFormData({ ...formData, schoolEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={formData.schoolAddress}
                  onChange={e => setFormData({ ...formData, schoolAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Display Theme & Dark Mode Enable Section */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Display Theme &amp; Dark Mode Preferences
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isDarkMode
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {isDarkMode ? 'Dark Mode Enabled' : 'Light Mode Active'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Campus Visual Interface Theme
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between high-contrast dark theme for low-light environments and standard daytime light theme.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDarkMode(false)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    !isDarkMode
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDarkMode(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isDarkMode
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-300" />
                  <span>Enable Dark Mode</span>
                </button>
              </div>
            </div>
          </div>

          {/* App Language & Direction (15 Supported Locales) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  App Language &amp; Script Direction (15 Locales)
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isRTL
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}>
                Active: {currentLanguageInfo.flag} {currentLanguageInfo.nativeName} ({currentLanguageInfo.name}) • {currentLanguageInfo.dir.toUpperCase()}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Select your preferred interface language. Right-to-Left (RTL) script direction is automatically applied for Urdu and Arabic, and preferences are synchronized across devices.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {languages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLangInSettings(lang.code)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-lg">{lang.flag}</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            lang.dir === 'rtl'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                              : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {lang.dir.toUpperCase()}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {lang.nativeName}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 truncate w-full">
                        {lang.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Currency & Financial Notation Settings */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Currency &amp; Monetary Format
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Active: {formData.currencyCode || 'PKR'} ({formData.currencySymbol || 'Rs.'})
              </span>
            </div>

            {/* Quick Currency Selection Pills (PKR prominently featured) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quick Select Currency Preset:
              </label>
              <div className="flex flex-wrap gap-2">
                {CURRENCY_PRESETS.map((curr, idx) => {
                  const isSelected =
                    formData.currencyCode === curr.code && formData.currencySymbol === curr.symbol;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          currencyCode: curr.code,
                          currencySymbol: curr.symbol,
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900 shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{curr.flag}</span>
                      <span>{curr.display}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              {/* Currency Dropdown Select */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preset Currency Selector
                </label>
                <select
                  value={`${formData.currencyCode}-${formData.currencySymbol}`}
                  onChange={e => {
                    const found = CURRENCY_PRESETS.find(
                      c => `${c.code}-${c.symbol}` === e.target.value
                    );
                    if (found) {
                      setFormData({
                        ...formData,
                        currencyCode: found.code,
                        currencySymbol: found.symbol,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                >
                  {CURRENCY_PRESETS.map((c, i) => (
                    <option key={i} value={`${c.code}-${c.symbol}`}>
                      {c.flag} {c.label}
                    </option>
                  ))}
                  <option value="custom">⚙️ Custom Currency...</option>
                </select>
              </div>

              {/* Custom Currency Symbol (e.g. PKR, Rs., ₨, $) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol / Prefix *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rs. or PKR or $"
                  value={formData.currencySymbol}
                  onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Appears before amounts on vouchers &amp; receipts (e.g. Rs. or PKR)</p>
              </div>

              {/* Currency ISO Code */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency ISO Code (Opt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PKR"
                  value={formData.currencyCode}
                  onChange={e => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold uppercase text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">3-letter code (e.g. PKR, USD, EUR)</p>
              </div>
            </div>

            {/* Live Real-Time Financial Preview */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <span>Live Fee &amp; Voucher Display Preview:</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  How amounts will render across Fee Collection vouchers, tuition slips, and ledger accounts.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                  {formatCurrency(25000, formData.currencySymbol)}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                  {formatCurrency(4500, formData.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Academic & Accounts Rules */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              Academic &amp; Accounts Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Session Year
                </label>
                <input
                  type="text"
                  value={formData.currentAcademicYear}
                  onChange={e => setFormData({ ...formData, currentAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Prefix
                </label>
                <input
                  type="text"
                  value={formData.receiptPrefix}
                  onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inactivity Auto-Logout (Minutes)
                </label>
                <select
                  value={formData.autoLogoutMinutes}
                  onChange={e => setFormData({ ...formData, autoLogoutMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={0}>Disabled (Never Auto-Logout)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Certificate Number Prefix
                </label>
                <input
                  type="text"
                  value={formData.certificatePrefix || 'CERT'}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      certificatePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12),
                    })
                  }
                  placeholder="CERT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Allow Teachers to Generate Own-Class Certificates
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    When enabled, Teacher accounts may generate certificates strictly for their assigned classes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.allowTeacherOwnClassCertificates)}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      allowTeacherOwnClassCertificates: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0 ml-3"
                />
              </div>

              {/* Admission Form Templates & Printed Texts (Main Admin Only) */}
              <div className="sm:col-span-2 pt-4 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Student Admission Form Templates &amp; Profile Texts
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Controls the school-wide default form template and dynamic texts printed on the Habitat A4 Portrait Admission Form.
                    </p>
                  </div>
                  {!canEditAdmissionTemplates && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Main Admin Only
                    </span>
                  )}
                </div>

                {(() => {
                  const admCfg = resolveAdmissionFormSettings(formData);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          School-Wide Default Admission Form Template
                        </label>
                        <select
                          disabled={!canEditAdmissionTemplates}
                          value={admCfg.defaultTemplateId}
                          onChange={e =>
                            updateAdmissionFormSetting(
                              'defaultTemplateId',
                              e.target.value as 'standard' | 'habitat_a4_portrait'
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-60"
                        >
                          <option value="standard">Standard Form (Default)</option>
                          <option value="habitat_a4_portrait">Habitat Admission Form (A4 Portrait)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Secondary School Phone (Printed in Form Footer)
                        </label>
                        <input
                          type="text"
                          disabled={!canEditAdmissionTemplates}
                          value={admCfg.schoolPhone2 || ''}
                          onChange={e => updateAdmissionFormSetting('schoolPhone2', e.target.value)}
                          placeholder="e.g. 0300-7654321 (optional)"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          &ldquo;Start&rdquo; Field Label (Habitat Form)
                        </label>
                        <input
                          type="text"
                          disabled={!canEditAdmissionTemplates}
                          value={admCfg.startDateLabel}
                          onChange={e => updateAdmissionFormSetting('startDateLabel', e.target.value)}
                          placeholder="Admission Date"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-60"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {['Admission Date', 'Session Start', 'Start Date'].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              disabled={!canEditAdmissionTemplates}
                              onClick={() => updateAdmissionFormSetting('startDateLabel', preset)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Footer Thank-You Banner
                        </label>
                        <input
                          type="text"
                          disabled={!canEditAdmissionTemplates}
                          value={admCfg.footerThankYouText}
                          onChange={e => updateAdmissionFormSetting('footerThankYouText', e.target.value)}
                          placeholder="THANK YOU FOR REGISTRATION"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase font-semibold disabled:opacity-60"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 dark:text-slate-200">
                            Show Undertaking Section on Form
                          </label>
                          <input
                            type="checkbox"
                            disabled={!canEditAdmissionTemplates}
                            checked={admCfg.showUndertaking}
                            onChange={e => updateAdmissionFormSetting('showUndertaking', e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <textarea
                          rows={2}
                          disabled={!canEditAdmissionTemplates || !admCfg.showUndertaking}
                          value={admCfg.undertakingText}
                          onChange={e => updateAdmissionFormSetting('undertakingText', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-60"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 dark:text-slate-200">
                            Show Annual Fee Increase Note &amp; Signature Line
                          </label>
                          <input
                            type="checkbox"
                            disabled={!canEditAdmissionTemplates}
                            checked={admCfg.showFeeNote}
                            onChange={e => updateAdmissionFormSetting('showFeeNote', e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                        </div>
                        <textarea
                          rows={2}
                          disabled={!canEditAdmissionTemplates || !admCfg.showFeeNote}
                          value={admCfg.feeNoteText}
                          onChange={e => updateAdmissionFormSetting('feeNoteText', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-60"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Documents Required List (Printed in Footer)
                        </label>
                        <input
                          type="text"
                          disabled={!canEditAdmissionTemplates}
                          value={admCfg.documentsRequiredText}
                          onChange={e => updateAdmissionFormSetting('documentsRequiredText', e.target.value)}
                          placeholder="One 4x4 Photo, Father's CNIC, Student's B.Form, previous class Result Card"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-60"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            Bilingual Printed Form Labels (English + Urdu)
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Default OFF. When enabled, adds Urdu labels alongside English labels on the printed Habitat form.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          disabled={!canEditAdmissionTemplates}
                          checked={admCfg.bilingualLabels}
                          onChange={e => updateAdmissionFormSetting('bilingualLabels', e.target.checked)}
                          className="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0 ml-3"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Quick Database Backup Data Section */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-indigo-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Backup Data &amp; Local Disaster Recovery
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    JSON Supported
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Export complete school records locally as a JSON backup file, or import an existing backup to restore database state.
                </p>
                {quickExportSuccess && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{quickExportSuccess}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                disabled={isQuickExporting || !isAdmin}
                onClick={handleQuickExportBackup}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                title="Download complete database as a JSON file now"
              >
                {isQuickExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export JSON Backup</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Manage full backup, restore, automated scheduler & snapshots"
              >
                <HardDrive className="w-4 h-4" />
                <span>Open Backup Hub</span>
              </button>
            </div>
          </div>

          {/* Document Branding & Developer Credits (Main Admin Authority) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <FileCode className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Document Branding &amp; Developer Attribution
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Control developer credits on printed vouchers, reports, payslips &amp; ID cards
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                System Branding
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <div className="space-y-1 max-w-xl">
                <label htmlFor="dev-credit-toggle" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer">
                  <span>Show developer credit on printed documents</span>
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When enabled, includes a discreet &ldquo;Developed by NextGenAI&rdquo; attribution tag in the footer of printed fee vouchers, payroll slips, ID cards, and annual financial statements.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="dev-credit-toggle"
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={formData.showDeveloperCreditOnPrint ?? true}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      showDeveloperCreditOnPrint: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Developer Support & Creator Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                  <DeveloperLogo size="md" showCredit={false} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{BRANDING_CONFIG.developerName} Engineering</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">v2.5.0</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {BRANDING_CONFIG.creditText} • Need custom institutional customizations or support?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${BRANDING_CONFIG.supportEmail}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Support Email</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
            >
              Save System Profile
            </button>
          </div>
        </form>
      )}

      {/* TAB: ACADEMIC CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          {/* Admin Authority Header / Status */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Institutional Academic Curriculum &amp; Classes
                  </h3>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      Admin Authority
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      Read Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAdmin
                    ? 'As an Administrator, you have full authority to add more classes, rename, reorder, and configure classroom sections.'
                    : 'Viewing academic classes. Administrator permissions are required to add or modify classes.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                {currentClasses.length} Active Classes
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 shadow-xs">
                {currentSections.length} Standard Sections
              </span>
            </div>
          </div>

          <ManageClassesPanel />

          {/* Section Management */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Standard Classroom Sections ({currentSections.length})
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Shared across all curriculum grades
              </span>
            </div>

            {isAdmin && (
              <form onSubmit={handleSettingsAddSection} className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="New section (e.g. D, E, Blue)..."
                  value={newSectionInput}
                  onChange={e => setNewSectionInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Add Section
                </button>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {currentSections.map(sec => (
                <div
                  key={sec}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {sec}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Section {sec}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSettingsRemoveSection(sec)}
                      disabled={currentSections.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Remove section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT & ROLES (Admin Only) */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Authorized Operator Accounts
              </h3>
              <p className="text-xs text-slate-500">
                Manage Admin and Finance &amp; Accounts personnel logins
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSchoolActiveTab('profile')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Open Profile & Directory</span>
              </button>
              <button
                onClick={handleOpenAddUser}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create User Account</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role Access</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {allUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                      <p className="text-[11px] text-slate-400">{user.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      @{user.username}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {user.role === 'admin' ? 'Administrator (Full Access)' : 'Finance & Accounts User'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition"
                          title="Edit User Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUser(user.id)}
                          className={`p-1.5 rounded-lg transition ${
                            user.isActive
                              ? 'text-slate-400 hover:text-red-600'
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATED CLIENT-SIDE DATA BACKUP & RECOVERY */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <AutomatedBackupSection />

          {/* Reset Demo Data Card */}
          <div className="p-6 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Demonstration Seed Database</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Replaces current local records with the initial demonstration school dataset (Grade 1-10 students, staff faculty, attendance roll-calls, and 6 months of historical fee payments).
              </p>
            </div>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              Reset to Demo Database
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DATA INTEGRITY (CROSS-MODULE AUDIT & ORPHAN DETECTION) */}
      {(activeTab === 'integrity' || activeTab === 'data-integrity') && (
        <DataIntegrityTab onNavigateToDataManagement={() => setActiveTab('data-management')} />
      )}

      {/* TAB 5: DATA MANAGEMENT (CLEAR & RESET) */}
      {(activeTab === 'purge' || activeTab === 'data-management') && (
        <DataPurgeResetSection />
      )}

{/* TAB 4: PUBLISH ON NETLIFY */}
      {activeTab === 'sync' && <CloudSyncSection />}
      {activeTab === 'netlify' && (
        <NetlifyPublishSection />
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              {editingUser ? 'Edit User Credentials' : 'Create New System User'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.fullName}
                  onChange={e => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser}
                  value={userFormData.username}
                  onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Permission
                </label>
                <select
                  value={userFormData.role}
                  onChange={e =>
                    setUserFormData({ ...userFormData, role: e.target.value as UserRole })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="super_admin">Super Admin (Full Administrative Authority)</option>
                  <option value="admin">Administrator (School & System Admin)</option>
                  <option value="principal">Principal (Academic & Leadership)</option>
                  <option value="accountant">Accountant (Accounts & Finance Specialist)</option>
                  <option value="hr_manager">HR Manager (Faculty, Dossiers & Leaves)</option>
                  <option value="teacher">Teacher (Attendance & Academic Records)</option>
                  <option value="receptionist">Receptionist (Admissions & Front Desk)</option>
                  <option value="librarian">Librarian / Store Keeper</option>
                  <option value="finance">Finance User (Standard Billing)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password {editingUser && '(Leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Security Question (For Password Recovery)
                </label>
                <input
                  type="text"
                  value={userFormData.securityQuestion}
                  onChange={e =>
                    setUserFormData({ ...userFormData, securityQuestion: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Security Answer
                </label>
                <input
                  type="text"
                  value={userFormData.securityAnswer}
                  onChange={e =>
                    setUserFormData({ ...userFormData, securityAnswer: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Confirm Factory Demo Reset"
        message="This will overwrite all active offline records with initial demonstration data. All changes made will be lost unless backed up. Are you sure you want to proceed?"
        confirmLabel="Reset Database"
        isDestructive={true}
        onConfirm={handleResetDemoData}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
