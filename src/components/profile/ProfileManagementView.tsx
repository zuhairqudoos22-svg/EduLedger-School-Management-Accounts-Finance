import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, UserRole } from '../../types';
import { formatDateDisplay } from '../../utils/formatters';
import { hashString, validatePasswordRules } from '../../utils/crypto';
import { isValidRealEmail } from '../../services/firebase';
import { BackButton } from '../common/BackButton';
import {
  User as UserIcon,
  Users,
  Shield,
  CreditCard,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Plus,
  Edit2,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Save,
  X,
  HelpCircle,
  Camera,
  LogIn,
  LogOut,
} from 'lucide-react';

export interface ProfileManagementViewProps {
  initialSubTab?: 'my-profile' | 'all-users';
}

export const ProfileManagementView: React.FC<ProfileManagementViewProps> = ({
  initialSubTab = 'my-profile',
}) => {
  const {
    currentUser,
    role,
    isAdmin,
    updateProfile,
    changePassword,
    adminResetPassword,
    createUser,
    updateUser,
    toggleUserStatus,
    logout,
  } = useAuth();

  const { allUsers, refreshAllUsers, setActiveTab } = useSchool();
  const { notify } = useNotifications();

  // Active top-level subtab: 'my-profile' or 'all-users'
  const [activeSubTab, setActiveSubTab] = useState<'my-profile' | 'all-users'>(
    initialSubTab === 'all-users' && isAdmin ? 'all-users' : initialSubTab
  );

  useEffect(() => {
    if (initialSubTab === 'all-users' && isAdmin) {
      setActiveSubTab('all-users');
    }
  }, [initialSubTab, isAdmin]);

  // --- MY PROFILE STATE ---
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    username: currentUser?.username || '',
    avatarUrl: currentUser?.avatarUrl || '',
    securityQuestion: currentUser?.securityQuestion || 'What is the official school mascot?',
    securityAnswer: '',
  });

  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        username: currentUser.username || '',
        avatarUrl: currentUser.avatarUrl || '',
        securityQuestion: currentUser.securityQuestion || 'What is the official school mascot?',
        securityAnswer: '',
      });
    }
  }, [currentUser]);

  // --- PASSWORD CHANGE STATE (FOR SELF) ---
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // --- USER DIRECTORY FILTER & SEARCH (ADMIN) ---
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // --- ADMIN EDIT OTHER USER MODAL ---
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [adminUserEditForm, setAdminUserEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    role: 'finance' as UserRole,
    securityQuestion: '',
    securityAnswer: '',
    applyDiscountPermission: true,
  });
  const [adminUserEditError, setAdminUserEditError] = useState<string | null>(null);

  // --- ADMIN RESET PASSWORD MODAL ---
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<User | null>(null);
  const [adminResetPassForm, setAdminResetPassForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showAdminResetPass, setShowAdminResetPass] = useState(false);
  const [adminResetPassError, setAdminResetPassError] = useState<string | null>(null);
  const [adminResetPassSuccess, setAdminResetPassSuccess] = useState<string | null>(null);

  // --- ADD NEW USER MODAL ---
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'finance' as UserRole,
    password: '',
    securityQuestion: 'What is the official school mascot?',
    securityAnswer: 'eagle',
    applyDiscountPermission: true,
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Auto-clear message banners after 5 seconds
  useEffect(() => {
    if (profileMsg) {
      const timer = setTimeout(() => setProfileMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileMsg]);

  useEffect(() => {
    if (passwordMsg) {
      const timer = setTimeout(() => setPasswordMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMsg]);

  // Handler: Profile photo base64 upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setProfileMsg({ text: 'Image file size must be under 1.5MB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = async ev => {
        const base64 = ev.target?.result as string;
        setProfileForm(prev => ({ ...prev, avatarUrl: base64 }));
        if (currentUser) {
          const res = await updateProfile(currentUser.id, { avatarUrl: base64 });
          if (res.success) {
            setProfileMsg({ text: 'Profile picture updated successfully!', type: 'success' });
            await refreshAllUsers();
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler: Save My Profile Basic Info & Security Question
  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!profileForm.fullName.trim()) {
      setProfileMsg({ text: 'Full name cannot be blank.', type: 'error' });
      return;
    }
    if (!profileForm.username.trim()) {
      setProfileMsg({ text: 'Username cannot be blank.', type: 'error' });
      return;
    }

    const res = await updateProfile(currentUser.id, {
      fullName: profileForm.fullName,
      email: profileForm.email,
      phone: profileForm.phone,
      username: profileForm.username,
      avatarUrl: profileForm.avatarUrl,
      securityQuestion: profileForm.securityQuestion,
      securityAnswer: profileForm.securityAnswer.trim() ? profileForm.securityAnswer.trim() : undefined,
    });

    if (res.success) {
      setProfileMsg({ text: 'Profile information updated successfully!', type: 'success' });
      setIsEditingBasicInfo(false);
      setProfileForm(prev => ({ ...prev, securityAnswer: '' }));
      await refreshAllUsers();
    } else {
      setProfileMsg({ text: res.error || 'Failed to update profile.', type: 'error' });
    }
  };

  // Handler: Change My Password
  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!passwordForm.currentPassword) {
      setPasswordMsg({ text: 'Please enter your current password.', type: 'error' });
      return;
    }
    const passVal = validatePasswordRules(passwordForm.newPassword);
    if (!passVal.isValid) {
      setPasswordMsg({
        text: passVal.errors[0] || 'Password must be at least 8 chars with uppercase, lowercase, number, and symbol.',
        type: 'error',
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setIsSubmittingPassword(true);
    const res = await changePassword(
      currentUser.id,
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    setIsSubmittingPassword(false);

    if (res.success) {
      setPasswordMsg({ text: 'Password changed successfully! Keep it safe.', type: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await refreshAllUsers();
    } else {
      setPasswordMsg({ text: res.error || 'Failed to change password.', type: 'error' });
    }
  };

  // Handler: Admin Open Edit Other User Modal
  const handleOpenAdminEditUser = (user: User) => {
    setSelectedUserToEdit(user);
    const isDefaultDiscountRole = ['admin', 'super_admin', 'finance', 'accountant'].includes(user.role);
    const userHasDiscount =
      user.customPermissions?.fee_collection?.apply_discount !== undefined
        ? user.customPermissions.fee_collection.apply_discount
        : isDefaultDiscountRole;

    setAdminUserEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      username: user.username,
      role: user.role,
      securityQuestion: user.securityQuestion || 'What is the official school mascot?',
      securityAnswer: '',
      applyDiscountPermission: userHasDiscount,
    });
    setAdminUserEditError(null);
  };

  // Handler: Admin Save Other User Profile
  const handleSaveAdminUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;

    if (!adminUserEditForm.fullName.trim() || !adminUserEditForm.username.trim()) {
      setAdminUserEditError('Full name and username are required.');
      return;
    }

    const res = await updateProfile(selectedUserToEdit.id, {
      fullName: adminUserEditForm.fullName,
      email: adminUserEditForm.email,
      phone: adminUserEditForm.phone,
      username: adminUserEditForm.username,
      securityQuestion: adminUserEditForm.securityQuestion,
      securityAnswer: adminUserEditForm.securityAnswer.trim() ? adminUserEditForm.securityAnswer.trim() : undefined,
    });

    if (!res.success) {
      setAdminUserEditError(res.error || 'Failed to update user.');
      return;
    }

    await updateUser({
      ...selectedUserToEdit,
      fullName: adminUserEditForm.fullName.trim(),
      email: adminUserEditForm.email.trim(),
      phone: adminUserEditForm.phone.trim(),
      username: adminUserEditForm.username.trim().toLowerCase(),
      role: adminUserEditForm.role,
      customPermissions: {
        ...(selectedUserToEdit.customPermissions || {}),
        fee_collection: {
          ...(selectedUserToEdit.customPermissions?.fee_collection || {
            view: true,
            create: true,
            edit: false,
            delete: false,
            export: true,
            approve: false,
          }),
          apply_discount: adminUserEditForm.applyDiscountPermission,
        },
      },
    });

    await refreshAllUsers();
    setSelectedUserToEdit(null);
  };

  // Handler: Admin Open Reset Password Modal
  const handleOpenAdminResetPassword = (user: User) => {
    setSelectedUserForPasswordReset(user);
    setAdminResetPassForm({ newPassword: '', confirmPassword: '' });
    setAdminResetPassError(null);
    setAdminResetPassSuccess(null);
  };

  // Handler: Admin Submit Password Reset
  const handleSubmitAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordReset) return;

    const resetPassVal = validatePasswordRules(adminResetPassForm.newPassword);
    if (!resetPassVal.isValid) {
      setAdminResetPassError(
        resetPassVal.errors[0] ||
          'Password must be at least 8 characters with uppercase, lowercase, number, and symbol.'
      );
      return;
    }
    if (adminResetPassForm.newPassword !== adminResetPassForm.confirmPassword) {
      setAdminResetPassError('Passwords do not match.');
      return;
    }

    const res = await adminResetPassword(
      selectedUserForPasswordReset.id,
      adminResetPassForm.newPassword
    );

    if (res.success) {
      setAdminResetPassSuccess(`Password for ${selectedUserForPasswordReset.fullName} has been reset.`);
      setTimeout(() => {
        setSelectedUserForPasswordReset(null);
      }, 1500);
      await refreshAllUsers();
    } else {
      setAdminResetPassError(res.error || 'Failed to reset user password.');
    }
  };

  // Handler: Generate random strong password satisfying all rules
  const handleGenerateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*';
    const all = upper + lower + digits + symbols;
    const picked = [
      upper.charAt(Math.floor(Math.random() * upper.length)),
      lower.charAt(Math.floor(Math.random() * lower.length)),
      digits.charAt(Math.floor(Math.random() * digits.length)),
      symbols.charAt(Math.floor(Math.random() * symbols.length)),
    ];
    for (let i = 0; i < 8; i++) {
      picked.push(all.charAt(Math.floor(Math.random() * all.length)));
    }
    const pass = picked.sort(() => Math.random() - 0.5).join('');
    setAdminResetPassForm({ newPassword: pass, confirmPassword: pass });
    setShowAdminResetPass(true);
  };

  // Handler: Admin Create New User
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);

    if (!newUserForm.username.trim() || !newUserForm.fullName.trim()) {
      setAddUserError('Username and full name are required.');
      return;
    }

    const cleanEmail = newUserForm.email.trim().toLowerCase();
    if (!isValidRealEmail(cleanEmail)) {
      setAddUserError('Please enter a valid real email address for account verification & password recovery.');
      return;
    }

    if (allUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
      setAddUserError(`Email "${cleanEmail}" is already registered to another user.`);
      return;
    }

    const newUserPassVal = validatePasswordRules(newUserForm.password);
    if (!newUserPassVal.isValid) {
      setAddUserError(
        newUserPassVal.errors[0] ||
          'Initial password must be at least 8 characters with uppercase, lowercase, number, and symbol.'
      );
      return;
    }

    const exists = allUsers.some(
      u => u.username.toLowerCase() === newUserForm.username.trim().toLowerCase()
    );
    if (exists) {
      setAddUserError(`Username "${newUserForm.username}" is already in use.`);
      return;
    }

    const createdUsername = newUserForm.username.trim().toLowerCase();
    const res = await createUser({
      username: createdUsername,
      fullName: newUserForm.fullName.trim(),
      email: cleanEmail,
      phone: newUserForm.phone.trim(),
      role: newUserForm.role,
      passwordHash: '',
      passwordPlain: newUserForm.password.trim(),
      securityQuestion: newUserForm.securityQuestion,
      securityAnswerHash: '',
      isActive: true,
      customPermissions: {
        fee_collection: {
          view: true,
          create: true,
          edit: false,
          delete: false,
          export: true,
          approve: false,
          apply_discount: newUserForm.applyDiscountPermission,
        },
      },
    });

    if (res.success) {
      await refreshAllUsers();
      setIsAddUserModalOpen(false);
      setNewUserForm({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'finance',
        password: '',
        securityQuestion: 'What is the official school mascot?',
        securityAnswer: 'eagle',
        applyDiscountPermission: true,
      });
      setAddUserError(null);
      notify({
        category: 'system',
        priority: 'normal',
        title: `Account Created: @${createdUsername}`,
        message: `Verification email sent to ${cleanEmail}.${
          res.recoveryKey ? ` Emergency Recovery Key: ${res.recoveryKey}` : ''
        }`,
      });
    } else {
      setAddUserError(res.error || 'Failed to create new user account.');
    }
  };

  // Handler: Toggle User Status
  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    await toggleUserStatus(user.id);
    await refreshAllUsers();
  };


  // Filtered users for admin view
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'inactive' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalAdminCount = allUsers.filter(u => u.role === 'admin').length;
  const totalFinanceCount = allUsers.filter(u => u.role === 'finance').length;
  const activeCount = allUsers.filter(u => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton
            onClick={() => setActiveTab('dashboard')}
            label="Back to Home"
            className="cursor-pointer"
          />
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-indigo-600" />
              <span>{activeSubTab === 'all-users' ? 'User Management & Roles' : 'Profile & Access Management'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeSubTab === 'all-users'
                ? 'Create users, assign role authorities, reset passwords and configure permissions.'
                : 'Manage your personal profile, credentials, security questions, and user privileges.'}
            </p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('my-profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubTab === 'my-profile'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => setActiveSubTab('all-users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSubTab === 'all-users'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>User Directory ({allUsers.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* SUBTAB 1: MY PROFILE & PERSONAL SECURITY */}
      {activeSubTab === 'my-profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Card & Role Permissions */}
          <div className="space-y-6">
            {/* User Hero Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600" />
              <div className="relative pt-6 flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 ring-4 ring-white dark:ring-slate-900 shadow-lg flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-400 overflow-hidden mb-3">
                    {profileForm.avatarUrl ? (
                      <img
                        src={profileForm.avatarUrl}
                        alt={currentUser?.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser?.fullName.charAt(0) || 'U'
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition transform hover:scale-110"
                    title="Upload profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentUser?.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">@{currentUser?.username}</p>

                <div className="mt-2.5 flex items-center gap-1.5">
                  {role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      <Shield className="w-3.5 h-3.5" />
                      <span>System Administrator</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Finance & Accounts Officer</span>
                    </span>
                  )}
                </div>

                <div className="w-full mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {currentUser?.email || 'Not configured'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {currentUser?.phone || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Member Since:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {currentUser?.createdAt ? formatDateDisplay(currentUser.createdAt.slice(0, 10)) : 'Today'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Last Login:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                      {currentUser?.lastLogin ? new Date(currentUser.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                    </span>
                  </div>
                </div>

                {/* Logout Current User Button */}
                <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition cursor-pointer"
                    title="Log Out of this session"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out Current Session</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Role Permissions Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Authorized Role Privileges</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                {role === 'admin' ? (
                  <>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Full administrative access to Students & Staff profiles</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Daily attendance recording & bulk roll call operations</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Financial Ledger, Fee Structures, Receipts & Payroll</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>User account management (create, edit, password reset)</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Fee Collection: Full authority to apply Concessions &amp; Discounts</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>School branding, system settings &amp; offline database backup</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Fee Collection entry, Concessions/Discounts &amp; Receipts</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Pending &amp; Due Fee tracking and Defaulters statements</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Expense tracking and monthly staff payroll records</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Financial reporting, P&L analytics, and ledger statements</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-500">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Academic student/staff profiles are restricted to View/Summary</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Edit Profile & Change Password */}
          <div className="lg:col-span-2 space-y-6">
            {profileMsg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            {/* Profile Information Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-600" />
                    <span>Basic Profile Information</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your official display name, contact email, and phone number.
                  </p>
                </div>
                {!isEditingBasicInfo && (
                  <button
                    onClick={() => setIsEditingBasicInfo(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveMyProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingBasicInfo}
                      value={profileForm.fullName}
                      onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      required
                      className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                        isEditingBasicInfo
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                      placeholder="e.g. Dr. Eleanor Vance"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingBasicInfo}
                      value={profileForm.username}
                      onChange={e =>
                        setProfileForm({ ...profileForm, username: e.target.value.toLowerCase().trim() })
                      }
                      required
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition ${
                        isEditingBasicInfo
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                      placeholder="e.g. admin"
                    />
                    {isEditingBasicInfo && (
                      <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1">
                        Note: Changing username will alter your login credentials.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled={!isEditingBasicInfo}
                      value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                        isEditingBasicInfo
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                      placeholder="admin@school.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingBasicInfo}
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                        isEditingBasicInfo
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      }`}
                      placeholder="+1 (555) 019-2834"
                    />
                  </div>
                </div>

                {/* Security Question Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 mb-2">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Account Recovery Security Question
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Used on the login screen if you forget your password to reset it without internet.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Security Question
                      </label>
                      <select
                        disabled={!isEditingBasicInfo}
                        value={profileForm.securityQuestion}
                        onChange={e =>
                          setProfileForm({ ...profileForm, securityQuestion: e.target.value })
                        }
                        className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                          isEditingBasicInfo
                            ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <option value="What is the official school mascot?">
                          What is the official school mascot?
                        </option>
                        <option value="What was the name of your first teacher?">
                          What was the name of your first teacher?
                        </option>
                        <option value="In what city was your school founded?">
                          In what city was your school founded?
                        </option>
                        <option value="What was the name of your childhood pet?">
                          What was the name of your childhood pet?
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Security Answer {isEditingBasicInfo && '(Leave blank to keep existing)'}
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingBasicInfo}
                        value={profileForm.securityAnswer}
                        onChange={e =>
                          setProfileForm({ ...profileForm, securityAnswer: e.target.value })
                        }
                        placeholder={isEditingBasicInfo ? 'Enter new secret answer' : '••••••••'}
                        className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                          isEditingBasicInfo
                            ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {isEditingBasicInfo && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBasicInfo(false);
                        if (currentUser) {
                          setProfileForm({
                            fullName: currentUser.fullName,
                            email: currentUser.email,
                            phone: currentUser.phone || '',
                            username: currentUser.username,
                            avatarUrl: currentUser.avatarUrl || '',
                            securityQuestion: currentUser.securityQuestion,
                            securityAnswer: '',
                          });
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Change Password Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Change Password</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Update your security password. Stored safely using client-side SHA-256 encryption.
                </p>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold mb-4 animate-in fade-in ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {passwordMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangeMyPassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={e =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      required
                      placeholder="Enter current password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password * (8+ chars, uppercase, lowercase, number, symbol)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                      placeholder="Enter strong password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={e =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isSubmittingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ALL USERS DIRECTORY & MANAGEMENT (ADMIN ONLY) */}
      {activeSubTab === 'all-users' && isAdmin && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Total User Accounts</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {allUsers.length}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Active Logins
              </span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {activeCount}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Administrators
              </span>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {totalAdminCount}
              </p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                Finance Officers
              </span>
              <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {totalFinanceCount}
              </p>
            </div>
          </div>

          {/* Search, Filter & Add Button Bar */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username, email or phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as 'all' | UserRole)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Roles & Authorities</option>
                <option value="admin">Administrators</option>
                <option value="super_admin">Super Admins</option>
                <option value="principal">Principals / Headmasters</option>
                <option value="finance">Finance Officers</option>
                <option value="accountant">Accountants</option>
                <option value="hr_manager">HR Managers</option>
                <option value="teacher">Teachers</option>
                <option value="receptionist">Receptionists</option>
                <option value="librarian">Librarians</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setAddUserError(null);
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add User Account</span>
            </button>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map(user => {
              const isSelf = user.id === currentUser?.id;
              return (
                <div
                  key={user.id}
                  className={`rounded-2xl border p-5 bg-white dark:bg-slate-900 shadow-xs transition flex flex-col justify-between ${
                    isSelf
                      ? 'border-indigo-300 dark:border-indigo-800/80 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Top Row: Avatar & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-200 dark:border-indigo-800 overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            user.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {user.fullName}
                            </h4>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">@{user.username}</p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    {/* Role & Contact Info */}
                    <div className="space-y-1.5 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Role / Authority:</span>
                        {user.role === 'admin' || user.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 text-[11px]">
                            <Shield className="w-3 h-3" /> {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        ) : user.role === 'principal' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 text-[11px]">
                            <ShieldCheck className="w-3 h-3" /> Principal
                          </span>
                        ) : user.role === 'hr_manager' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                            <Users className="w-3 h-3" /> HR Manager
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CreditCard className="w-3 h-3" /> {user.role === 'finance' ? 'Finance Officer' : user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Email:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-[170px]">
                          {user.email || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Phone:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                          {user.phone || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Last Login:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              }) +
                              ' ' +
                              new Date(user.lastLogin).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                    {/* Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenAdminEditUser(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition cursor-pointer"
                            title="Edit User Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenAdminResetPassword(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition cursor-pointer"
                            title="Reset User Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggle Active Status */}
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              user.isActive
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Explicit Login & Logout Controls for this user */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-50 dark:border-slate-800/50">
                        {isSelf ? (
                          <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition cursor-pointer"
                            title="Log Out of your current session"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Log Out Session</span>
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 py-1 px-1">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">Requires Password Login</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                              {user.role}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500">
              <UserIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold">No user accounts found matching your query.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADMIN EDIT OTHER USER DETAILS */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Profile Details</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">@{selectedUserToEdit.username}</p>
              </div>
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {adminUserEditError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{adminUserEditError}</span>
                </div>
              )}

              <form id="admin-user-edit-form" onSubmit={handleSaveAdminUserEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={adminUserEditForm.fullName}
                    onChange={e =>
                      setAdminUserEditForm({ ...adminUserEditForm, fullName: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={adminUserEditForm.username}
                    onChange={e =>
                      setAdminUserEditForm({ ...adminUserEditForm, username: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={adminUserEditForm.email}
                    onChange={e =>
                      setAdminUserEditForm({ ...adminUserEditForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={adminUserEditForm.phone}
                    onChange={e =>
                      setAdminUserEditForm({ ...adminUserEditForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Role *
                </label>
                <select
                  disabled={selectedUserToEdit.id === currentUser?.id}
                  value={adminUserEditForm.role}
                  onChange={e =>
                    setAdminUserEditForm({
                      ...adminUserEditForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="super_admin">Super Administrator (All Access)</option>
                  <option value="principal">Principal / Headmaster</option>
                  <option value="finance">Finance & Accounts Officer</option>
                  <option value="accountant">Accountant / Cashier</option>
                  <option value="hr_manager">HR / Payroll Manager</option>
                  <option value="teacher">Teacher / Faculty</option>
                  <option value="receptionist">Front Desk / Receptionist</option>
                  <option value="librarian">Librarian / Storekeeper</option>
                </select>
                {selectedUserToEdit.id === currentUser?.id && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    You cannot change your own role while logged in.
                  </p>
                )}
              </div>

              {/* Module Privilege: Apply Discount */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminUserEditForm.applyDiscountPermission}
                    onChange={e =>
                      setAdminUserEditForm({
                        ...adminUserEditForm,
                        applyDiscountPermission: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Fee Collection: Apply Discounts / Concessions
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                  Allows entering fee discount amounts, choosing discount reasons, and generating discounted official receipts.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Security Answer Override (Optional)
                </label>
                <input
                  type="text"
                  value={adminUserEditForm.securityAnswer}
                  onChange={e =>
                    setAdminUserEditForm({ ...adminUserEditForm, securityAnswer: e.target.value })
                  }
                  placeholder="Leave empty to keep existing answer"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedUserToEdit(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-user-edit-form"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              Save Profile Details
            </button>
          </div>
        </div>
      </div>
      )}

      {/* MODAL: ADMIN RESET USER PASSWORD */}
      {selectedUserForPasswordReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Reset User Password</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Setting new password for {selectedUserForPasswordReset.fullName} (@
                  {selectedUserForPasswordReset.username})
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForPasswordReset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {adminResetPassSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{adminResetPassSuccess}</span>
                </div>
              )}

              {adminResetPassError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{adminResetPassError}</span>
                </div>
              )}

              <form id="admin-reset-pass-form" onSubmit={handleSubmitAdminPasswordReset} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Password * (8+ chars, strong rules)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminResetPass ? 'text' : 'password'}
                      value={adminResetPassForm.newPassword}
                      onChange={e =>
                        setAdminResetPassForm({ ...adminResetPassForm, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                      placeholder="Enter new strong password"
                      className="w-full pl-3 pr-10 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminResetPass(!showAdminResetPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showAdminResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showAdminResetPass ? 'text' : 'password'}
                    value={adminResetPassForm.confirmPassword}
                    onChange={e =>
                      setAdminResetPassForm({
                        ...adminResetPassForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedUserForPasswordReset(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-reset-pass-form"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW USER ACCOUNT (ADMIN ONLY) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Create User Account</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Provision an Admin or Finance & Accounts staff account.
                </p>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{addUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username * (for login)
                  </label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={e =>
                      setNewUserForm({
                        ...newUserForm,
                        username: e.target.value.toLowerCase().trim(),
                      })
                    }
                    required
                    placeholder="e.g. finance2"
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newUserForm.fullName}
                    onChange={e => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    required
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email Address * (verification sent)
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="sarah@school.edu"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role / Authority *
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={e =>
                      setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="admin">Administrator (Full Access)</option>
                    <option value="super_admin">Super Administrator (All Access)</option>
                    <option value="principal">Principal / Headmaster</option>
                    <option value="finance">Finance & Accounts Officer</option>
                    <option value="accountant">Accountant / Cashier</option>
                    <option value="hr_manager">HR / Payroll Manager</option>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="receptionist">Front Desk / Receptionist</option>
                    <option value="librarian">Librarian / Storekeeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password * (8+ chars, strong rules)
                  </label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Upper, lower, digit, symbol"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Module Privilege: Apply Discount */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.applyDiscountPermission}
                    onChange={e =>
                      setNewUserForm({ ...newUserForm, applyDiscountPermission: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Fee Collection: Apply Discounts / Concessions
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                  Allows entering fee discount amounts, selecting discount reasons, and issuing concession vouchers.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Security Recovery Question
                </label>
                <select
                  value={newUserForm.securityQuestion}
                  onChange={e =>
                    setNewUserForm({ ...newUserForm, securityQuestion: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mb-2"
                >
                  <option value="What is the official school mascot?">
                    What is the official school mascot?
                  </option>
                  <option value="What was the name of your first teacher?">
                    What was the name of your first teacher?
                  </option>
                  <option value="In what city was your school founded?">
                    In what city was your school founded?
                  </option>
                </select>

                <input
                  type="text"
                  value={newUserForm.securityAnswer}
                  onChange={e =>
                    setNewUserForm({ ...newUserForm, securityAnswer: e.target.value })
                  }
                  placeholder="Security Answer (e.g. eagle)"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
