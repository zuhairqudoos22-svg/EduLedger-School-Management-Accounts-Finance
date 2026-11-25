import React, { useState, useRef } from 'react';
import { Student, Staff, SchoolSettings } from '../../types';
import { useSchool } from '../../context/SchoolContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  X,
  Upload,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  User,
  GraduationCap,
  Building,
  Image as ImageIcon,
  Sparkles,
  PenTool,
} from 'lucide-react';

interface CardDetailEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: Student | Staff | null;
  type: 'student' | 'staff';
  settings: SchoolSettings;
  onSaved?: (updated: Student | Staff) => void;
}

export const CardDetailEditorModal: React.FC<CardDetailEditorModalProps> = ({
  isOpen,
  onClose,
  attendee,
  type,
  settings,
  onSaved,
}) => {
  const { updateStudent, updateStaff, updateSettings } = useSchool();
  const { notify } = useNotifications();

  const photoFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const signatureFileRef = useRef<HTMLInputElement>(null);

  const isStudent = type === 'student';
  const student = isStudent ? (attendee as Student | null) : null;
  const staff = !isStudent ? (attendee as Staff | null) : null;

  // Form states initialized with current values
  const [fullName, setFullName] = useState(attendee?.fullName || '');
  const [rollOrCode, setRollOrCode] = useState(
    isStudent ? student?.rollNo || '' : staff?.employeeCode || ''
  );
  const [classNameVal, setClassNameVal] = useState(student?.className || 'Grade 7');
  const [sectionVal, setSectionVal] = useState(student?.section || 'B');
  const [designationVal, setDesignationVal] = useState(staff?.designation || 'Senior Faculty');
  const [departmentVal, setDepartmentVal] = useState(staff?.department || 'Academics');

  const [fatherName, setFatherName] = useState(
    isStudent
      ? student?.fatherName || student?.guardianName || 'Rajesh Sharma'
      : staff?.fatherOrSpouseName || 'Dr. K. Sharma'
  );
  const [motherName, setMotherName] = useState(student?.motherName || 'Pooja Sharma');
  const [dateOfBirth, setDateOfBirth] = useState(
    attendee?.dateOfBirth ? attendee.dateOfBirth.slice(0, 10) : '2012-08-15'
  );
  const [bloodGroup, setBloodGroup] = useState(attendee?.bloodGroup || 'O+');
  const [address, setAddress] = useState(
    attendee?.address || '123, Green Park, New Delhi - 110016'
  );
  const [contactNumber, setContactNumber] = useState(attendee?.contactNumber || '+91 98765 43210');
  const [idNumber, setIdNumber] = useState(
    (isStudent ? student?.idNumber : staff?.idNumber) ||
      (isStudent ? `BFPS/25/${student?.rollNo || '0789'}` : `BFPS/STAFF/${staff?.employeeCode || '101'}`)
  );

  const [photoUrl, setPhotoUrl] = useState<string>(attendee?.photoUrl || '');
  const [schoolName, setSchoolName] = useState(settings.schoolName || 'BRIGHT FUTURE');
  const [schoolTagline, setSchoolTagline] = useState(settings.schoolTagline || 'PUBLIC SCHOOL');
  const [currentAcademicYear, setCurrentAcademicYear] = useState(
    settings.currentAcademicYear || '2025-26'
  );
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [principalSignatureUrl, setPrincipalSignatureUrl] = useState<string>(settings.principalSignatureUrl || '');
  const [principalName, setPrincipalName] = useState<string>(settings.principalName || 'Principal');

  const [activeTab, setActiveTab] = useState<'attendee' | 'school'>('attendee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if attendee or settings change
  React.useEffect(() => {
    setPrincipalSignatureUrl(settings.principalSignatureUrl || '');
    setPrincipalName(settings.principalName || 'Principal');
    if (attendee) {
      setFullName(attendee.fullName);
      setPhotoUrl(attendee.photoUrl || '');
      setDateOfBirth(attendee.dateOfBirth ? attendee.dateOfBirth.slice(0, 10) : '2012-08-15');
      setBloodGroup(attendee.bloodGroup || 'O+');
      setAddress(attendee.address || '');
      setContactNumber(attendee.contactNumber || '');

      if (isStudent && student) {
        setRollOrCode(student.rollNo);
        setClassNameVal(student.className);
        setSectionVal(student.section);
        setFatherName(student.fatherName || student.guardianName || 'Rajesh Sharma');
        setMotherName(student.motherName || 'Pooja Sharma');
        setIdNumber(student.idNumber || `BFPS/25/${student.rollNo}`);
      } else if (staff) {
        setRollOrCode(staff.employeeCode);
        setDesignationVal(staff.designation);
        setDepartmentVal(staff.department);
        setFatherName(staff.fatherOrSpouseName || 'Dr. K. Sharma');
        setIdNumber(staff.idNumber || `BFPS/STAFF/${staff.employeeCode}`);
      }
    }
  }, [attendee, isStudent, student, staff]);

  if (!isOpen || !attendee) return null;

  // Photo file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        setPhotoUrl(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        setLogoUrl(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Principal Signature upload (JPG, PNG, JPEG)
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate JPG, PNG, JPEG
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = /\.(jpe?g|png)$/i;
    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      notify({
        title: 'Unsupported Image Format',
        message: 'Please upload a valid JPG, PNG, or JPEG file for principal signature.',
        category: 'system',
        priority: 'urgent',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        setPrincipalSignatureUrl(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Update School Settings if changed
      if (
        schoolName !== settings.schoolName ||
        schoolTagline !== settings.schoolTagline ||
        currentAcademicYear !== settings.currentAcademicYear ||
        logoUrl !== settings.logoUrl ||
        principalSignatureUrl !== settings.principalSignatureUrl ||
        principalName !== settings.principalName
      ) {
        await updateSettings({
          ...settings,
          schoolName,
          schoolTagline,
          currentAcademicYear,
          logoUrl,
          principalSignatureUrl,
          principalName,
        });
      }

      // 2. Update Student or Staff
      if (isStudent && student) {
        const updatedStudent: Student = {
          ...student,
          fullName,
          rollNo: rollOrCode,
          className: classNameVal,
          section: sectionVal,
          fatherName,
          motherName,
          guardianName: fatherName,
          dateOfBirth,
          bloodGroup,
          address,
          contactNumber,
          idNumber,
          photoUrl,
        };
        await updateStudent(updatedStudent);
        onSaved?.(updatedStudent);
      } else if (staff) {
        const updatedStaff: Staff = {
          ...staff,
          fullName,
          employeeCode: rollOrCode,
          designation: designationVal,
          department: departmentVal,
          fatherOrSpouseName: fatherName,
          dateOfBirth,
          bloodGroup,
          address,
          contactNumber,
          idNumber,
          photoUrl,
        };
        await updateStaff(updatedStaff);
        onSaved?.(updatedStaff);
      }

      notify({
        title: 'ID Card Details Updated',
        message: `Successfully saved card profile and details for ${fullName}.`,
        category: 'system',
        priority: 'normal',
      });
      onClose();
    } catch (err) {
      console.error('Failed to update card details:', err);
      notify({
        title: 'Save Failed',
        message: 'Could not update ID card details.',
        category: 'system',
        priority: 'urgent',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Hidden inputs */}
        <input
          ref={photoFileRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          ref={logoFileRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />
        <input
          ref={signatureFileRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
          onChange={handleSignatureUpload}
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Customize ID Card &amp; Details
              </h3>
              <p className="text-xs text-slate-500">
                Update photo, personal credentials, ID number, and institutional branding
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('attendee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'attendee'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isStudent ? <GraduationCap className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
            <span>{isStudent ? 'Student Profile & Details' : 'Staff Profile & Details'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'school'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>School Logo &amp; Card Branding</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'attendee' ? (
            <div className="space-y-4">
              {/* Photo Upload Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-24 h-28 rounded-2xl border-2 border-indigo-600 bg-white dark:bg-slate-900 overflow-hidden shadow-md flex items-center justify-center shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <User className="w-8 h-8 text-slate-300" />
                      <span className="text-[9px] font-bold mt-1">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {isStudent ? 'Student Passport Photo' : 'Faculty / Staff Photo'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Recommended 3:4 aspect ratio (passport size), JPG or PNG. Updates the ID card and campus records.
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <button
                      type="button"
                      onClick={() => photoFileRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-red-100 hover:text-red-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid 1: Basic Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. AARAV SHARMA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isStudent ? 'Roll Number *' : 'Employee Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={rollOrCode}
                    onChange={e => setRollOrCode(e.target.value)}
                    placeholder={isStudent ? 'e.g. 1001' : 'e.g. EMP-101'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                {isStudent ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Class / Grade
                      </label>
                      <input
                        type="text"
                        value={classNameVal}
                        onChange={e => setClassNameVal(e.target.value)}
                        placeholder="e.g. 7th or Grade 7"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Section
                      </label>
                      <input
                        type="text"
                        value={sectionVal}
                        onChange={e => setSectionVal(e.target.value)}
                        placeholder="e.g. B"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={designationVal}
                        onChange={e => setDesignationVal(e.target.value)}
                        placeholder="e.g. Senior Faculty"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={departmentVal}
                        onChange={e => setDepartmentVal(e.target.value)}
                        placeholder="e.g. Science & Mathematics"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isStudent ? "Father's Name" : "Father / Spouse Name"}
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={e => setFatherName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                {isStudent && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={e => setMotherName(e.target.value)}
                      placeholder="e.g. Pooja Sharma"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Full Address (Printed on Card)
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. 123, Green Park, New Delhi - 110016"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Emergency Phone / Contact
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Custom ID Number (Printed in Bottom Right)
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    placeholder="e.g. BFPS/25/0789"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* School Logo & Branding Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl border-2 border-amber-400 bg-[#0A2E63] p-1 overflow-hidden shadow-md flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-amber-300">
                      <Sparkles className="w-6 h-6 mx-auto mb-0.5" />
                      <span className="text-[8px] font-bold uppercase">Shield Logo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    School Logo / Official Crest
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Upload an emblem, shield, or crest (PNG/JPG with transparent or solid background).
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload School Logo</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-red-100 hover:text-red-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Use Default Crest</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Principal Signature Upload Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-36 h-20 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {principalSignatureUrl ? (
                    <img
                      src={principalSignatureUrl}
                      alt="Principal Signature Preview"
                      className="max-h-full max-w-full object-contain filter contrast-125"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="font-serif italic text-base text-slate-700 dark:text-slate-300 font-bold block -rotate-3 tracking-wide">
                        Authorized
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">(Default Cursive)</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Principal's Signature (JPG, PNG, JPEG)
                    </h4>
                    {principalSignatureUrl && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        Custom Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload official principal or director signature. Rendered on Student &amp; Staff ID cards and printable PDF sheets.
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <button
                      type="button"
                      onClick={() => signatureFileRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{principalSignatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                    </button>
                    {principalSignatureUrl && (
                      <button
                        type="button"
                        onClick={() => setPrincipalSignatureUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition hover:bg-red-100 hover:text-red-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Use Default Cursive</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Signatory Title / Name (Printed under Signature)
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={e => setPrincipalName(e.target.value)}
                    placeholder="e.g. Principal / Authorized Signatory"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    School Primary Name (Top Header Line 1)
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="e.g. BRIGHT FUTURE"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    School Subtitle / Board (Top Header Line 2, Golden Yellow)
                  </label>
                  <input
                    type="text"
                    value={schoolTagline}
                    onChange={e => setSchoolTagline(e.target.value)}
                    placeholder="e.g. PUBLIC SCHOOL"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Academic Session (Printed next to QR Code)
                  </label>
                  <input
                    type="text"
                    value={currentAcademicYear}
                    onChange={e => setCurrentAcademicYear(e.target.value)}
                    placeholder="e.g. 2025-26"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0A2E63] hover:bg-[#103D82] text-white text-xs font-bold transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Update Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
