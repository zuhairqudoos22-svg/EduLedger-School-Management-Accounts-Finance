import React, { useState, useMemo, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  Staff,
  StaffLeaveRequest,
  LeaveType,
  LeaveStatus,
  AttendanceStatus,
  PaymentMode,
} from '../../types';
import {
  formatDate,
  formatCurrency,
  getTodayDateString,
  exportToCSV,
  exportToExcel,
} from '../../utils/formatters';
import { ExportDropdown } from '../common/ExportDropdown';
import { ConfirmModal } from '../common/ConfirmModal';
import { BulkCommunicationModal } from '../common/BulkCommunicationModal';
import { EmployeeLeaveBalanceModal } from './EmployeeLeaveBalanceModal';
import { generateHRLetterPdf } from '../../utils/hrLetterPdf';
import {
  Users,
  Briefcase,
  Calendar,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Download,
  FileText,
  FileCheck,
  ShieldCheck,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building,
  GraduationCap,
  Award,
  DollarSign,
  Printer,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Sparkles,
  UserCheck,
  AlertTriangle,
  Layers,
  HeartPulse,
  Sun,
  Shield,
  FileSpreadsheet,
  Stamp,
  BadgeCheck,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

export const HRManagementView: React.FC = () => {
  const {
    staff,
    staffLeaves,
    settings,
    addStaff,
    updateStaff,
    deleteStaff,
    applyStaffLeave,
    updateStaffLeaveStatus,
    deleteStaffLeave,
    updateStaffLeaveQuota,
    staffAttendance,
    setActiveTab,
    updateSettings,
  } = useSchool();

  const { isAdmin, currentUser } = useAuth();

  // Active Sub-tab in HR Management
  const [hrTab, setHrTab] = useState<
    'records' | 'leaves' | 'quotas' | 'calendar' | 'analytics' | 'letters'
  >('records');

  // --- STAFF RECORDS STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedFacultyType, setSelectedFacultyType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Staff Dossier Detail Modal
  const [selectedStaffForDossier, setSelectedStaffForDossier] = useState<Staff | null>(null);
  const [dossierTab, setDossierTab] = useState<
    'profile' | 'job' | 'qualification' | 'compensation' | 'documents' | 'leaves'
  >('profile');

  // Add / Edit Staff Modal
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffFormTab, setStaffFormTab] = useState<'basic' | 'job' | 'contact' | 'comp'>('basic');
  const [deleteCandidateStaff, setDeleteCandidateStaff] = useState<Staff | null>(null);

  // Initial Form Data Template
  const initialStaffFormData = {
    employeeCode: '',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '1990-05-15',
    bloodGroup: 'O+',
    nationalId: '',
    designation: '',
    department: 'Academics',
    isTeaching: true,
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'probation' | 'intern',
    joiningDate: getTodayDateString(),
    contractEndDate: '',
    contactNumber: '',
    email: '',
    address: '',
    emergencyContact: {
      name: '',
      relation: 'Spouse',
      phone: '',
    },
    qualification: '',
    experienceYears: 4,
    monthlySalary: 3200,
    allowances: 300,
    deductions: 150,
    bankName: 'Wells Fargo / Chase Bank',
    bankAccount: '',
    status: 'active' as 'active' | 'resigned' | 'on_leave',
    leaveBalance: {
      casual: 8,
      sick: 10,
      paid: 15,
      annual: 15,
      emergency: 3,
      unpaid: 0,
    },
    performanceRating: 5,
    performanceNotes: 'Dedicated faculty member exhibiting strong teamwork and discipline.',
  };

  const [staffFormData, setStaffFormData] = useState(initialStaffFormData);
  const [staffFormError, setStaffFormError] = useState('');

  // --- LEAVE MANAGEMENT STATE ---
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<string>('All');
  const [leaveFilterType, setLeaveFilterType] = useState<string>('All');
  const [leaveSearch, setLeaveSearch] = useState('');

  // Apply Leave Modal
  const [isApplyLeaveModalOpen, setIsApplyLeaveModalOpen] = useState(false);
  const [applyLeaveFormData, setApplyLeaveFormData] = useState({
    staffId: '',
    leaveType: 'casual' as LeaveType,
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    daysCount: 1,
    isHalfDay: false,
    halfDayPeriod: 'first_half' as 'first_half' | 'second_half',
    reason: '',
    emergencyContactPhone: '',
    attachmentName: '',
  });
  const [applyLeaveError, setApplyLeaveError] = useState('');

  // Leave Review (Approval/Rejection) Modal
  const [reviewCandidateLeave, setReviewCandidateLeave] = useState<StaffLeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [approverNameInput, setApproverNameInput] = useState(
    currentUser?.fullName || 'Dr. Arthur Sterling (Principal)'
  );

  // Quota Adjustment Modal
  const [quotaCandidateStaff, setQuotaCandidateStaff] = useState<Staff | null>(null);
  const [quotaAdjustFormData, setQuotaAdjustFormData] = useState({
    casual: 8,
    sick: 10,
    paid: 15,
    annual: 15,
    emergency: 3,
  });

  // Individual Employee Leave Balance Statement Modal
  const [leaveBalanceCandidateStaff, setLeaveBalanceCandidateStaff] = useState<Staff | null>(null);

  // Calendar Month State
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 9, 1)); // Default Oct 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>(getTodayDateString());

  // Letters Generator State
  const [letterStaffId, setLetterStaffId] = useState<string>(staff[0]?.id || '');
  const [letterType, setLetterType] = useState<
    'service_record' | 'appointment' | 'experience' | 'leave_sanction'
  >('service_record');

  // School Logo Upload in Letter & Services Records
  const letterLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleUploadLetterLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo image must be smaller than 2MB.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async event => {
        const base64Data = event.target?.result as string;
        if (base64Data) {
          const success = await updateSettings({
            ...settings,
            logoUrl: base64Data,
          });
          if (success) {
            showToast('School logo updated and applied to Letter & Service Records!');
          } else {
            showToast('Failed to save school logo.');
          }
        }
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        showToast('Error reading image file.');
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Failed to upload logo.');
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLetterLogo = async () => {
    try {
      const success = await updateSettings({
        ...settings,
        logoUrl: '',
      });
      if (success) {
        showToast('School logo removed. Default institutional crest active.');
      }
      if (letterLogoInputRef.current) {
        letterLogoInputRef.current.value = '';
      }
    } catch {
      showToast('Failed to remove logo.');
    }
  };

  // Bulk Communication Modal
  const [commCandidateStaff, setCommCandidateStaff] = useState<Staff | null>(null);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Departments List
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

  // --- STATS COMPUTATIONS ---
  const totalHeadcount = staff.length;
  const activeStaffCount = staff.filter(s => s.status === 'active').length;
  const teachingStaffCount = staff.filter(s => s.isTeaching).length;
  const nonTeachingStaffCount = totalHeadcount - teachingStaffCount;

  const todayStr = getTodayDateString();

  // Active leaves today
  const leavesToday = useMemo(() => {
    return staffLeaves.filter(
      l => l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr
    );
  }, [staffLeaves, todayStr]);

  // Pending leave requests
  const pendingLeaves = useMemo(() => {
    return staffLeaves.filter(l => l.status === 'pending');
  }, [staffLeaves]);

  // Total monthly payroll expenditure commitment
  const totalMonthlyPayroll = useMemo(() => {
    return staff.reduce(
      (sum, s) => sum + (s.monthlySalary + (s.allowances || 0) - (s.deductions || 0)),
      0
    );
  }, [staff]);

  // --- FILTERED STAFF RECORDS ---
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        member.fullName.toLowerCase().includes(q) ||
        member.employeeCode.toLowerCase().includes(q) ||
        member.designation.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.contactNumber.includes(q);

      const matchDept = selectedDept === 'All' || member.department === selectedDept;
      const matchFaculty =
        selectedFacultyType === 'All' ||
        (selectedFacultyType === 'Teaching' && member.isTeaching) ||
        (selectedFacultyType === 'Non-Teaching' && !member.isTeaching);
      const matchStatus = selectedStatus === 'All' || member.status === selectedStatus;

      return matchQuery && matchDept && matchFaculty && matchStatus;
    });
  }, [staff, searchQuery, selectedDept, selectedFacultyType, selectedStatus]);

  // --- FILTERED LEAVE REQUESTS ---
  const filteredLeaves = useMemo(() => {
    return staffLeaves.filter(req => {
      const q = leaveSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        req.staffName.toLowerCase().includes(q) ||
        req.employeeCode.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        req.department.toLowerCase().includes(q);

      const matchStatus = leaveFilterStatus === 'All' || req.status === leaveFilterStatus;
      const matchType = leaveFilterType === 'All' || req.leaveType === leaveFilterType;

      return matchQuery && matchStatus && matchType;
    });
  }, [staffLeaves, leaveSearch, leaveFilterStatus, leaveFilterType]);

  // Handle Open Add Staff
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      ...initialStaffFormData,
      employeeCode: `EMP-${100 + staff.length + 1}`,
      joiningDate: getTodayDateString(),
    });
    setStaffFormTab('basic');
    setStaffFormError('');
    setIsStaffFormOpen(true);
  };

  // Handle Open Edit Staff
  const handleOpenEditStaff = (member: Staff) => {
    setEditingStaff(member);
    setStaffFormData({
      employeeCode: member.employeeCode,
      fullName: member.fullName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth || '1990-05-15',
      bloodGroup: member.bloodGroup || 'O+',
      nationalId: member.nationalId || '',
      designation: member.designation,
      department: member.department,
      isTeaching: member.isTeaching,
      employmentType: member.employmentType || 'full_time',
      joiningDate: member.joiningDate,
      contractEndDate: member.contractEndDate || '',
      contactNumber: member.contactNumber,
      email: member.email,
      address: member.address,
      emergencyContact: member.emergencyContact || {
        name: '',
        relation: 'Spouse',
        phone: '',
      },
      qualification: member.qualification || '',
      experienceYears: member.experienceYears || 5,
      monthlySalary: member.monthlySalary,
      allowances: member.allowances || 0,
      deductions: member.deductions || 0,
      bankName: member.bankName || 'Standard Chartered / Wells Fargo',
      bankAccount: member.bankAccount || '',
      status: member.status,
      leaveBalance: {
        casual: member.leaveBalance?.casual ?? 8,
        sick: member.leaveBalance?.sick ?? 10,
        paid: member.leaveBalance?.paid ?? 15,
        annual: member.leaveBalance?.annual ?? 15,
        emergency: member.leaveBalance?.emergency ?? 3,
        unpaid: member.leaveBalance?.unpaid ?? 0,
      },
      performanceRating: member.performanceRating || 5,
      performanceNotes: member.performanceNotes || '',
    });
    setStaffFormTab('basic');
    setStaffFormError('');
    setIsStaffFormOpen(true);
  };

  // Save Staff (Add or Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.fullName.trim()) {
      setStaffFormError('Staff full legal name is required.');
      return;
    }
    if (!staffFormData.employeeCode.trim()) {
      setStaffFormError('Employee code is required.');
      return;
    }
    if (!staffFormData.designation.trim()) {
      setStaffFormError('Designation is required.');
      return;
    }
    if (!staffFormData.contactNumber.trim()) {
      setStaffFormError('Contact phone number is required.');
      return;
    }

    try {
      if (editingStaff) {
        await updateStaff({
          ...editingStaff,
          ...staffFormData,
        });
        showToast(`Staff dossier for ${staffFormData.fullName} updated successfully.`);
      } else {
        await addStaff({
          ...staffFormData,
        });
        showToast(`New employee ${staffFormData.fullName} onboarded successfully.`);
      }
      setIsStaffFormOpen(false);
      setEditingStaff(null);
    } catch (err) {
      setStaffFormError('Failed to save staff record. Please review inputs.');
    }
  };

  // Handle Delete Staff
  const handleConfirmDeleteStaff = async () => {
    if (!deleteCandidateStaff) return;
    try {
      await deleteStaff(deleteCandidateStaff.id);
      showToast(`Employee record for ${deleteCandidateStaff.fullName} archived/removed.`);
      setDeleteCandidateStaff(null);
      if (selectedStaffForDossier?.id === deleteCandidateStaff.id) {
        setSelectedStaffForDossier(null);
      }
    } catch (err) {
      showToast('Error removing employee.');
    }
  };

  // --- APPLY LEAVE LOGIC ---
  const handleOpenApplyLeave = (preSelectedStaffId?: string) => {
    const defaultStaff =
      (preSelectedStaffId && staff.find(s => s.id === preSelectedStaffId)) || staff[0];
    setApplyLeaveFormData({
      staffId: defaultStaff ? defaultStaff.id : '',
      leaveType: 'casual',
      startDate: getTodayDateString(),
      endDate: getTodayDateString(),
      daysCount: 1,
      isHalfDay: false,
      halfDayPeriod: 'first_half',
      reason: '',
      emergencyContactPhone: defaultStaff?.contactNumber || '',
      attachmentName: '',
    });
    setApplyLeaveError('');
    setIsApplyLeaveModalOpen(true);
  };

  // Calculate days difference
  const handleDateChange = (start: string, end: string, isHalf: boolean) => {
    if (isHalf) {
      setApplyLeaveFormData(prev => ({
        ...prev,
        startDate: start,
        endDate: start,
        daysCount: 0.5,
      }));
      return;
    }

    const d1 = new Date(start);
    const d2 = new Date(end);
    let diffDays = 1;
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffTime = d2.getTime() - d1.getTime();
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      diffDays = Math.max(1, days);
    }

    setApplyLeaveFormData(prev => ({
      ...prev,
      startDate: start,
      endDate: end < start ? start : end,
      daysCount: diffDays,
    }));
  };

  const handleSubmitLeaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyLeaveFormData.staffId) {
      setApplyLeaveError('Please select a staff member.');
      return;
    }
    if (!applyLeaveFormData.reason.trim()) {
      setApplyLeaveError('Please provide a reason or justification for the leave request.');
      return;
    }

    const applicant = staff.find(s => s.id === applyLeaveFormData.staffId);
    if (!applicant) {
      setApplyLeaveError('Selected staff member not found.');
      return;
    }

    try {
      await applyStaffLeave({
        staffId: applicant.id,
        staffName: applicant.fullName,
        employeeCode: applicant.employeeCode,
        department: applicant.department,
        designation: applicant.designation,
        leaveType: applyLeaveFormData.leaveType,
        startDate: applyLeaveFormData.startDate,
        endDate: applyLeaveFormData.endDate,
        daysCount: applyLeaveFormData.daysCount,
        isHalfDay: applyLeaveFormData.isHalfDay,
        halfDayPeriod: applyLeaveFormData.isHalfDay ? applyLeaveFormData.halfDayPeriod : undefined,
        reason: applyLeaveFormData.reason.trim(),
        emergencyContactPhone: applyLeaveFormData.emergencyContactPhone || applicant.contactNumber,
        attachmentName: applyLeaveFormData.attachmentName || undefined,
      });

      showToast(`Leave application submitted for ${applicant.fullName} (${applyLeaveFormData.daysCount} days).`);
      setIsApplyLeaveModalOpen(false);
    } catch (err) {
      setApplyLeaveError('Failed to submit leave application.');
    }
  };

  // Submit Review (Approve / Reject)
  const handleSubmitReview = async () => {
    if (!reviewCandidateLeave) return;
    if (reviewAction === 'rejected' && !rejectionReasonInput.trim()) {
      alert('Please state a reason for rejecting the leave application.');
      return;
    }

    try {
      await updateStaffLeaveStatus(
        reviewCandidateLeave.id,
        reviewAction,
        approverNameInput.trim() || 'Principal / HR Administrator',
        reviewAction === 'rejected' ? rejectionReasonInput.trim() : undefined
      );

      showToast(
        `Leave application for ${reviewCandidateLeave.staffName} was ${
          reviewAction === 'approved' ? 'APPROVED' : 'REJECTED'
        }.`
      );
      setReviewCandidateLeave(null);
      setRejectionReasonInput('');
    } catch (err) {
      alert('Failed to update leave status.');
    }
  };

  // Save Adjusted Quota
  const handleSaveAdjustedQuota = async () => {
    if (!quotaCandidateStaff) return;
    try {
      await updateStaffLeaveQuota(quotaCandidateStaff.id, {
        casual: quotaAdjustFormData.casual,
        sick: quotaAdjustFormData.sick,
        paid: quotaAdjustFormData.paid,
        annual: quotaAdjustFormData.annual,
        emergency: quotaAdjustFormData.emergency,
      });
      showToast(`Leave quota updated for ${quotaCandidateStaff.fullName}.`);
      setQuotaCandidateStaff(null);
    } catch (err) {
      alert('Failed to update quota.');
    }
  };

  // --- CALENDAR HELPERS ---
  const currentMonthYearLabel = calendarDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [calendarDate]);

  // Leaves active on selected calendar day
  const leavesOnSelectedDay = useMemo(() => {
    return staffLeaves.filter(
      l =>
        l.status === 'approved' &&
        l.startDate <= selectedCalendarDay &&
        l.endDate >= selectedCalendarDay
    );
  }, [staffLeaves, selectedCalendarDay]);

  // Export Staff Directory
  const handleExportStaff = (format: 'csv' | 'excel') => {
    const rows = filteredStaff.map(s => ({
      'Employee Code': s.employeeCode,
      'Full Name': s.fullName,
      Gender: s.gender,
      Designation: s.designation,
      Department: s.department,
      'Faculty Type': s.isTeaching ? 'Teaching' : 'Non-Teaching',
      'Employment Type': s.employmentType || 'Full-Time',
      'Joining Date': s.joiningDate,
      Contact: s.contactNumber,
      Email: s.email,
      'Base Salary': s.monthlySalary,
      Allowances: s.allowances || 0,
      Deductions: s.deductions || 0,
      'Net Pay': s.monthlySalary + (s.allowances || 0) - (s.deductions || 0),
      'Bank Account': s.bankAccount || '',
      Status: s.status,
      'Casual Leave Rem': s.leaveBalance?.casual ?? 8,
      'Sick Leave Rem': s.leaveBalance?.sick ?? 10,
      'Annual Leave Rem': s.leaveBalance?.annual ?? 15,
    }));

    const filename = `Staff_HR_Directory_${getTodayDateString()}`;
    if (format === 'csv') exportToCSV(filename, rows);
    else exportToExcel(filename, 'Staff Directory', rows);
  };

  // Export Leaves Log
  const handleExportLeaves = (format: 'csv' | 'excel') => {
    const rows = filteredLeaves.map(l => ({
      'Application ID': l.id,
      'Employee Code': l.employeeCode,
      'Staff Name': l.staffName,
      Department: l.department,
      Designation: l.designation,
      'Leave Type': l.leaveType.toUpperCase(),
      'Start Date': l.startDate,
      'End Date': l.endDate,
      'Duration (Days)': l.daysCount,
      'Half Day': l.isHalfDay ? 'Yes' : 'No',
      Status: l.status.toUpperCase(),
      Reason: l.reason,
      'Applied On': l.appliedDate,
      'Approved / Reviewed By': l.approvedBy || '',
      'Decision Date': l.actionDate || '',
      'Rejection Reason': l.rejectionReason || '',
    }));

    const filename = `Staff_Leave_Applications_${getTodayDateString()}`;
    if (format === 'csv') exportToCSV(filename, rows);
    else exportToExcel(filename, 'Leave Applications', rows);
  };

  // Download Official Letter / Certificate as PDF
  const handleDownloadLetterPdf = () => {
    const member = staff.find(s => s.id === letterStaffId) || staff[0];
    if (!member) {
      showToast('No staff member selected.');
      return;
    }

    try {
      generateHRLetterPdf(settings, member, letterType as any, {
        signatoryName: 'Dr. Arthur Sterling, Ph.D.',
        signatoryTitle: 'Principal & Director of Administration',
      });

      const letterNames: Record<string, string> = {
        service_record: 'Service Record & Dossier',
        appointment: 'Appointment Letter',
        experience: 'Experience Certificate',
        leave_sanction: 'Leave Sanction Order',
      };
      showToast(`Downloaded official ${letterNames[letterType] || 'document'} PDF for ${member.fullName}.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to generate letter PDF.');
    }
  };

  // Print Official Letter / Certificate
  const handlePrintDocument = () => {
    window.print();
  };

  // Tab definitions for HR Management navigation
  const hrTabsList = useMemo(
    () => [
      {
        id: 'records' as const,
        label: 'Staff Records & Directory',
        icon: Users,
        badge: (
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-current ms-1.5">
            {totalHeadcount}
          </span>
        ),
      },
      {
        id: 'leaves' as const,
        label: 'Leave Requests & Approvals',
        icon: Calendar,
        badge:
          pendingLeaves.length > 0 ? (
            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse ms-1.5">
              {pendingLeaves.length}
            </span>
          ) : null,
      },
      {
        id: 'quotas' as const,
        label: 'Leave Quotas & Balances',
        icon: BadgeCheck,
        badge: null,
      },
      {
        id: 'calendar' as const,
        label: 'Leave Calendar & Roster',
        icon: CalendarCheck,
        badge: null,
      },
      {
        id: 'analytics' as const,
        label: 'Workforce Analytics',
        icon: FileSpreadsheet,
        badge: null,
      },
      {
        id: 'letters' as const,
        label: 'Letters & Service Records',
        icon: Stamp,
        badge: null,
      },
    ],
    [totalHeadcount, pendingLeaves.length]
  );

  // Tab button references for keyboard accessibility
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation handler for WAI-ARIA tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (index + 1) % hrTabsList.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (index - 1 + hrTabsList.length) % hrTabsList.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = hrTabsList.length - 1;
    }

    if (targetIndex !== -1) {
      const target = hrTabsList[targetIndex];
      setHrTab(target.id);
      tabButtonRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & System Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Briefcase className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                Human Resources & Faculty Administration
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
              HR Management System (HRMS)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Maintain institutional staff records, faculty dossiers, leave quota tracking, attendance sync, and official appointment & service letters.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => handleOpenApplyLeave()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95 ring-1 ring-amber-300/50"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>Apply Leave</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAddStaff}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition cursor-pointer active:scale-95 ring-1 ring-purple-400/40"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Onboard Staff</span>
              </button>
            )}
          </div>
        </div>

        {/* HR Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Total Staff</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{totalHeadcount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {teachingStaffCount} Teaching • {nonTeachingStaffCount} Non-Teaching
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Active Staff</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {activeStaffCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              100% On-Campus Compliance
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">On Leave Today</span>
              <CalendarCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {leavesToday.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {leavesToday.length === 0 ? 'Full Attendance' : `${leavesToday.map(l => l.staffName).join(', ')}`}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold">Pending Requests</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 flex items-center gap-2">
              <span>{pendingLeaves.length}</span>
              {pendingLeaves.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full font-bold border border-rose-500/30">
                  Needs Review
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Monthly Payroll: {formatCurrency(totalMonthlyPayroll, settings.currencySymbol)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="hrms-tabs-container pb-1 border-b border-slate-200 dark:border-slate-800">
        <div
          role="tablist"
          aria-label="HR Management Sections"
          className="hrms-tabs-grid"
        >
          {hrTabsList.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = hrTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={el => {
                  tabButtonRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                id={`hr-tab-${tab.id}`}
                aria-controls={`hr-tabpanel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setHrTab(tab.id)}
                onKeyDown={e => handleTabKeyDown(e, idx)}
                title={tab.label}
                className={`w-full min-w-0 h-11 sm:h-12 min-h-[44px] max-h-[48px] px-2 sm:px-2.5 py-1.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="min-w-0 text-center leading-[1.2] text-xs font-bold line-clamp-2 break-words">
                  {tab.label}
                </span>
                {tab.badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: STAFF RECORDS & DIRECTORY                                      */}
      {/* ========================================================================= */}
      {hrTab === 'records' && (
        <div id="hr-tabpanel-records" role="tabpanel" aria-labelledby="hr-tab-records" className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, code, designation..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Department Dropdown */}
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Faculty Type */}
              <select
                value={selectedFacultyType}
                onChange={e => setSelectedFacultyType(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Teaching">Teaching Faculty</option>
                <option value="Non-Teaching">Non-Teaching Staff</option>
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>

            {/* View Mode & Export */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Table
                </button>
              </div>

              <ExportDropdown
                onExportCSV={() => handleExportStaff('csv')}
                onExportExcel={() => handleExportStaff('excel')}
              />
            </div>
          </div>

          {/* Results Count */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1 flex items-center justify-between">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{filteredStaff.length}</strong> of{' '}
              {totalHeadcount} employees
            </span>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map(member => {
                const netSalary =
                  member.monthlySalary + (member.allowances || 0) - (member.deductions || 0);
                const hasPendingLeave = pendingLeaves.some(p => p.staffId === member.id);

                return (
                  <div
                    key={member.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header in Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                            {member.fullName
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                              {member.fullName}
                            </h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              {member.designation}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {member.employeeCode} • {member.department}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              member.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : member.status === 'on_leave'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {member.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {hasPendingLeave && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-500 text-white rounded-md font-bold animate-pulse">
                              Pending Leave
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info Highlights */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Role Type</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {member.isTeaching ? 'Teaching Faculty' : 'Non-Teaching'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Joined Date</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatDate(member.joiningDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Contact</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                            {member.contactNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Net Compensation</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(netSalary, settings.currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {/* Leave Balances Mini Bar */}
                      <div className="mt-3.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-[11px] flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Leave Balances:</span>
                        <div className="flex items-center gap-2 font-mono font-bold">
                          <span className="text-indigo-600 dark:text-indigo-400" title="Casual Leave">
                            C:{member.leaveBalance?.casual ?? 8}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400" title="Sick Leave">
                            S:{member.leaveBalance?.sick ?? 10}
                          </span>
                          <span className="text-amber-600 dark:text-amber-400" title="Annual/Paid Leave">
                            A:{member.leaveBalance?.annual ?? 15}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedStaffForDossier(member);
                          setDossierTab('profile');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Dossier</span>
                      </button>

                      <button
                        onClick={() => handleOpenApplyLeave(member.id)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Apply leave for this employee"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setLeaveBalanceCandidateStaff(member)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Take print or save as PDF leave balance statement"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditStaff(member)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                            title="Edit employee record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateStaff(member)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                            title="Archive / Remove staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Compensation</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Leave Rem.</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredStaff.map(member => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {member.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {member.employeeCode}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium">{member.designation}</td>
                        <td className="py-3 px-3">{member.department}</td>
                        <td className="py-3 px-3 font-mono">{member.contactNumber}</td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(member.monthlySalary, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              member.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          C:{member.leaveBalance?.casual ?? 8} | S:{member.leaveBalance?.sick ?? 10} | A:{member.leaveBalance?.annual ?? 15}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedStaffForDossier(member);
                                setDossierTab('profile');
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100"
                            >
                              Dossier
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenEditStaff(member)}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: LEAVE REQUESTS & APPROVALS                                     */}
      {/* ========================================================================= */}
      {hrTab === 'leaves' && (
        <div id="hr-tabpanel-leaves" role="tabpanel" aria-labelledby="hr-tab-leaves" className="space-y-4">
          {/* Top Filter and Actions */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={leaveSearch}
                  onChange={e => setLeaveSearch(e.target.value)}
                  placeholder="Search by staff name, reason..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={leaveFilterStatus}
                onChange={e => setLeaveFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Leave Type */}
              <select
                value={leaveFilterType}
                onChange={e => setLeaveFilterType(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Leave Types</option>
                <option value="casual">Casual Leave (CL)</option>
                <option value="sick">Sick / Medical Leave (SL)</option>
                <option value="annual">Annual / Vacation Leave (AL)</option>
                <option value="emergency">Emergency Leave</option>
                <option value="unpaid">Leave Without Pay (LWP)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => handleOpenApplyLeave()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Apply Leave</span>
              </button>

              <ExportDropdown
                onExportCSV={() => handleExportLeaves('csv')}
                onExportExcel={() => handleExportLeaves('excel')}
              />
            </div>
          </div>

          {/* Pending Alert Callout if any */}
          {pendingLeaves.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {pendingLeaves.length} Leave Application(s) Awaiting Decision
                </span>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  Review submitted applications below to approve or decline with feedback. Approved leaves will automatically adjust quota balances.
                </p>
              </div>
            </div>
          )}

          {/* Leave Requests Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-3">Leave Type</th>
                    <th className="py-3 px-3">Date Span</th>
                    <th className="py-3 px-3 text-center">Days</th>
                    <th className="py-3 px-3">Reason / Notes</th>
                    <th className="py-3 px-3">Applied On</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Decision / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No leave applications match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map(leave => (
                      <tr
                        key={leave.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          leave.status === 'pending'
                            ? 'bg-amber-50/40 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {leave.staffName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {leave.employeeCode} • {leave.department}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {leave.isHalfDay ? '0.5' : leave.daysCount}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <p className="truncate text-slate-800 dark:text-slate-200" title={leave.reason}>
                            {leave.reason}
                          </p>
                          {leave.attachmentName && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1 mt-0.5">
                              <FileText className="w-3 h-3" />
                              {leave.attachmentName}
                            </span>
                          )}
                          {leave.rejectionReason && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium">
                              Note: {leave.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {formatDate(leave.appliedDate)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              leave.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : leave.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {leave.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {leave.status === 'pending' && isAdmin ? (
                              <button
                                onClick={() => {
                                  setReviewCandidateLeave(leave);
                                  setReviewAction('approved');
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Review
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {leave.approvedBy ? `Reviewed by ${leave.approvedBy}` : 'Completed'}
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => deleteStaffLeave(leave.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Delete application"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: LEAVE QUOTAS & BALANCES                                        */}
      {/* ========================================================================= */}
      {hrTab === 'quotas' && (
        <div id="hr-tabpanel-quotas" role="tabpanel" aria-labelledby="hr-tab-quotas" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty Leave Quotas & Allocation Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitor used versus remaining leave entitlements per employee across Casual, Sick, and Annual categories.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Academic Year 2026-2027
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => {
              const casualRem = member.leaveBalance?.casual ?? 8;
              const sickRem = member.leaveBalance?.sick ?? 10;
              const annualRem = member.leaveBalance?.annual ?? 15;
              const emergencyRem = member.leaveBalance?.emergency ?? 3;
              const totalRemaining = casualRem + sickRem + annualRem + emergencyRem;

              return (
                <div
                  key={member.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {member.employeeCode} • {member.department}
                      </p>
                    </div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl">
                      {totalRemaining} Days Left
                    </span>
                  </div>

                  {/* Quota Bars */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Casual Leave (CL)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{casualRem} / 12 Days</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (casualRem / 12) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Sick / Medical (SL)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{sickRem} / 12 Days</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (sickRem / 12) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Annual Vacation (AL)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{annualRem} / 20 Days</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (annualRem / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quota Action */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveBalanceCandidateStaff(member)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition"
                      title="Take print or save as PDF leave balance statement"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Print / PDF Statement</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setQuotaCandidateStaff(member);
                          setQuotaAdjustFormData({
                            casual: member.leaveBalance?.casual ?? 8,
                            sick: member.leaveBalance?.sick ?? 10,
                            paid: member.leaveBalance?.paid ?? 15,
                            annual: member.leaveBalance?.annual ?? 15,
                            emergency: member.leaveBalance?.emergency ?? 3,
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Adjust Quota
                      </button>
                      <button
                        onClick={() => handleOpenApplyLeave(member.id)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                      >
                        + Book
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: LEAVE CALENDAR & DAILY ROSTER                                  */}
      {/* ========================================================================= */}
      {hrTab === 'calendar' && (
        <div id="hr-tabpanel-calendar" role="tabpanel" aria-labelledby="hr-tab-calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Monthly Grid */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>{currentMonthYearLabel}</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date(2026, 9, 1))}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800"
                  >
                    Current
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarDays.map((dateStr, idx) => {
                  if (!dateStr) {
                    return <div key={`empty-${idx}`} className="h-20 bg-slate-50/40 dark:bg-slate-950/20 rounded-xl" />;
                  }

                  const dayNum = parseInt(dateStr.split('-')[2], 10);
                  const isSelected = selectedCalendarDay === dateStr;
                  const isToday = dateStr === todayStr;

                  // Find leaves on this day
                  const dayLeaves = staffLeaves.filter(
                    l => l.status === 'approved' && l.startDate <= dateStr && l.endDate >= dateStr
                  );

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedCalendarDay(dateStr)}
                      className={`h-20 p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {dayLeaves.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>

                      <div className="overflow-hidden space-y-0.5">
                        {dayLeaves.slice(0, 2).map(l => (
                          <div
                            key={l.id}
                            className="text-[9px] truncate px-1 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 font-semibold"
                            title={`${l.staffName} (${l.leaveType})`}
                          >
                            {l.staffName.split(' ')[0]} ({l.leaveType[0].toUpperCase()})
                          </div>
                        ))}
                        {dayLeaves.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-bold px-1">
                            +{dayLeaves.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Roster for Selected Day */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400">
                  Daily Absence Roster
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatDate(selectedCalendarDay)}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {leavesOnSelectedDay.length} staff member(s) scheduled on approved leave.
                </p>
              </div>

              <div className="flex-1 mt-4 space-y-3 overflow-y-auto max-h-[380px] pr-1">
                {leavesOnSelectedDay.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Full Staff Availability
                    </p>
                    <p className="text-[11px] mt-0.5">
                      No approved absences recorded for this date.
                    </p>
                  </div>
                ) : (
                  leavesOnSelectedDay.map(leave => (
                    <div
                      key={leave.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {leave.staffName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {leave.department} • {leave.designation}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 uppercase">
                          {leave.leaveType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        "{leave.reason}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>Span: {leave.startDate} to {leave.endDate}</span>
                        <span>Emergency: {leave.emergencyContactPhone || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: WORKFORCE ANALYTICS                                            */}
      {/* ========================================================================= */}
      {hrTab === 'analytics' && (
        <div id="hr-tabpanel-analytics" role="tabpanel" aria-labelledby="hr-tab-analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Department Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Headcount by Department
              </h3>
              <div className="space-y-3">
                {departments.map(dept => {
                  const count = staff.filter(s => s.department === dept).length;
                  const pct = totalHeadcount > 0 ? (count / totalHeadcount) * 100 : 0;
                  return (
                    <div key={dept} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {dept}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Faculty & Diversity Split */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Workforce Demographics
              </h3>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-400">
                    <span>Teaching Faculty vs Support</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {teachingStaffCount} : {nonTeachingStaffCount}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full"
                      style={{
                        width: `${(teachingStaffCount / (totalHeadcount || 1)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-emerald-500 h-full"
                      style={{
                        width: `${(nonTeachingStaffCount / (totalHeadcount || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-400">
                    <span>Gender Diversity Ratio</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {staff.filter(s => s.gender === 'Female').length}F :{' '}
                      {staff.filter(s => s.gender === 'Male').length}M
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                    <div
                      className="bg-rose-500 h-full"
                      style={{
                        width: `${
                          (staff.filter(s => s.gender === 'Female').length / (totalHeadcount || 1)) *
                          100
                        }%`,
                      }}
                    />
                    <div
                      className="bg-sky-500 h-full"
                      style={{
                        width: `${
                          (staff.filter(s => s.gender === 'Male').length / (totalHeadcount || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Monthly Payroll Liability
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {formatCurrency(totalMonthlyPayroll, settings.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Average Salary: {formatCurrency(totalMonthlyPayroll / (totalHeadcount || 1), settings.currencySymbol)}
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Utilization Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
                Leave Utilization Breakdown
              </h3>
              <div className="space-y-3 text-xs">
                {['casual', 'sick', 'annual', 'emergency'].map(ltype => {
                  const leavesOfType = staffLeaves.filter(
                    l => l.leaveType === ltype && l.status === 'approved'
                  );
                  const totalDaysTaken = leavesOfType.reduce((acc, l) => acc + l.daysCount, 0);

                  return (
                    <div
                      key={ltype}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="capitalize font-bold text-slate-800 dark:text-slate-200">
                          {ltype} Leave
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {leavesOfType.length} Approved Requests
                        </p>
                      </div>
                      <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {totalDaysTaken} Days
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: LETTERS & OFFICIAL SERVICE RECORDS                             */}
      {/* ========================================================================= */}
      {hrTab === 'letters' && (
        <div id="hr-tabpanel-letters" role="tabpanel" aria-labelledby="hr-tab-letters" className="space-y-6">
          {/* Controls Bar (Non-Printable) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Select Staff Member
                </label>
                <select
                  value={letterStaffId}
                  onChange={e => setLetterStaffId(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.employeeCode} - {s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Document Type
                </label>
                <select
                  value={letterType}
                  onChange={e => setLetterType(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="service_record">Official Service Dossier / Record</option>
                  <option value="appointment">Faculty Appointment Letter</option>
                  <option value="experience">Experience & Character Certificate</option>
                  <option value="leave_sanction">Leave Sanction Order</option>
                </select>
              </div>

              {/* Upload School Logo in Letter & Services Records */}
              <div className="pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  School Logo (Letterhead)
                </label>
                <input
                  ref={letterLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleUploadLetterLogo}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  {settings.logoUrl ? (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={settings.logoUrl}
                          alt="School Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => letterLogoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title="Upload a new school logo"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLetterLogo}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                        title="Remove custom logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => letterLogoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{isUploadingLogo ? 'Uploading...' : 'Upload School Logo'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadLetterPdf}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
                title="Download official document as PDF for audit and employee records"
              >
                <Download className="w-4 h-4" />
                <span>Download as PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDocument}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer active:scale-95"
                title="Open browser print dialogue / Save as PDF"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          {/* Printable Letter Sheet */}
          {(() => {
            const member = staff.find(s => s.id === letterStaffId) || staff[0];
            if (!member) return null;

            return (
              <div
                id="printable-hr-letter"
                className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-300 max-w-4xl mx-auto min-h-[850px] relative font-serif"
              >
                {/* Official School Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-5 mb-8">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    {settings.logoUrl ? (
                      <div className="relative group/logo">
                        <img
                          src={settings.logoUrl}
                          alt={settings.schoolName || 'School Logo'}
                          className="w-16 h-16 object-contain rounded-xl shrink-0 p-1 bg-white border border-slate-300 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => letterLogoInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/logo:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition no-print cursor-pointer"
                          title="Click to replace school logo"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => letterLogoInputRef.current?.click()}
                        className="w-14 h-14 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black text-xl shrink-0 shadow-xs cursor-pointer hover:bg-indigo-900 transition relative group/emptyLogo"
                        title="Click to upload school logo for letterhead"
                      >
                        <span>
                          {settings.schoolName
                            ? settings.schoolName
                                .split(' ')
                                .map(w => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : 'SA'}
                        </span>
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-indigo-600 text-white shadow-xs no-print">
                          <Upload className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                    <div className="text-left sm:text-center">
                      <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
                        {settings.schoolName || 'St. Augustine International Academy'}
                      </h1>
                      <p className="text-xs text-slate-600 italic">
                        {settings.schoolTagline || 'Excellence in Education & Character Building'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans">
                    {settings.schoolAddress || '742 Evergreen Boulevard, Springfield, IL 62704'} • Phone: {settings.schoolPhone || '+1 (555) 234-5678'} • Email: {settings.schoolEmail || 'admin@staugustine.edu'}
                  </p>
                </div>

                {/* Document Metadata Strip */}
                <div className="flex justify-between text-xs font-sans mb-8">
                  <div>
                    <span className="text-slate-400">REF NO: </span>
                    <span className="font-bold font-mono">
                      HR-{member.employeeCode}-{letterType.toUpperCase().slice(0, 4)}-2026
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">DATE: </span>
                    <span className="font-bold">{formatDate(getTodayDateString())}</span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                  <h2 className="text-lg font-black uppercase tracking-wider underline decoration-2 underline-offset-4">
                    {letterType === 'service_record' && 'OFFICIAL EMPLOYEE SERVICE RECORD & DOSSIER'}
                    {letterType === 'appointment' && 'FORMAL LETTER OF FACULTY APPOINTMENT'}
                    {letterType === 'experience' && 'EXPERIENCE & SERVICE RECOGNITION CERTIFICATE'}
                    {letterType === 'leave_sanction' && 'FORMAL LEAVE SANCTION ORDER'}
                  </h2>
                </div>

                {/* Content according to type */}
                {letterType === 'service_record' && (
                  <div className="space-y-6 text-sm leading-relaxed font-sans">
                    <p>
                      This is an official institutional transcript of service certified by the Board of Directors of {settings.schoolName || 'St. Augustine International Academy'}.
                    </p>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs text-slate-500 block">Full Name:</span>
                        <strong className="text-sm">{member.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Employee Code:</span>
                        <strong className="text-sm font-mono">{member.employeeCode}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Designation:</span>
                        <strong>{member.designation}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Department:</span>
                        <strong>{member.department}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Date of Joining:</span>
                        <strong>{formatDate(member.joiningDate)}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Employment Status:</span>
                        <strong className="uppercase">{member.status}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Academic Qualification:</span>
                        <strong>{member.qualification || 'Master of Science / Arts'}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Compensation Package:</span>
                        <strong>{formatCurrency(member.monthlySalary, settings.currencySymbol)} per month</strong>
                      </div>
                    </div>

                    <p>
                      During the tenure of employment, the employee's professional conduct and pedagogical leadership have been evaluated as <strong>Exemplary and in full alignment with academic bylaws</strong>.
                    </p>
                  </div>
                )}

                {letterType === 'appointment' && (
                  <div className="space-y-6 text-sm leading-relaxed font-sans">
                    <p>
                      Dear <strong>{member.fullName}</strong>,
                    </p>
                    <p>
                      We are pleased to formally confirm your appointment at {settings.schoolName || 'St. Augustine International Academy'} in the role of <strong>{member.designation}</strong> within the <strong>{member.department}</strong> Department, effective from <strong>{formatDate(member.joiningDate)}</strong>.
                    </p>
                    <p>
                      Your compensation package consists of a monthly base remuneration of <strong>{formatCurrency(member.monthlySalary, settings.currencySymbol)}</strong> plus institutional allowances, subject to statutory regulations.
                    </p>
                    <p>
                      You shall be entitled to annual paid leaves, medical leave benefits, and academic development funds as governed by the Faculty Handbook.
                    </p>
                  </div>
                )}

                {letterType === 'experience' && (
                  <div className="space-y-6 text-sm leading-relaxed font-sans">
                    <p>
                      TO WHOM IT MAY CONCERN:
                    </p>
                    <p>
                      This is to certify that <strong>{member.fullName}</strong> (Employee Code: <code>{member.employeeCode}</code>) has been an integral member of the faculty at {settings.schoolName || 'St. Augustine International Academy'} serving as <strong>{member.designation}</strong> from <strong>{formatDate(member.joiningDate)}</strong> to present date.
                    </p>
                    <p>
                      Throughout their service, {member.fullName} has discharged duties with commendable diligence, pedagogical competence, and moral integrity. We wish them distinction in all future endeavors.
                    </p>
                  </div>
                )}

                {letterType === 'leave_sanction' && (
                  <div className="space-y-6 text-sm leading-relaxed font-sans">
                    <p>
                      OFFICE SANCTION ORDER:
                    </p>
                    <p>
                      Sanction is hereby accorded for grant of formal leave to <strong>{member.fullName}</strong>, <strong>{member.designation}</strong>, Department of <strong>{member.department}</strong>.
                    </p>
                    <p>
                      The leave entitlement is debited against the employee's official leave credit balance. Substitute academic coverage arrangements have been reviewed and approved by the department chairperson.
                    </p>
                  </div>
                )}

                {/* Signatories & Official Seal */}
                <div className="mt-20 pt-8 border-t border-slate-300 flex items-end justify-between font-sans">
                  <div>
                    <div className="w-24 h-24 border-2 border-indigo-900 rounded-full flex flex-col items-center justify-center text-center p-1 opacity-80 rotate-[-12deg] relative overflow-hidden">
                      {settings.logoUrl && (
                        <img
                          src={settings.logoUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain p-2 opacity-15 grayscale pointer-events-none"
                        />
                      )}
                      <span className="text-[7px] font-black uppercase text-indigo-900 relative z-10 leading-tight">
                        {settings.schoolName || 'St. Augustine Academy'}
                      </span>
                      <span className="text-[9px] font-black text-rose-800 tracking-wider relative z-10">
                        OFFICIAL SEAL
                      </span>
                      <span className="text-[7px] text-indigo-900 font-bold relative z-10">REGISTRAR</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="w-48 border-b border-slate-900 mb-1 ml-auto" />
                    <p className="font-bold text-xs text-slate-900">Dr. Arthur Sterling, Ph.D.</p>
                    <p className="text-[11px] text-slate-500">Principal & Director of Administration</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FULL HR DOSSIER DETAIL MODAL                                     */}
      {/* ========================================================================= */}
      {selectedStaffForDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-md">
                  {selectedStaffForDossier.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {selectedStaffForDossier.fullName}
                  </h2>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {selectedStaffForDossier.designation} • {selectedStaffForDossier.department}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedStaffForDossier.employeeCode} • Joined: {formatDate(selectedStaffForDossier.joiningDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEditStaff(selectedStaffForDossier);
                    setSelectedStaffForDossier(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>
                <button
                  onClick={() => setSelectedStaffForDossier(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-2 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto text-xs font-bold">
              {[
                { id: 'profile', label: 'Personal & Identity' },
                { id: 'job', label: 'Employment & Contract' },
                { id: 'qualification', label: 'Qualifications' },
                { id: 'compensation', label: 'Salary & Banking' },
                { id: 'documents', label: 'Verified Documents' },
                { id: 'leaves', label: 'Leave History' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDossierTab(tab.id as any)}
                  className={`py-3 px-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                    dossierTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {dossierTab === 'profile' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Identity & Demographics
                    </h4>
                    <div>
                      <span className="text-slate-400 block">Date of Birth:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedStaffForDossier.dateOfBirth
                          ? formatDate(selectedStaffForDossier.dateOfBirth)
                          : 'Not Provided'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Gender:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedStaffForDossier.gender}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Blood Group:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {selectedStaffForDossier.bloodGroup || 'O+'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">National CNIC / ID:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {selectedStaffForDossier.nationalId || 'NAT-VERIFIED-REG'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Contact & Emergency Records
                    </h4>
                    <div>
                      <span className="text-slate-400 block">Contact Phone:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {selectedStaffForDossier.contactNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Official Email:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedStaffForDossier.email}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Residential Address:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedStaffForDossier.address}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Emergency Contact:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedStaffForDossier.emergencyContact
                          ? `${selectedStaffForDossier.emergencyContact.name} (${selectedStaffForDossier.emergencyContact.relation}) - ${selectedStaffForDossier.emergencyContact.phone}`
                          : 'Campus Security & Administration Quarters'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {dossierTab === 'job' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block">Department</span>
                      <strong className="text-slate-900 dark:text-white">{selectedStaffForDossier.department}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block">Faculty Type</span>
                      <strong className="text-slate-900 dark:text-white">
                        {selectedStaffForDossier.isTeaching ? 'Teaching Faculty' : 'Administrative Support'}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block">Employment Status</span>
                      <strong className="uppercase text-emerald-600 dark:text-emerald-400">
                        {selectedStaffForDossier.status}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Performance Evaluation & Appraisal
                    </span>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Award
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (selectedStaffForDossier.performanceRating || 5)
                              ? 'fill-current'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic">
                      "{selectedStaffForDossier.performanceNotes || 'Consistently demonstrates strong professional commitment and student mentorship.'}"
                    </p>
                  </div>
                </div>
              )}

              {dossierTab === 'qualification' && (
                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-8 h-8 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedStaffForDossier.qualification || 'Master of Science (M.Sc.) & Post-Graduate Diploma'}
                      </h4>
                      <p className="text-slate-500">
                        Total Industry / Academic Experience: <strong>{selectedStaffForDossier.experienceYears || 6} Years</strong>
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Degrees and credentials certified and cross-verified against state board accreditation directories upon appointment.
                  </p>
                </div>
              )}

              {dossierTab === 'compensation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Salary Structure</span>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span>Base Salary:</span>
                      <strong>{formatCurrency(selectedStaffForDossier.monthlySalary, settings.currencySymbol)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-emerald-600">
                      <span>Allowances:</span>
                      <strong>+{formatCurrency(selectedStaffForDossier.allowances || 0, settings.currencySymbol)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-rose-600">
                      <span>Deductions:</span>
                      <strong>-{formatCurrency(selectedStaffForDossier.deductions || 0, settings.currencySymbol)}</strong>
                    </div>
                    <div className="flex justify-between pt-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span>Net Pay:</span>
                      <span>
                        {formatCurrency(
                          selectedStaffForDossier.monthlySalary +
                            (selectedStaffForDossier.allowances || 0) -
                            (selectedStaffForDossier.deductions || 0),
                          settings.currencySymbol
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Disbursement Banking</span>
                    <div>
                      <span className="text-slate-400 block">Bank Entity:</span>
                      <strong>{selectedStaffForDossier.bankName || 'Wells Fargo Educational Accounts'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account Number / IBAN:</span>
                      <strong className="font-mono">{selectedStaffForDossier.bankAccount || 'Direct Deposit / Payroll Card'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {dossierTab === 'documents' && (
                <div className="space-y-3">
                  {(selectedStaffForDossier.documents && selectedStaffForDossier.documents.length > 0
                    ? selectedStaffForDossier.documents
                    : [
                        { id: '1', name: 'National Identity CNIC / Passport', type: 'cnic_id', uploadDate: '2021-08-10', verified: true },
                        { id: '2', name: 'Academic Degree & Official Transcripts', type: 'degree', uploadDate: '2021-08-10', verified: true },
                        { id: '3', name: 'Faculty Employment Contract', type: 'contract', uploadDate: '2021-08-15', verified: true },
                        { id: '4', name: 'Police Background Verification Clearance', type: 'police_clearance', uploadDate: '2021-08-12', verified: true },
                      ]
                  ).map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-5 h-5 text-indigo-600" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{doc.name}</div>
                          <div className="text-[11px] text-slate-400">Uploaded: {doc.uploadDate}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {dossierTab === 'leaves' && (
                <div className="space-y-3">
                  {staffLeaves
                    .filter(l => l.staffId === selectedStaffForDossier.id)
                    .map(leave => (
                      <div
                        key={leave.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                            {leave.leaveType} Leave ({leave.daysCount} Days)
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              leave.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : leave.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 italic">"{leave.reason}"</p>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Dates: {leave.startDate} to {leave.endDate} • Approved by: {leave.approvedBy || 'Pending'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setLetterStaffId(selectedStaffForDossier.id);
                  setHrTab('letters');
                  setSelectedStaffForDossier(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Generate Official Service Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT STAFF ONBOARDING FORM                                 */}
      {/* ========================================================================= */}
      {isStaffFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStaff ? `Edit Staff Dossier: ${editingStaff.fullName}` : 'Onboard New Faculty / Staff Member'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete official employment record, designations, compensation, and leave allocations.
                </p>
              </div>
              <button
                onClick={() => setIsStaffFormOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {staffFormError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffFormError}</span>
              </div>
            )}

            {/* Sub-form tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
              {[
                { id: 'basic', label: '1. Personal & Identity' },
                { id: 'job', label: '2. Job & Department' },
                { id: 'contact', label: '3. Contact & Address' },
                { id: 'comp', label: '4. Salary & Quotas' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setStaffFormTab(t.id as any)}
                  className={`py-2 px-3 rounded-t-xl transition cursor-pointer ${
                    staffFormTab === t.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveStaff} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {staffFormTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={staffFormData.fullName}
                        onChange={e => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                        placeholder="e.g. Dr. Robert Harrison"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Employee Code / ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={staffFormData.employeeCode}
                        onChange={e => setStaffFormData({ ...staffFormData, employeeCode: e.target.value })}
                        placeholder="e.g. EMP-109"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Gender</label>
                      <select
                        value={staffFormData.gender}
                        onChange={e => setStaffFormData({ ...staffFormData, gender: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={staffFormData.dateOfBirth}
                        onChange={e => setStaffFormData({ ...staffFormData, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Blood Group</label>
                      <select
                        value={staffFormData.bloodGroup}
                        onChange={e => setStaffFormData({ ...staffFormData, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      National ID / CNIC / SSN Number
                    </label>
                    <input
                      type="text"
                      value={staffFormData.nationalId}
                      onChange={e => setStaffFormData({ ...staffFormData, nationalId: e.target.value })}
                      placeholder="e.g. NAT-9204-10294"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {staffFormTab === 'job' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={staffFormData.designation}
                        onChange={e => setStaffFormData({ ...staffFormData, designation: e.target.value })}
                        placeholder="e.g. Senior Faculty / Chemistry Lab Incharge"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Department</label>
                      <select
                        value={staffFormData.department}
                        onChange={e => setStaffFormData({ ...staffFormData, department: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                      >
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Role Classification</label>
                      <select
                        value={staffFormData.isTeaching ? 'true' : 'false'}
                        onChange={e => setStaffFormData({ ...staffFormData, isTeaching: e.target.value === 'true' })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                      >
                        <option value="true">Teaching Faculty</option>
                        <option value="false">Non-Teaching Staff</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Employment Type</label>
                      <select
                        value={staffFormData.employmentType}
                        onChange={e => setStaffFormData({ ...staffFormData, employmentType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                      >
                        <option value="full_time">Full-Time Permanent</option>
                        <option value="part_time">Part-Time</option>
                        <option value="contract">Fixed Contract</option>
                        <option value="probation">Probationary Period</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={staffFormData.joiningDate}
                        onChange={e => setStaffFormData({ ...staffFormData, joiningDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Academic Qualification / Degree
                      </label>
                      <input
                        type="text"
                        value={staffFormData.qualification}
                        onChange={e => setStaffFormData({ ...staffFormData, qualification: e.target.value })}
                        placeholder="e.g. M.Sc. Mathematics, B.Ed."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={staffFormData.experienceYears}
                        onChange={e => setStaffFormData({ ...staffFormData, experienceYears: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {staffFormTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Contact Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={staffFormData.contactNumber}
                        onChange={e => setStaffFormData({ ...staffFormData, contactNumber: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Work / Contact Email
                      </label>
                      <input
                        type="email"
                        value={staffFormData.email}
                        onChange={e => setStaffFormData({ ...staffFormData, email: e.target.value })}
                        placeholder="faculty@staugustine.edu"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Residential Postal Address
                    </label>
                    <textarea
                      rows={2}
                      value={staffFormData.address}
                      onChange={e => setStaffFormData({ ...staffFormData, address: e.target.value })}
                      placeholder="Street, Apartment, City, State"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Emergency Contact Information
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Contact Person Name</label>
                        <input
                          type="text"
                          value={staffFormData.emergencyContact.name}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              emergencyContact: { ...staffFormData.emergencyContact, name: e.target.value },
                            })
                          }
                          placeholder="e.g. Eleanor Harrison"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Relation</label>
                        <input
                          type="text"
                          value={staffFormData.emergencyContact.relation}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              emergencyContact: { ...staffFormData.emergencyContact, relation: e.target.value },
                            })
                          }
                          placeholder="Spouse / Parent / Sibling"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Emergency Phone</label>
                        <input
                          type="tel"
                          value={staffFormData.emergencyContact.phone}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              emergencyContact: { ...staffFormData.emergencyContact, phone: e.target.value },
                            })
                          }
                          placeholder="+1 (555) 999-9999"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {staffFormTab === 'comp' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Monthly Base Salary ({settings.currencySymbol || '$'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={staffFormData.monthlySalary}
                        onChange={e => setStaffFormData({ ...staffFormData, monthlySalary: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Monthly Allowances
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={staffFormData.allowances}
                        onChange={e => setStaffFormData({ ...staffFormData, allowances: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-emerald-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Statutory Deductions
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={staffFormData.deductions}
                        onChange={e => setStaffFormData({ ...staffFormData, deductions: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-rose-600 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Bank Entity Name
                      </label>
                      <input
                        type="text"
                        value={staffFormData.bankName}
                        onChange={e => setStaffFormData({ ...staffFormData, bankName: e.target.value })}
                        placeholder="e.g. Chase Bank, Springfield"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Bank Account Number / IBAN
                      </label>
                      <input
                        type="text"
                        value={staffFormData.bankAccount}
                        onChange={e => setStaffFormData({ ...staffFormData, bankAccount: e.target.value })}
                        placeholder="US00-0000-000000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Initial Annual Leave Quota */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Annual Leave Entitlement Days
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Casual Leave (CL)</label>
                        <input
                          type="number"
                          min="0"
                          value={staffFormData.leaveBalance.casual}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              leaveBalance: { ...staffFormData.leaveBalance, casual: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Sick Leave (SL)</label>
                        <input
                          type="number"
                          min="0"
                          value={staffFormData.leaveBalance.sick}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              leaveBalance: { ...staffFormData.leaveBalance, sick: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Annual Paid (AL)</label>
                        <input
                          type="number"
                          min="0"
                          value={staffFormData.leaveBalance.annual}
                          onChange={e =>
                            setStaffFormData({
                              ...staffFormData,
                              leaveBalance: { ...staffFormData.leaveBalance, annual: Number(e.target.value) },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStaffFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  {editingStaff ? 'Save Changes' : 'Confirm Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: APPLY FOR LEAVE MODAL                                            */}
      {/* ========================================================================= */}
      {isApplyLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit Staff Leave Application
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record faculty or administrative staff leave requests.
                </p>
              </div>
              <button
                onClick={() => setIsApplyLeaveModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyLeaveError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900">
                {applyLeaveError}
              </div>
            )}

            <form onSubmit={handleSubmitLeaveApplication} className="p-6 space-y-4 text-xs">
              {/* Select Staff */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Employee / Faculty Member *
                </label>
                <select
                  required
                  value={applyLeaveFormData.staffId}
                  onChange={e => {
                    const found = staff.find(s => s.id === e.target.value);
                    setApplyLeaveFormData({
                      ...applyLeaveFormData,
                      staffId: e.target.value,
                      emergencyContactPhone: found?.contactNumber || '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.employeeCode} - {s.department})
                    </option>
                  ))}
                </select>

                {/* Remaining Quota indicator */}
                {(() => {
                  const applicant = staff.find(s => s.id === applyLeaveFormData.staffId);
                  if (!applicant) return null;
                  return (
                    <div className="mt-1.5 text-[11px] text-slate-500 font-mono">
                      Current Quotas: C:{applicant.leaveBalance?.casual ?? 8} | S:{applicant.leaveBalance?.sick ?? 10} | A:{applicant.leaveBalance?.annual ?? 15}
                    </div>
                  );
                })()}
              </div>

              {/* Leave Type */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Leave Category *
                </label>
                <select
                  value={applyLeaveFormData.leaveType}
                  onChange={e =>
                    setApplyLeaveFormData({
                      ...applyLeaveFormData,
                      leaveType: e.target.value as LeaveType,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="casual">Casual Leave (CL)</option>
                  <option value="sick">Sick / Medical Leave (SL)</option>
                  <option value="annual">Annual / Scheduled Vacation (AL)</option>
                  <option value="emergency">Emergency / Compassionate Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="unpaid">Leave Without Pay (LWP)</option>
                </select>
              </div>

              {/* Half-day toggle */}
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <input
                  type="checkbox"
                  id="halfDayCheckbox"
                  checked={applyLeaveFormData.isHalfDay}
                  onChange={e => {
                    const isHalf = e.target.checked;
                    setApplyLeaveFormData(prev => ({
                      ...prev,
                      isHalfDay: isHalf,
                    }));
                    handleDateChange(applyLeaveFormData.startDate, applyLeaveFormData.endDate, isHalf);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="halfDayCheckbox" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                  Half-Day Leave (0.5 Day)
                </label>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={applyLeaveFormData.startDate}
                    onChange={e =>
                      handleDateChange(e.target.value, applyLeaveFormData.endDate, applyLeaveFormData.isHalfDay)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    disabled={applyLeaveFormData.isHalfDay}
                    value={applyLeaveFormData.endDate}
                    onChange={e =>
                      handleDateChange(applyLeaveFormData.startDate, e.target.value, applyLeaveFormData.isHalfDay)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-hidden disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Total Duration Banner */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <span>Calculated Absence Duration:</span>
                <strong className="text-sm font-mono">{applyLeaveFormData.daysCount} Day(s)</strong>
              </div>

              {/* Reason */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason & Purpose *
                </label>
                <textarea
                  required
                  rows={3}
                  value={applyLeaveFormData.reason}
                  onChange={e =>
                    setApplyLeaveFormData({ ...applyLeaveFormData, reason: e.target.value })
                  }
                  placeholder="Provide detailed justification for administration review..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={applyLeaveFormData.emergencyContactPhone}
                    onChange={e =>
                      setApplyLeaveFormData({ ...applyLeaveFormData, emergencyContactPhone: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Attachment / Medical Doc
                  </label>
                  <input
                    type="text"
                    value={applyLeaveFormData.attachmentName}
                    onChange={e =>
                      setApplyLeaveFormData({ ...applyLeaveFormData, attachmentName: e.target.value })
                    }
                    placeholder="e.g. medical_certificate.pdf"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyLeaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REVIEW LEAVE APPLICATION (APPROVE / REJECT)                      */}
      {/* ========================================================================= */}
      {reviewCandidateLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  Administrative Review
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Review Leave: {reviewCandidateLeave.staffName}
                </h3>
              </div>
              <button
                onClick={() => setReviewCandidateLeave(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <strong className="text-slate-800 dark:text-slate-200">{reviewCandidateLeave.department}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Type:</span>
                <strong className="uppercase">{reviewCandidateLeave.leaveType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Span:</span>
                <strong className="font-mono">{reviewCandidateLeave.startDate} to {reviewCandidateLeave.endDate}</strong>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Duration:</span>
                <span className="text-indigo-600 dark:text-indigo-400">{reviewCandidateLeave.daysCount} Day(s)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 block mb-0.5">Reason:</span>
                <p className="italic text-slate-800 dark:text-slate-200">"{reviewCandidateLeave.reason}"</p>
              </div>
            </div>

            {/* Decision Selector */}
            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Administrative Decision
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('approved')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    reviewAction === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Leave</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('rejected')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                    reviewAction === 'rejected'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Reject Leave</span>
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Approving Officer / Authority
                </label>
                <input
                  type="text"
                  value={approverNameInput}
                  onChange={e => setApproverNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              {reviewAction === 'rejected' && (
                <div>
                  <label className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
                    Rejection Feedback / Justification *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rejectionReasonInput}
                    onChange={e => setRejectionReasonInput(e.target.value)}
                    placeholder="State administrative reason for declining..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-xl focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setReviewCandidateLeave(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewAction === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADJUST LEAVE QUOTA MODAL                                         */}
      {/* ========================================================================= */}
      {quotaCandidateStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Adjust Quota: {quotaCandidateStaff.fullName}
                </h3>
                <p className="text-slate-500 text-[11px]">
                  ID: {quotaCandidateStaff.employeeCode} • {quotaCandidateStaff.department}
                </p>
              </div>
              <button
                onClick={() => setQuotaCandidateStaff(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Casual Leave Balance (CL)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quotaAdjustFormData.casual}
                  onChange={e =>
                    setQuotaAdjustFormData({
                      ...quotaAdjustFormData,
                      casual: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Sick Leave Balance (SL)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quotaAdjustFormData.sick}
                  onChange={e =>
                    setQuotaAdjustFormData({
                      ...quotaAdjustFormData,
                      sick: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Annual Paid Vacation Balance (AL)
                </label>
                <input
                  type="number"
                  min="0"
                  value={quotaAdjustFormData.annual}
                  onChange={e =>
                    setQuotaAdjustFormData({
                      ...quotaAdjustFormData,
                      annual: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Emergency / Compassionate Balance
                </label>
                <input
                  type="number"
                  min="0"
                  value={quotaAdjustFormData.emergency}
                  onChange={e =>
                    setQuotaAdjustFormData({
                      ...quotaAdjustFormData,
                      emergency: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuotaCandidateStaff(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustedQuota}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition"
              >
                Save Quotas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Staff Deletion */}
      <ConfirmModal
        isOpen={!!deleteCandidateStaff}
        title="Archive Employee Record?"
        message={`Are you sure you want to remove ${deleteCandidateStaff?.fullName} (${deleteCandidateStaff?.employeeCode}) from active staff records? All historical attendance and financial ledger records will be preserved.`}
        confirmLabel="Yes, Remove Staff"
        isDestructive={true}
        onConfirm={handleConfirmDeleteStaff}
        onCancel={() => setDeleteCandidateStaff(null)}
      />

      {/* Individual Employee Leave Balance Statement Modal */}
      <EmployeeLeaveBalanceModal
        isOpen={!!leaveBalanceCandidateStaff}
        onClose={() => setLeaveBalanceCandidateStaff(null)}
        staff={leaveBalanceCandidateStaff}
        leaves={staffLeaves}
        settings={settings}
        onAdjustQuota={(s) => {
          setQuotaCandidateStaff(s);
          setQuotaAdjustFormData({
            casual: s.leaveBalance?.casual ?? 8,
            sick: s.leaveBalance?.sick ?? 10,
            paid: s.leaveBalance?.paid ?? 15,
            annual: s.leaveBalance?.annual ?? 15,
            emergency: s.leaveBalance?.emergency ?? 3,
          });
        }}
      />
    </div>
  );
};
