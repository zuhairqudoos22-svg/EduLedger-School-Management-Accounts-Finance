import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Staff, AttendanceStatus, PaymentMode } from '../../types';
import { formatDate, formatCurrency, exportToCSV, exportToExcel, getTodayDateString } from '../../utils/formatters';
import { formatStaffForExport } from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { BulkCommunicationModal } from '../common/BulkCommunicationModal';
import { BackButton } from '../common/BackButton';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  DollarSign,
  User,
  Upload,
  X,
  CalendarCheck,
  Building,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  MessageSquare,
  Eye,
  Mail,
  Phone,
  Printer,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { EmployeeLeaveBalanceModal } from '../hr/EmployeeLeaveBalanceModal';

export const StaffManagementView: React.FC = () => {
  const {
    staff,
    settings,
    addStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    bulkRecordStaffAttendance,
    bulkPayStaffSalaries,
    bulkUpdateStaffDepartment,
    selectedStaffIdForDetail,
    setSelectedStaffIdForDetail,
    staffAttendance,
    staffLeaves,
    setActiveTab,
  } = useSchool();

  const [leaveBalanceStaff, setLeaveBalanceStaff] = useState<Staff | null>(null);

  const detailStaff = React.useMemo(() => {
    if (!selectedStaffIdForDetail) return null;
    return staff.find(s => s.id === selectedStaffIdForDetail) || null;
  }, [selectedStaffIdForDetail, staff]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedRoleType, setSelectedRoleType] = useState('All');

  // Single form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClearStaffModalOpen, setIsClearStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Bulk selection states
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Bulk & Single Staff Communication Modal State
  const [isBulkCommModalOpen, setIsBulkCommModalOpen] = useState(false);
  const [commCandidateStaff, setCommCandidateStaff] = useState<Staff | null>(null);

  // Bulk Modals
  const [isBulkAttendanceModalOpen, setIsBulkAttendanceModalOpen] = useState(false);
  const [bulkAttendanceDate, setBulkAttendanceDate] = useState(getTodayDateString());
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<AttendanceStatus>('present');
  const [bulkLeaveType, setBulkLeaveType] = useState<'casual' | 'sick' | 'paid'>('casual');
  const [bulkAttendanceRemarks, setBulkAttendanceRemarks] = useState('');

  const [isBulkSalaryModalOpen, setIsBulkSalaryModalOpen] = useState(false);
  const [bulkSalaryMonth, setBulkSalaryMonth] = useState('September 2026');
  const [bulkSalaryPaymentMode, setBulkSalaryPaymentMode] = useState<PaymentMode>('Bank Transfer');

  const [isBulkDeptModalOpen, setIsBulkDeptModalOpen] = useState(false);
  const [targetBulkDept, setTargetBulkDept] = useState('Academics');

  // Single Form State
  const [formData, setFormData] = useState({
    employeeCode: '',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    designation: '',
    department: 'Academics',
    isTeaching: true,
    joiningDate: '2024-01-15',
    contactNumber: '',
    email: '',
    address: '',
    photoUrl: '',
    monthlySalary: 3200,
    allowances: 300,
    deductions: 150,
    bankAccount: '',
    status: 'active' as 'active' | 'resigned' | 'on_leave',
    leaveBalance: {
      casual: 8,
      sick: 10,
      paid: 15,
    },
  });

  const [formError, setFormError] = useState('');

  const departments = [
    'Academics',
    'Mathematics',
    'Humanities',
    'Science & Robotics',
    'Finance & Accounts',
    'Administration',
    'Operations',
    'Athletics',
  ];

  const filteredStaff = staff.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'All' || s.department === selectedDept;
    const matchesRoleType =
      selectedRoleType === 'All' ||
      (selectedRoleType === 'Teaching' ? s.isTeaching : !s.isTeaching);

    return matchesSearch && matchesDept && matchesRoleType;
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      employeeCode: `EMP-${String(staff.length + 101).padStart(3, '0')}`,
      fullName: '',
      gender: 'Male',
      designation: '',
      department: 'Academics',
      isTeaching: true,
      joiningDate: '2024-01-15',
      contactNumber: '',
      email: '',
      address: '',
      photoUrl: '',
      monthlySalary: 3500,
      allowances: 300,
      deductions: 200,
      bankAccount: '',
      status: 'active',
      leaveBalance: { casual: 8, sick: 10, paid: 15 },
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      employeeCode: member.employeeCode,
      fullName: member.fullName,
      gender: member.gender,
      designation: member.designation,
      department: member.department,
      isTeaching: member.isTeaching,
      joiningDate: member.joiningDate,
      contactNumber: member.contactNumber,
      email: member.email,
      address: member.address,
      photoUrl: member.photoUrl || '',
      monthlySalary: member.monthlySalary,
      allowances: member.allowances,
      deductions: member.deductions,
      bankAccount: member.bankAccount || '',
      status: member.status,
      leaveBalance: member.leaveBalance || { casual: 8, sick: 10, paid: 15 },
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setFormData(prev => ({ ...prev, photoUrl: (ev.target?.result as string) || '' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Staff name is required.');
      return;
    }
    if (!formData.designation.trim()) {
      setFormError('Designation title is required.');
      return;
    }
    if (formData.monthlySalary < 0) {
      setFormError('Monthly salary cannot be negative.');
      return;
    }

    if (editingStaff) {
      await updateStaff({
        ...editingStaff,
        ...formData,
      });
    } else {
      await addStaff(formData);
    }
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteCandidateId) {
      await deleteStaff(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  // Selection handlers
  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === filteredStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map(s => s.id));
    }
  };

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  // 1. Bulk Attendance
  const handleExecuteBulkAttendance = async () => {
    if (selectedStaffIds.length === 0) return;
    await bulkRecordStaffAttendance(
      selectedStaffIds,
      bulkAttendanceDate,
      bulkAttendanceStatus,
      bulkAttendanceStatus === 'leave' ? bulkLeaveType : undefined,
      bulkAttendanceRemarks || undefined
    );
    setIsBulkAttendanceModalOpen(false);
    showNotice(
      `Marked ${bulkAttendanceStatus.toUpperCase()} attendance for ${selectedStaffIds.length} staff members on ${formatDate(bulkAttendanceDate)}!`
    );
    setSelectedStaffIds([]);
  };

  // 2. Bulk Salary Disbursal
  const handleExecuteBulkSalary = async () => {
    if (selectedStaffIds.length === 0) return;
    const count = await bulkPayStaffSalaries(
      selectedStaffIds,
      bulkSalaryMonth,
      bulkSalaryPaymentMode
    );
    setIsBulkSalaryModalOpen(false);
    showNotice(
      `Disbursed compensation for ${count} staff members (${bulkSalaryMonth}) via ${bulkSalaryPaymentMode}! Recorded into accounts ledger.`
    );
    setSelectedStaffIds([]);
  };

  // 3. Bulk Department Reassignment
  const handleExecuteBulkDept = async () => {
    if (selectedStaffIds.length === 0) return;
    await bulkUpdateStaffDepartment(selectedStaffIds, targetBulkDept);
    setIsBulkDeptModalOpen(false);
    showNotice(
      `Reassigned ${selectedStaffIds.length} staff member(s) to ${targetBulkDept} department!`
    );
    setSelectedStaffIds([]);
  };

  // 4. Bulk Export (Selected & Filtered)
  const handleBulkExportCSV = () => {
    const selected = staff.filter(s => selectedStaffIds.includes(s.id));
    if (selected.length === 0) return;
    const rows = formatStaffForExport(selected);
    exportToCSV(`Selected_Staff_${selected.length}_batch`, rows);
    showNotice(`Exported ${selected.length} selected staff members to CSV.`);
  };

  const handleBulkExportExcel = () => {
    const selected = staff.filter(s => selectedStaffIds.includes(s.id));
    if (selected.length === 0) return;
    const rows = formatStaffForExport(selected);
    exportToExcel(`Selected_Staff_${selected.length}_batch`, 'Selected Staff', rows);
    showNotice(`Exported ${selected.length} selected staff members to Excel (.xlsx).`);
  };

  const handleExportFilteredCSV = () => {
    if (filteredStaff.length === 0) {
      showNotice('No staff records matching the current filter.');
      return;
    }
    const rows = formatStaffForExport(filteredStaff);
    exportToCSV(`Staff_Directory_${selectedDept}_${getTodayDateString()}`, rows);
    showNotice(`Exported ${filteredStaff.length} staff records to CSV.`);
  };

  const handleExportFilteredExcel = () => {
    if (filteredStaff.length === 0) {
      showNotice('No staff records matching the current filter.');
      return;
    }
    const rows = formatStaffForExport(filteredStaff);
    exportToExcel(`Staff_Directory_${selectedDept}`, `Staff ${selectedDept}`, rows);
    showNotice(`Exported ${filteredStaff.length} staff records to Excel (.xlsx).`);
  };

  // 5. Bulk Delete Execution
  const handleExecuteBulkDelete = async () => {
    if (selectedStaffIds.length === 0) return;
    const count = selectedStaffIds.length;
    const ok = await bulkDeleteStaff(selectedStaffIds);
    if (ok) {
      showNotice(`Successfully deleted ${count} staff record(s) from local database.`);
      setSelectedStaffIds([]);
    }
    setIsBulkDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {detailStaff ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Detail Top Header with BackButton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <BackButton
                onClick={() => setSelectedStaffIdForDetail(null)}
                label="Back to Staff Directory"
                variant="default"
                ariaLabel="Return to staff list"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {detailStaff.fullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {detailStaff.designation}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    detailStaff.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {detailStaff.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{detailStaff.employeeCode}</span> • Department: {detailStaff.department} • Joined: {formatDate(detailStaff.joiningDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setCommCandidateStaff(detailStaff);
                  setIsBulkCommModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Staff</span>
              </button>
              <button
                type="button"
                onClick={() => setLeaveBalanceStaff(detailStaff)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                title="Print or Save as PDF Leave Balance Statement"
              >
                <Printer className="w-4 h-4" />
                <span>Leave Statement (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Payroll &amp; Payslip</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(detailStaff)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          {(() => {
            const records = (staffAttendance || []).filter(a => a.staffId === detailStaff.id);
            const presentCount = records.filter(a => a.status === 'present').length;
            const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 100;
            const netSalary = detailStaff.monthlySalary + (detailStaff.allowances || 0) - (detailStaff.deductions || 0);

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Monthly Net Salary</p>
                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(netSalary, settings.currencySymbol)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Base: {formatCurrency(detailStaff.monthlySalary, settings.currencySymbol)}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Attendance Record</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {attendancePct}%
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{presentCount} of {records.length} logged shifts</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Leave Balances</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-xs font-bold" title="Casual Leave">
                          C: {detailStaff.leaveBalance?.casual ?? 8}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs font-bold" title="Sick Leave">
                          S: {detailStaff.leaveBalance?.sick ?? 10}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-xs font-bold" title="Paid Annual Leave">
                          P: {detailStaff.leaveBalance?.paid ?? 15}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveBalanceStaff(detailStaff)}
                      className="mt-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / Save PDF</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Faculty Category</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {detailStaff.isTeaching ? 'Teaching Faculty' : 'Administrative'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{detailStaff.department} Dept</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Employment Details */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>Employment &amp; Position Details</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Employee Code</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStaff.employeeCode}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Designation</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStaff.designation}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Department</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStaff.department}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Date of Joining</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(detailStaff.joiningDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Contact & Bank Details */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>Contact &amp; Banking Details</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Phone Number</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStaff.contactNumber}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Email Address</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStaff.email || 'None Provided'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Bank Account / IBAN</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{detailStaff.bankAccount || 'Direct Deposit / Cash'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Residential Address</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{detailStaff.address || 'Campus Staff Quarters'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Staff &amp; Faculty Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Maintain employee contracts, compensation structure, department distribution, and leave allowances
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportDropdown
            label="Export Staff"
            totalCount={filteredStaff.length}
            selectedCount={selectedStaffIds.length}
            onExportExcel={handleExportFilteredExcel}
            onExportCSV={handleExportFilteredCSV}
            onExportSelectedExcel={selectedStaffIds.length > 0 ? handleBulkExportExcel : undefined}
            onExportSelectedCSV={selectedStaffIds.length > 0 ? handleBulkExportCSV : undefined}
            size="md"
          />

                    {/* Clear Staff Button */}
          {staff.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearStaffModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-xs transition active:scale-95 cursor-pointer"
              title="Clear all staff records for new school setup"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Staff</span>
            </button>
          )}

          {/* Bulk Communications Button */}
          <button
            onClick={() => {
              setCommCandidateStaff(null);
              setIsBulkCommModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Dispatch bulk WhatsApp, SMS, or notices to staff members"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty / Staff</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar for Staff */}
      {selectedStaffIds.length > 0 && (
        <div className="sticky top-18 z-20 p-3.5 rounded-2xl bg-blue-900 text-white shadow-2xl border border-blue-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-blue-950 font-black text-xs">
              {selectedStaffIds.length}
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">
                {selectedStaffIds.length} Faculty Member{selectedStaffIds.length > 1 ? 's' : ''} Selected
              </p>
              <p className="text-[10px] text-blue-200">
                Execute collective attendance, payroll disbursal, or department updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Message / Communicate */}
            <button
              onClick={() => {
                setCommCandidateStaff(null);
                setIsBulkCommModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer"
              title="Dispatch WhatsApp, SMS, or Email notices to selected staff members"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Staff ({selectedStaffIds.length})</span>
            </button>

            {/* Bulk Staff Attendance */}
            <button
              onClick={() => setIsBulkAttendanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-950 hover:bg-blue-50 shadow-sm transition active:scale-95"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Bulk Attendance</span>
            </button>

            {/* Bulk Salary Disbursal */}
            <button
              onClick={() => setIsBulkSalaryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition active:scale-95"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Bulk Salary Disbursal</span>
            </button>

            {/* Bulk Department Assignment */}
            <button
              onClick={() => setIsBulkDeptModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-800 hover:bg-blue-700 text-white border border-blue-600 transition"
            >
              <Building className="w-3.5 h-3.5" />
              <span>Assign Dept</span>
            </button>

            {/* Bulk Export Excel */}
            <button
              onClick={handleBulkExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              title="Export selected faculty to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Bulk Export CSV */}
            <button
              onClick={handleBulkExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-800 hover:bg-blue-700 text-white border border-blue-600 transition cursor-pointer"
              title="Export selected faculty to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Delete */}
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Delete all selected faculty records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedStaffIds.length})</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedStaffIds([])}
              className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800 transition"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Banner Notice */}
      {bannerNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name, code, designation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium">Role:</span>
            <select
              value={selectedRoleType}
              onChange={e => setSelectedRoleType(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Staff</option>
              <option value="Teaching">Teaching Faculty</option>
              <option value="Non-Teaching">Non-Teaching Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredStaff.length > 0 &&
                      selectedStaffIds.length === filteredStaff.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                    title="Select All Faculty"
                  />
                </th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Designation &amp; Department</th>
                <th className="py-3 px-4">Role Type</th>
                <th className="py-3 px-4">Monthly Salary Structure</th>
                <th className="py-3 px-4">Leave Balances</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No staff records found matching the active filter.
                  </td>
                </tr>
              ) : (
                filteredStaff.map(member => {
                  const netSalary = member.monthlySalary + member.allowances - member.deductions;
                  const isSelected = selectedStaffIds.includes(member.id);

                  return (
                    <tr
                      key={member.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStaff(member.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.fullName}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              member.fullName.charAt(0)
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedStaffIdForDetail(member.id)}
                              className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition cursor-pointer"
                              title="View staff profile & details"
                            >
                              {member.fullName}
                            </button>
                            <p className="text-[11px] text-slate-500">{member.contactNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {member.employeeCode}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {member.designation}
                        </p>
                        <p className="text-slate-500 text-[11px]">{member.department}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.isTeaching
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {member.isTeaching ? 'Teaching Faculty' : 'Non-Teaching'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(netSalary, settings.currencySymbol)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Base: {formatCurrency(member.monthlySalary, settings.currencySymbol)} + Allow: $
                          {member.allowances}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono" title="Casual Leave">
                            C:{member.leaveBalance?.casual ?? 8}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-mono" title="Sick Leave">
                            S:{member.leaveBalance?.sick ?? 10}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-mono" title="Paid Annual Leave">
                            P:{member.leaveBalance?.paid ?? 15}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStaffIdForDetail(member.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="View Complete Staff Profile & Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLeaveBalanceStaff(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Print or Save as PDF Employee Leave Balance Statement"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCommCandidateStaff(member);
                              setIsBulkCommModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Message Staff Member via WhatsApp, SMS, or Email"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateId(member.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* MODAL 1: BULK STAFF ATTENDANCE */}
      {isBulkAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Staff Attendance Marking
                </h3>
              </div>
              <button
                onClick={() => setIsBulkAttendanceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">

            <p className="text-xs text-slate-500">
              Record daily attendance status for <strong>{selectedStaffIds.length}</strong> selected faculty &amp; staff members.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={bulkAttendanceDate}
                  onChange={e => setBulkAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status to Apply
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkAttendanceStatus('present')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                      bulkAttendanceStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Present</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAttendanceStatus('absent')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                      bulkAttendanceStatus === 'absent'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Absent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAttendanceStatus('leave')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                      bulkAttendanceStatus === 'leave'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Leave</span>
                  </button>
                </div>
              </div>

              {bulkAttendanceStatus === 'leave' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Leave Category
                  </label>
                  <select
                    value={bulkLeaveType}
                    onChange={e => setBulkLeaveType(e.target.value as 'casual' | 'sick' | 'paid')}
                    className="w-full px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick / Medical Leave</option>
                    <option value="paid">Paid Annual Leave</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Faculty development training or curriculum review"
                  value={bulkAttendanceRemarks}
                  onChange={e => setBulkAttendanceRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAttendance}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
              >
                Apply to {selectedStaffIds.length} Faculty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK SALARY DISBURSAL */}
      {isBulkSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Salary Disbursal
                </h3>
              </div>
              <button
                onClick={() => setIsBulkSalaryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                This will calculate net monthly compensation and log salary expense vouchers for <strong>{selectedStaffIds.length}</strong> selected personnel.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Salary Month
                  </label>
                  <select
                    value={bulkSalaryMonth}
                    onChange={e => setBulkSalaryMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="July 2026">July 2026</option>
                    <option value="August 2026">August 2026</option>
                    <option value="September 2026">September 2026</option>
                    <option value="October 2026">October 2026</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disbursal Payment Method
                  </label>
                  <select
                    value={bulkSalaryPaymentMode}
                    onChange={e => setBulkSalaryPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Bank Transfer">Bank Wire / ACH Direct Deposit</option>
                    <option value="Cheque">Payroll Bank Cheque</option>
                    <option value="Cash">Cash Counter Disbursal</option>
                    <option value="Online/UPI">Online Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkSalaryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkSalary}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
              >
                Authorize Disbursals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK DEPARTMENT ASSIGNMENT */}
      {isBulkDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assign Department for {selectedStaffIds.length} Staff
              </h3>
              <button
                onClick={() => setIsBulkDeptModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                Move or assign the selected staff members to a specified functional department.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Department
                </label>
                <select
                  value={targetBulkDept}
                  onChange={e => setTargetBulkDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setIsBulkDeptModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkDept}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                Assign Department
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Clear All Staff Confirmation Modal */}
      {isClearStaffModalOpen && (
        <DataResetConfirmationModal
          isOpen={isClearStaffModalOpen}
          targetModule="staff"
          onClose={() => setIsClearStaffModalOpen(false)}
        />
      )}

      {/* Add / Edit Staff Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{editingStaff ? 'Edit Faculty / Staff Profile' : 'Add New Faculty Member'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 border border-blue-200">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Photo
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Science Teacher"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Classification
                  </label>
                  <select
                    value={formData.isTeaching ? 'true' : 'false'}
                    onChange={e =>
                      setFormData({ ...formData, isTeaching: e.target.value === 'true' })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="true">Teaching Faculty</option>
                    <option value="false">Non-Teaching Administrative / Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Salary Structure Box */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                <p className="font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>Salary Structure (Monthly USD)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 mb-1">
                      Base Monthly Salary ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.monthlySalary}
                      onChange={e =>
                        setFormData({ ...formData, monthlySalary: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 mb-1">
                      Allowances ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.allowances}
                      onChange={e =>
                        setFormData({ ...formData, allowances: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 mb-1">
                      Tax &amp; Deductions ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.deductions}
                      onChange={e =>
                        setFormData({ ...formData, deductions: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Leave Balances */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">
                    Casual Leave (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveBalance.casual}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        leaveBalance: { ...formData.leaveBalance, casual: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">
                    Sick Leave (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveBalance.sick}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        leaveBalance: { ...formData.leaveBalance, sick: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">
                    Paid Leave (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leaveBalance.paid}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        leaveBalance: { ...formData.leaveBalance, paid: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition"
                >
                  {editingStaff ? 'Save Staff Profile' : 'Enroll Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteCandidateId}
        title="Delete Staff Member"
        message="Are you sure you want to remove this staff profile? Note that prior salary disbursement records and accounts ledger will stay recorded for auditing."
        confirmLabel="Delete Staff"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCandidateId(null)}
      />

      {/* Bulk Delete confirmation */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Selected Staff Records"
        message={`Are you sure you want to permanently delete ${selectedStaffIds.length} selected staff member(s) from the local IndexedDB database? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedStaffIds.length} Staff`}
        isDestructive={true}
        onConfirm={handleExecuteBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Bulk & Single Staff Communication Modal */}
      <BulkCommunicationModal
        isOpen={isBulkCommModalOpen}
        onClose={() => {
          setIsBulkCommModalOpen(false);
          setCommCandidateStaff(null);
        }}
        entityType="staff"
        selectedRecipients={
          commCandidateStaff
            ? [commCandidateStaff]
            : selectedStaffIds.length > 0
            ? staff.filter(s => selectedStaffIds.includes(s.id))
            : filteredStaff
        }
        allRecipients={staff}
        settings={settings}
      />

      {/* Individual Employee Leave Balance Statement Modal */}
      <EmployeeLeaveBalanceModal
        isOpen={!!leaveBalanceStaff}
        onClose={() => setLeaveBalanceStaff(null)}
        staff={leaveBalanceStaff}
        leaves={staffLeaves}
        settings={settings}
      />
    </div>
  );
};
