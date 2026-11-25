import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Student, SchoolSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useSchool } from '../../context/SchoolContext';
import { BrightFutureIDCard } from '../attendance/BrightFutureIDCard';
import { CardDetailEditorModal } from '../attendance/CardDetailEditorModal';
import {
  Printer,
  X,
  User,
  Phone,
  MapPin,
  Award,
  QrCode,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Scan,
  Star,
  Camera,
  Upload,
  Edit3,
} from 'lucide-react';
import { QRScannerModal } from './QRScannerModal';
import { BackButton } from './BackButton';
import { DeveloperLogo } from './DeveloperLogo';

interface IDCardModalProps {
  student: Student | null;
  settings: SchoolSettings;
  onClose: () => void;
}

export const IDCardModal: React.FC<IDCardModalProps> = ({ student, settings, onClose }) => {
  const { updateStudent, updateSettings } = useSchool();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeCardSide, setActiveCardSide] = useState<'front' | 'back'>('front');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = async (photoBase64: string) => {
    if (!student) return;
    await updateStudent({ ...student, photoUrl: photoBase64 });
  };

  const handleUploadLogo = async (logoBase64: string) => {
    await updateSettings({ ...settings, logoUrl: logoBase64 });
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        handleUploadPhoto(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        handleUploadLogo(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!student) return;

    // Structured QR payload with standard identifiers for attendance & library scanners
    const qrPayload = JSON.stringify({
      type: 'STUDENT_ID',
      id: student.id,
      rollNo: student.rollNo,
      name: student.fullName,
      className: student.className,
      section: student.section,
      bloodGroup: student.bloodGroup || 'O+',
      emergencyContact: student.contactNumber,
      school: settings.schoolName || 'EduLedger Academy',
      academicYear: settings.currentAcademicYear || '2026-2027',
    });

    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#1e1b4b', // deep indigo
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate student ID QR code:', err);
      });
  }, [student, settings]);

  useEffect(() => {
    if (!student) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isScannerOpen && !isEditorOpen) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [student, isScannerOpen, isEditorOpen, onClose]);

  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_ID_${student.rollNo}_${student.fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95"
        >
          {/* Controls Bar */}
          <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 gap-2">
            <div className="flex items-center gap-3">
              <BackButton
                onClick={onClose}
                label="Back to Student Profile"
                variant="modal"
                ariaLabel="Return to student profile"
              />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Student ID Card Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  QR Enabled
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Open scanner to test quick check-in with this ID"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Test Scanner</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Side Switcher (Front vs Back with QR Code) */}
          <div className="print:hidden px-6 pt-3 pb-1 flex items-center justify-between">
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setActiveCardSide('front')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeCardSide === 'front'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Front View
              </button>
              <button
                type="button"
                onClick={() => setActiveCardSide('back')}
                className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  activeCardSide === 'back'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Back (QR Pass)</span>
              </button>
            </div>

            {qrDataUrl && (
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Code</span>
              </button>
            )}
          </div>

          {/* Quick Customization Toolbar */}
          <div className="print:hidden px-6 py-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoInputChange}
            />
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleLogoInputChange}
            />

            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              <span>Upload Logo</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Printable ID Card Container */}
          <div className="p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
            {activeCardSide === 'front' ? (
              /* CARD FRONT - SAMPLE-MATCHED BRIGHT FUTURE ID CARD */
              <div id="printable-id-card-front" className="flex justify-center">
                <BrightFutureIDCard
                  attendee={student}
                  type="student"
                  settings={settings}
                  qrDataUrl={qrDataUrl}
                  onUploadPhoto={handleUploadPhoto}
                  onUploadLogo={handleUploadLogo}
                  onEditDetails={() => setIsEditorOpen(true)}
                  showEditOverlay={true}
                  className="shadow-2xl"
                />
              </div>
            ) : (
              /* CARD BACK WITH FULL HIGH-RES QR CODE */
              <div
                id="printable-id-card-back"
                className="w-80 rounded-3xl bg-white shadow-xl overflow-hidden border border-slate-300 text-slate-800 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="bg-slate-900 text-white p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Quick Scan Digital Badge</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Authorized for Attendance, Library &amp; Security Gate
                  </p>
                </div>

                {/* Large Center QR Code */}
                <div className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 rounded-2xl bg-white border-2 border-indigo-200 shadow-md">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Code for ${student.fullName}`}
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                        Generating QR Code...
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="font-mono text-sm font-black text-slate-900">
                      ID: {student.rollNo}
                    </p>
                    <p className="text-xs font-bold text-indigo-700">{student.fullName}</p>
                    <p className="text-[11px] text-slate-500">
                      Class {student.className} - {student.section}
                    </p>
                  </div>

                  {/* Scanner instructions */}
                  <div className="w-full mt-4 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-950 text-left space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Scanner Instructions:
                    </p>
                    <p className="text-slate-600 leading-tight">
                      • Hold card 5–10 cm in front of terminal camera or 2D laser reader.
                    </p>
                    <p className="text-slate-600 leading-tight">
                      • Automatic attendance confirmation &amp; library checkout privileges.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-2 text-center text-[9px] text-slate-400 flex flex-col items-center gap-1">
                  <span>Non-transferable student credentials • {settings.schoolName || 'EduLedger'}</span>
                  {settings.showDeveloperCreditOnPrint !== false && (
                    <div className="pt-0.5">
                      <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar with BackButton */}
          <div className="print:hidden px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
            <BackButton
              onClick={onClose}
              label="Back to Student Profile"
              variant="default"
              ariaLabel="Return to student profile and management"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail & Branding Editor Modal */}
      <CardDetailEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        attendee={student}
        type="student"
        settings={settings}
      />

      {/* Embedded Scanner Modal for Testing */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode="attendance"
      />
    </>
  );
};
