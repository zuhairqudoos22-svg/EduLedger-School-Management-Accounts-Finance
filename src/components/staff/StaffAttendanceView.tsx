import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { AttendanceStatus, StaffAttendanceRecord } from '../../types';
import { getTodayDateString, exportToCSV, exportToExcel } from '../../utils/formatters';
import { ExportDropdown } from '../common/ExportDropdown';
import { QRScannerModal } from '../common/QRScannerModal';
import { AttendanceQRModal } from '../common/AttendanceQRModal';
import {
  Clock,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart2,
  Users,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import '../../utils/chartSetup';
import { Doughnut, Bar } from 'react-chartjs-2';

export const StaffAttendanceView: React.FC = () => {
  const { staff, staffAttendance, saveStaffAttendance, updateStaff, students, settings } = useSchool();
  const { isAdmin } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);

  const departments = ['Academics', 'Mathematics', 'Humanities', 'Science & Robotics', 'Finance & Accounts', 'Administration', 'Operations', 'Athletics'];

  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.status === 'active' && (selectedDept === 'All' || s.department === selectedDept));
  }, [staff, selectedDept]);

  // Form attendance map: staffId -> { status, leaveType, remarks }
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; leaveType?: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency'; remarks: string }>
  >({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [bulkRemark, setBulkRemark] = useState<string>('');
  const [bulkLeaveType, setBulkLeaveType] = useState<'casual' | 'sick' | 'paid' | 'annual' | 'emergency'>('casual');
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Sync checkbox indeterminate state
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        selectedStaffIds.length > 0 && selectedStaffIds.length < filteredStaff.length;
    }
  }, [selectedStaffIds, filteredStaff]);

  useEffect(() => {
    setSelectedStaffIds([]);
    const map: Record<
      string,
      { status: AttendanceStatus; leaveType?: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency'; remarks: string }
    > = {};

    for (const member of filteredStaff) {
      const existing = staffAttendance.find(
        a => a.date === selectedDate && a.staffId === member.id
      );
      if (existing) {
        map[member.id] = {
          status: existing.status,
          leaveType: existing.leaveType || 'casual',
          remarks: existing.remarks || '',
        };
      } else {
        map[member.id] = {
          status: 'present',
          leaveType: 'casual',
          remarks: '',
        };
      }
    }
    setAttendanceMap(map);
  }, [selectedDate, filteredStaff, staffAttendance]);

  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    if (!isAdmin) return;
    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status,
      },
    }));
  };

  const handleLeaveTypeChange = (
    staffId: string,
    leaveType: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency'
  ) => {
    if (!isAdmin) return;
    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        leaveType,
      },
    }));
  };

  const handleRemarkChange = (staffId: string, remarks: string) => {
    if (!isAdmin) return;
    setAttendanceMap(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!isAdmin) return;
    const newMap: Record<string, { status: AttendanceStatus; leaveType?: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency'; remarks: string }> = {};
    for (const member of filteredStaff) {
      newMap[member.id] = {
        status,
        leaveType: attendanceMap[member.id]?.leaveType || 'casual',
        remarks: attendanceMap[member.id]?.remarks || '',
      };
    }
    setAttendanceMap(newMap);
  };

  const handleMarkSelected = (status: AttendanceStatus, leaveType?: 'casual' | 'sick' | 'paid' | 'annual' | 'emergency') => {
    if (!isAdmin || selectedStaffIds.length === 0) return;
    const finalLeaveType = leaveType || bulkLeaveType;
    setAttendanceMap(prev => {
      const newMap = { ...prev };
      for (const id of selectedStaffIds) {
        newMap[id] = {
          ...newMap[id],
          status,
          leaveType: status === 'leave' ? finalLeaveType : newMap[id]?.leaveType,
          remarks: bulkRemark.trim() ? bulkRemark.trim() : newMap[id]?.remarks || '',
        };
      }
      return newMap;
    });
    setBulkRemark('');
  };

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

  const handleSaveAttendance = async () => {
    if (!isAdmin) return;
    const recordsToSave: StaffAttendanceRecord[] = filteredStaff.map(member => {
      const entry = attendanceMap[member.id] || { status: 'present', remarks: '' };
      return {
        id: `att-st-${selectedDate}-${member.id}`,
        date: selectedDate,
        staffId: member.id,
        staffName: member.fullName,
        designation: member.designation,
        status: entry.status,
        leaveType: entry.status === 'leave' ? entry.leaveType : undefined,
        remarks: entry.remarks,
      };
    });

    await saveStaffAttendance(recordsToSave);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const getStaffAttendanceRows = () => {
    return filteredStaff.map(member => {
      const entry = attendanceMap[member.id] || { status: 'present', leaveType: 'casual', remarks: '' };
      return {
        Date: selectedDate,
        'Employee Code': member.employeeCode,
        'Staff Name': member.fullName,
        Designation: member.designation,
        Department: member.department,
        Status: entry.status.toUpperCase(),
        'Leave Category': entry.status === 'leave' ? (entry.leaveType ? entry.leaveType.toUpperCase() : 'CASUAL') : 'N/A',
        Remarks: entry.remarks || 'None',
        'Contact Number': member.contactNumber,
      };
    });
  };

  const handleExportStaffAttendanceExcel = () => {
    const rows = getStaffAttendanceRows();
    if (rows.length === 0) return;
    exportToExcel(`Staff_Attendance_${selectedDept}_${selectedDate}`, 'Staff Attendance', rows);
    setExportNotice(`Exported ${rows.length} staff attendance records to Excel (.xlsx).`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportStaffAttendanceCSV = () => {
    const rows = getStaffAttendanceRows();
    if (rows.length === 0) return;
    exportToCSV(`Staff_Attendance_${selectedDept}_${selectedDate}`, rows);
    setExportNotice(`Exported ${rows.length} staff attendance records to CSV.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Turnout numbers
  const presentCount = filteredStaff.filter(s => attendanceMap[s.id]?.status === 'present').length;
  const absentCount = filteredStaff.filter(s => attendanceMap[s.id]?.status === 'absent').length;
  const leaveCount = filteredStaff.filter(s => attendanceMap[s.id]?.status === 'leave').length;

  // Monthly presence rate per staff
  const staffMonthlyRates = useMemo(() => {
    const monthPrefix = selectedDate.slice(0, 7);
    const map: Record<string, number> = {};

    for (const member of filteredStaff) {
      const recs = staffAttendance.filter(
        a => a.staffId === member.id && a.date.startsWith(monthPrefix)
      );
      if (recs.length === 0) {
        map[member.id] = 100;
      } else {
        const present = recs.filter(r => r.status === 'present').length;
        map[member.id] = Math.round((present / recs.length) * 100);
      }
    }
    return map;
  }, [filteredStaff, staffAttendance, selectedDate]);

  // Department attendance chart
  const deptChartData = useMemo(() => {
    const presentByDept = departments.map(d => {
      const deptStaff = staff.filter(s => s.department === d);
      return deptStaff.filter(
        s => attendanceMap[s.id]?.status === 'present'
      ).length;
    });

    return {
      labels: departments,
      datasets: [
        {
          label: 'Present Staff Members',
          data: presentByDept,
          backgroundColor: '#3B82F6',
          borderRadius: 4,
        },
      ],
    };
  }, [departments, staff, attendanceMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span>Staff Daily Attendance & Leave Tracking</span>
          </h2>
          <p className="text-xs text-slate-500">
            Faculty daily roll call, leave categories (casual/sick/paid), and department attendance rates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
              title="Scan staff QR badge or barcode to instantly mark attendance"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Staff QR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQRGeneratorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Generate and print staff attendance QR badges & cards"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Staff QR Badges</span>
          </button>

          <ExportDropdown
            label="Export Staff Attendance"
            totalCount={filteredStaff.length}
            onExportExcel={handleExportStaffAttendanceExcel}
            onExportCSV={handleExportStaffAttendanceCSV}
            size="md"
          />

          {isAdmin && (
            <button
              onClick={handleSaveAttendance}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Staff Attendance</span>
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {isSavedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Staff attendance records updated successfully!</span>
        </div>
      )}

      {/* Date & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-blue-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-semibold">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Batch Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Mark:</span>
            <button
              type="button"
              onClick={() => handleMarkAll('present')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('absent')}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold hover:bg-red-100 transition"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Faculty Roster</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {filteredStaff.length} Members
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
            Present
          </p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {presentCount}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase">Absent</p>
          <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{absentCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">
            Approved Leave
          </p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{leaveCount}</p>
        </div>
      </div>

      {/* Selected Staff Bulk Action Bar */}
      {selectedStaffIds.length > 0 && isAdmin && (
        <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white shadow-xl border border-blue-600/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {selectedStaffIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-white leading-tight">
                {selectedStaffIds.length} of {filteredStaff.length} Faculty Members Selected
              </p>
              <p className="text-[11px] text-blue-300">
                Apply attendance status and leave parameters to all selected records simultaneously
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={bulkRemark}
              onChange={e => setBulkRemark(e.target.value)}
              placeholder="Optional remark for all..."
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-400 w-40"
            />

            <select
              value={bulkLeaveType}
              onChange={e => setBulkLeaveType(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-hidden"
              title="Leave type applied when clicking Mark Leave"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="paid">Paid Leave</option>
            </select>

            <button
              type="button"
              onClick={() => handleMarkSelected('present')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Present</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkSelected('absent')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mark Absent</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkSelected('leave')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mark Leave</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStaffIds([])}
              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff Roll Call Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Staff Daily Roster ({selectedDept === 'All' ? 'All Departments' : selectedDept})
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {filteredStaff.length} Members
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && filteredStaff.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                <span>
                  {selectedStaffIds.length === filteredStaff.length
                    ? 'Deselect All'
                    : `Select All (${filteredStaff.length})`}
                </span>
              </button>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">
              Select rows for bulk status or click individual toggles
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      id="select-all-staff-header"
                      checked={
                        filteredStaff.length > 0 &&
                        selectedStaffIds.length === filteredStaff.length
                      }
                      onChange={toggleSelectAll}
                      disabled={!isAdmin || filteredStaff.length === 0}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        selectedStaffIds.length === filteredStaff.length
                          ? 'Deselect All Staff'
                          : 'Select All Staff in Roster'
                      }
                      aria-label="Select All Staff"
                    />
                  </div>
                </th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-center">Month Presence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Leave Subtype</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStaff.map(member => {
                const entry = attendanceMap[member.id] || { status: 'present', remarks: '' };
                const monthlyPct = staffMonthlyRates[member.id] ?? 100;
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
                        disabled={!isAdmin}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {member.fullName}
                      <span className="block font-mono text-[10px] text-slate-400 font-normal">
                        {member.employeeCode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {member.designation}
                      </p>
                      <p className="text-[11px] text-slate-500">{member.department}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                        {monthlyPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.id, 'present')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            entry.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            entry.status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(member.id, 'leave')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            entry.status === 'leave'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Leave</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {entry.status === 'leave' ? (
                        <select
                          value={entry.leaveType || 'casual'}
                          onChange={e =>
                            handleLeaveTypeChange(
                              member.id,
                              e.target.value as 'casual' | 'sick' | 'paid'
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold"
                        >
                          <option value="casual">
                            Casual (Bal: {member.leaveBalance?.casual ?? 8})
                          </option>
                          <option value="sick">
                            Sick (Bal: {member.leaveBalance?.sick ?? 10})
                          </option>
                          <option value="paid">
                            Paid Annual (Bal: {member.leaveBalance?.paid ?? 15})
                          </option>
                        </select>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">N/A (Present)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Reason or note..."
                        value={entry.remarks}
                        onChange={e => handleRemarkChange(member.id, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Attendance Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-blue-600" />
          <span>Department-Wise Faculty Attendance ({selectedDate})</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Presence across instructional and operational units
        </p>

        <div className="h-60">
          <Bar
            data={deptChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
        </div>
      </div>

      {/* Staff QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        scannerTarget="staff"
        mode="attendance"
        onStaffIdentified={(scannedStaff) => {
          setAttendanceMap(prev => ({
            ...prev,
            [scannedStaff.id]: {
              status: 'present',
              leaveType: 'casual',
              remarks: 'Verified via Staff QR Scanner',
            },
          }));
        }}
      />

      {/* Staff Attendance QR Badge Generator Modal */}
      <AttendanceQRModal
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        students={students}
        staff={staff}
        settings={settings}
        initialType="staff"
        initialDept={selectedDept}
      />
    </div>
  );
};
