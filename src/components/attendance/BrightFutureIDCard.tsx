import React, { useRef } from 'react';
import { Student, Staff, SchoolSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Camera, Upload, Edit3, Shield, BookOpen, QrCode } from 'lucide-react';
import {
  BadgeThemeKey,
  BadgeThemeConfig,
  resolveBadgeTheme,
} from '../../utils/badgeTheme';

export interface BrightFutureIDCardProps {
  attendee: Student | Staff;
  type: 'student' | 'staff';
  settings: SchoolSettings;
  theme?: BadgeThemeKey;
  themeConfig?: BadgeThemeConfig;
  customPrimaryColor?: string;
  qrDataUrl?: string;
  onUploadPhoto?: (fileBase64: string) => void;
  onUploadLogo?: (fileBase64: string) => void;
  onUploadSignature?: (fileBase64: string) => void;
  onEditDetails?: () => void;
  showLanyardSlot?: boolean;
  showEditOverlay?: boolean;
  className?: string;
}

export const BrightFutureIDCard: React.FC<BrightFutureIDCardProps> = ({
  attendee,
  type,
  settings,
  theme = 'navy',
  themeConfig,
  customPrimaryColor,
  qrDataUrl,
  onUploadPhoto,
  onUploadLogo,
  onUploadSignature,
  onEditDetails,
  showLanyardSlot = true,
  showEditOverlay = false,
  className = '',
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const activeTheme: BadgeThemeConfig =
    themeConfig || resolveBadgeTheme(theme, customPrimaryColor);

  const isStudent = type === 'student';
  const student = isStudent ? (attendee as Student) : null;
  const staff = !isStudent ? (attendee as Staff) : null;

  // School branding defaults with fallbacks matching sample card
  const schoolName = settings.schoolName || 'BRIGHT FUTURE';
  const schoolSubtitle = settings.schoolTagline || 'PUBLIC SCHOOL';
  const schoolMotto = 'Knowledge Today, Success Tomorrow';
  const session = settings.currentAcademicYear || '2025-26';

  // Student specific details
  const studentClass = student ? student.className : '';
  const studentSection = student ? student.section : '';
  const formattedClass = student
    ? studentClass.toLowerCase().includes('grade') || studentClass.toLowerCase().includes('class')
      ? `${studentClass} (${studentSection || 'A'})`
      : `Class : ${studentClass} (${studentSection || 'A'})`
    : '';

  const fatherName = isStudent
    ? student?.fatherName || student?.guardianName || 'Rajesh Sharma'
    : staff?.fatherOrSpouseName || staff?.emergencyContact?.name || 'Dr. K. Sharma';

  const motherName = isStudent ? student?.motherName || 'Pooja Sharma' : '';

  const dobFormatted = attendee.dateOfBirth
    ? formatDate(attendee.dateOfBirth)
    : isStudent
    ? '15-08-2012'
    : '22-06-1988';

  const bloodGroup = attendee.bloodGroup || 'O+';
  const address = attendee.address || '123, Green Park, New Delhi - 110016';

  // ID Number badge text
  const idNumber =
    (isStudent ? student?.idNumber : staff?.idNumber) ||
    (isStudent
      ? `BFPS/${session.slice(2, 4)}/${student?.rollNo || '0789'}`
      : `BFPS/STAFF/${staff?.employeeCode || '101'}`);

  // Photo change handler
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadPhoto) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        onUploadPhoto(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Logo change handler
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        onUploadLogo(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Signature change handler
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadSignature) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        onUploadSignature(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className={`relative w-[340px] h-[550px] bg-white text-slate-900 rounded-[24px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col justify-between font-sans select-none print:shadow-none print:border print:border-slate-400 ${className}`}
      style={{
        boxShadow: `0 20px 40px -15px ${activeTheme.primaryHex}40, 0 0 0 1px ${activeTheme.primaryHex}1A`,
      }}
    >
      {/* Hidden File Inputs for Direct Photo & Logo Upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoFileChange}
        className="hidden"
      />

      {/* TOP HEADER SECTION */}
      <div
        className="relative text-white pt-2.5 px-4 pb-7 transition-colors duration-200"
        style={{ backgroundColor: activeTheme.primaryHex }}
      >
        {/* Lanyard Slot Cutout */}
        {showLanyardSlot && (
          <div className="flex justify-center mb-1.5">
            <div className="w-14 h-3 bg-white rounded-full border border-slate-300 shadow-inner flex items-center justify-center">
              <div className="w-11 h-1.5 bg-slate-200/80 rounded-full" />
            </div>
          </div>
        )}

        {/* School Logo & Title Block */}
        <div className="flex items-center gap-2.5">
          {/* Logo / Shield Emblem */}
          <div
            onClick={() => onUploadLogo && logoInputRef.current?.click()}
            className={`relative w-12 h-14 shrink-0 rounded-lg flex items-center justify-center group ${
              onUploadLogo ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''
            }`}
            title={onUploadLogo ? 'Click to upload custom school logo' : 'School Logo'}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="School Logo"
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              /* High-fidelity Vector Shield Emblem matching reference card */
              <div
                className="w-full h-full relative flex flex-col items-center justify-center border-2 rounded-lg p-1 shadow-md transition-colors"
                style={{
                  background: `linear-gradient(to bottom, ${activeTheme.primaryDarkHex}, ${activeTheme.primaryHex})`,
                  borderColor: activeTheme.accentHex,
                }}
              >
                <BookOpen className="w-6 h-6 text-white stroke-[2]" />
                <div
                  className="w-7 h-0.5 my-0.5"
                  style={{ backgroundColor: activeTheme.accentHex }}
                />
                <span
                  className="text-[6px] uppercase font-black tracking-tighter"
                  style={{ color: activeTheme.accentHex }}
                >
                  ESTD
                </span>
              </div>
            )}
            {onUploadLogo && (
              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          {/* School Name, Subtitle, Slogan */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-black uppercase text-white tracking-wide leading-tight truncate">
              {schoolName}
            </h1>
            <p
              className="text-[12px] font-extrabold uppercase tracking-wider leading-tight truncate transition-colors"
              style={{ color: activeTheme.accentHex }}
            >
              {schoolSubtitle}
            </p>
            <p className="text-[8px] text-white/85 font-medium tracking-normal mt-0.5 truncate">
              {schoolMotto}
            </p>
          </div>
        </div>

        {/* Decorative Wave Swooshes (Flowing from primary to gold to secondary to white) */}
        <div className="absolute left-0 right-0 -bottom-[1px] h-7 overflow-hidden pointer-events-none">
          <svg
            viewBox="0 0 340 32"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Secondary Accent Wave */}
            <path
              d="M0,0 C90,32 230,28 340,4 L340,32 L0,32 Z"
              fill={activeTheme.secondaryHex}
              opacity="0.85"
            />
            {/* Golden / Highlight Wave */}
            <path
              d="M0,0 C100,24 240,20 340,8 L340,32 L0,32 Z"
              fill={activeTheme.accentHex}
            />
            {/* Main Primary Base Arc */}
            <path
              d="M0,0 C110,18 250,14 340,11 L340,0 L0,0 Z"
              fill={activeTheme.primaryHex}
            />
          </svg>
        </div>
      </div>

      {/* CARD BODY: Photo, Session, QR Code, Name, Details */}
      <div className="px-5 pt-3 pb-2 flex-1 flex flex-col justify-between">
        {/* Photo and QR Code Row */}
        <div className="flex items-center justify-between gap-3 mt-1">
          {/* Student / Staff Photo Box */}
          <div className="relative group">
            <div
              className="w-[124px] h-[134px] rounded-[18px] border-2 bg-slate-50 overflow-hidden shadow-md flex items-center justify-center transition-colors"
              style={{ borderColor: activeTheme.primaryHex }}
            >
              {attendee.photoUrl ? (
                <img
                  src={attendee.photoUrl}
                  alt={attendee.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-b from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <div
                    className="w-14 h-14 rounded-full text-white font-black text-2xl flex items-center justify-center mb-1"
                    style={{ backgroundColor: activeTheme.primaryHex }}
                  >
                    {attendee.fullName.charAt(0)}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    {onUploadPhoto ? 'Upload Photo' : 'No Photo'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Upload Photo Overlay */}
            {onUploadPhoto && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 text-white rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer font-bold text-[10px]"
                style={{ backgroundColor: `${activeTheme.primaryHex}B3` }}
                title="Upload Photo for Attendee"
              >
                <Camera className="w-5 h-5" />
                <span>Change Photo</span>
              </button>
            )}
          </div>

          {/* Right Column: Session & QR Code */}
          <div className="flex flex-col items-center justify-center space-y-1.5 pr-2">
            <div className="text-center">
              <p
                className="text-[10px] font-black uppercase tracking-widest leading-none transition-colors"
                style={{ color: activeTheme.primaryHex }}
              >
                SESSION
              </p>
              <p className="text-[12px] font-black text-slate-800 font-mono leading-tight mt-0.5">
                {session}
              </p>
            </div>

            {/* Scannable High-Density QR Code */}
            <div className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Attendance Code"
                  className="w-[84px] h-[84px] object-contain"
                />
              ) : (
                <div className="w-[84px] h-[84px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendee Name & Class / Designation */}
        <div className="text-center mt-2.5 mb-1.5">
          <h2
            className="text-[17px] font-black uppercase tracking-wide leading-tight truncate px-1 transition-colors"
            style={{ color: activeTheme.primaryHex }}
          >
            {attendee.fullName}
          </h2>
          <p className="text-[12px] font-bold text-slate-800 mt-0.5">
            {isStudent
              ? formattedClass || `Class : ${studentClass} (${studentSection || 'A'})`
              : `Designation : ${staff?.designation || 'Faculty'}`}
          </p>
        </div>

        {/* Two-Column Aligned Key-Value Details Table */}
        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-[11px] leading-relaxed">
          <div className="space-y-1">
            {/* Row 1: Father's Name / Spouse */}
            <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
              <span className="font-bold text-slate-700">
                {isStudent ? "Father's Name" : "Father / Spouse"}
              </span>
              <span className="font-bold text-slate-500">:</span>
              <span className="font-semibold text-slate-900 truncate">
                {fatherName}
              </span>
            </div>

            {/* Row 2: Mother's Name (for student) or Department (for staff) */}
            {isStudent ? (
              <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                <span className="font-bold text-slate-700">Mother's Name</span>
                <span className="font-bold text-slate-500">:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {motherName}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                <span className="font-bold text-slate-700">Department</span>
                <span className="font-bold text-slate-500">:</span>
                <span className="font-semibold text-slate-900 truncate">
                  {staff?.department || 'Academics'}
                </span>
              </div>
            )}

            {/* Row 3: Date of Birth */}
            <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
              <span className="font-bold text-slate-700">Date of Birth</span>
              <span className="font-bold text-slate-500">:</span>
              <span className="font-semibold text-slate-900 truncate">
                {dobFormatted}
              </span>
            </div>

            {/* Row 4: Blood Group */}
            <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
              <span className="font-bold text-slate-700">Blood Group</span>
              <span className="font-bold text-slate-500">:</span>
              <span className="font-semibold text-slate-900 truncate">
                {bloodGroup}
              </span>
            </div>

            {/* Row 5: Address */}
            <div className="grid grid-cols-[100px_10px_1fr] items-start">
              <span className="font-bold text-slate-700">Address</span>
              <span className="font-bold text-slate-500">:</span>
              <span className="font-semibold text-slate-900 line-clamp-2 leading-tight">
                {address}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: Signature on left, Dynamic ID No. Badge on right with Swooshes */}
      <div className="relative pt-3 pb-3 px-4 overflow-hidden">
        {/* Layered Decorative Swoosh at Footer */}
        <div className="absolute left-0 right-0 top-0 h-6 pointer-events-none">
          <svg
            viewBox="0 0 340 24"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Secondary background accent wave */}
            <path
              d="M0,18 C120,4 220,16 340,6 L340,24 L0,24 Z"
              fill={activeTheme.secondaryHex}
              opacity="0.6"
            />
            {/* Primary bottom banner wave holding the right badge */}
            <path
              d="M170,24 C230,12 280,4 340,0 L340,24 Z"
              fill={activeTheme.primaryHex}
            />
          </svg>
        </div>

        {/* Content Row: Principal Signature vs ID Badge */}
        <div className="relative z-10 flex items-end justify-between gap-2 mt-1">
          {/* Left: Authentic Cursive Signature & Principal Title (with upload support) */}
          <div className="flex flex-col items-center pl-2 relative group/sig">
            {settings.principalSignatureUrl ? (
              <div className="h-7 w-20 flex items-center justify-center overflow-hidden">
                <img
                  src={settings.principalSignatureUrl}
                  alt="Principal Signature"
                  className="max-h-7 max-w-[80px] object-contain"
                />
              </div>
            ) : (
              <svg
                className="w-20 h-7 text-slate-800 stroke-slate-800 fill-none"
                viewBox="0 0 100 36"
              >
                <path
                  d="M5,26 Q20,6 30,22 Q38,34 50,14 Q65,6 75,20 Q88,26 95,12"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15,30 Q45,28 85,28"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span className="text-[10px] font-bold text-slate-800 tracking-wide border-t border-slate-400 pt-0.5 w-20 text-center truncate">
              {settings.principalName || 'Principal'}
            </span>

            {/* Quick Upload Principal Signature Overlay */}
            {onUploadSignature && (
              <>
                <input
                  type="file"
                  ref={signatureInputRef}
                  accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleSignatureFileChange}
                />
                <button
                  type="button"
                  onClick={() => signatureInputRef.current?.click()}
                  className="absolute -top-1 -right-2 p-1 rounded-full bg-white shadow-md border border-slate-200 text-indigo-600 opacity-0 group-hover/sig:opacity-100 hover:scale-110 transition cursor-pointer z-10"
                  title="Upload Principal Signature (JPG, PNG, JPEG)"
                  aria-label="Upload Principal Signature"
                >
                  <Upload className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>

          {/* Right: Curved Themed Badge with ID No. and Roll/Admission Code */}
          <div
            className="text-white px-4 py-1.5 rounded-l-2xl rounded-r-lg shadow-md text-right min-w-[130px] transition-colors"
            style={{ backgroundColor: activeTheme.primaryHex }}
          >
            <p className="text-[9px] uppercase font-bold text-white/80 tracking-widest leading-none">
              ID No.
            </p>
            <p className="text-[11px] font-black text-white tracking-wider font-mono mt-0.5">
              {idNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Details Floating Button (if requested) */}
      {onEditDetails && showEditOverlay && (
        <button
          type="button"
          onClick={onEditDetails}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md transition cursor-pointer hover:scale-110 z-20"
          title="Edit Attendee Card Details"
        >
          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
        </button>
      )}
    </div>
  );
};
