import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Download,
  X,
  Send,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  User,
  Phone,
  FileText,
  Users,
} from 'lucide-react';
import { SchoolSettings, FeePayment, Student, Staff } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadFeeVouchersPdf, downloadPaySlipsPdf, PaySlipData } from '../../utils/voucherAndPayslipPdf';

export interface ShareRecipientItem {
  id: string;
  name: string;
  role: 'student' | 'employee';
  subheading: string; // e.g., "Grade 5 — Section A" or "Senior Lecturer • Science"
  phone: string;
  email: string;
  period: string; // e.g. "September 2026"
  amount: number;
  voucherData?: FeePayment;
  studentData?: Student;
  paySlipData?: PaySlipData;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareMode: 'whatsapp' | 'email';
  documentType: 'fee_voucher' | 'pay_slip';
  items: ShareRecipientItem[];
  settings: SchoolSettings;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareMode,
  documentType,
  items,
  settings,
}) => {
  if (!isOpen || items.length === 0) return null;

  const isSingle = items.length === 1;
  const singleItem = items[0];

  // Selected active item index for multi-view
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const currentItem = isSingle ? singleItem : items[activeItemIndex] || items[0];

  // Editable fields for the active recipient
  const [recipientPhone, setRecipientPhone] = useState(currentItem.phone || '');
  const [recipientEmail, setRecipientEmail] = useState(currentItem.email || '');

  // Default subject line
  const defaultSubject =
    documentType === 'fee_voucher'
      ? `Fee Voucher - ${currentItem.name} - ${currentItem.period || 'Academic Session'}`
      : `Salary Pay Slip - ${currentItem.name} - ${currentItem.period || 'Salary Month'}`;

  const [emailSubject, setEmailSubject] = useState(defaultSubject);

  // Default message text matching user prompt specifications
  const defaultMessage =
    documentType === 'fee_voucher'
      ? `Dear Parent,\n\nPlease find attached the official fee voucher for ${currentItem.name}, ${currentItem.subheading}, for ${currentItem.period || 'Current Term'}.\n\nTotal Payable Amount: ${formatCurrency(currentItem.amount, settings.currencySymbol)}\nStatus: Verified\nInstitution: ${settings.schoolName || 'EduLedger Academy'}\n\nThank you.\nFinance & Bursar Department`
      : `Dear ${currentItem.name},\n\nPlease find attached your official monthly salary pay slip for ${currentItem.period || 'Current Month'}.\n\nNet Salary Disbursed: ${formatCurrency(currentItem.amount, settings.currencySymbol)}\nDesignation: ${currentItem.subheading}\nInstitution: ${settings.schoolName || 'EduLedger Academy'}\n\nThank you for your service.\nHuman Resources Directorate`;

  const [messageBody, setMessageBody] = useState(defaultMessage);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [sentStatuses, setSentStatuses] = useState<Record<string, boolean>>({});

  // When switching active item in multi mode
  const handleSelectActiveItem = (idx: number) => {
    setActiveItemIndex(idx);
    const item = items[idx];
    setRecipientPhone(item.phone || '');
    setRecipientEmail(item.email || '');

    const newSubj =
      documentType === 'fee_voucher'
        ? `Fee Voucher - ${item.name} - ${item.period || 'Academic Session'}`
        : `Salary Pay Slip - ${item.name} - ${item.period || 'Salary Month'}`;
    setEmailSubject(newSubj);

    const newMsg =
      documentType === 'fee_voucher'
        ? `Dear Parent,\n\nPlease find attached the official fee voucher for ${item.name}, ${item.subheading}, for ${item.period || 'Current Term'}.\n\nTotal Payable Amount: ${formatCurrency(item.amount, settings.currencySymbol)}\nStatus: Verified\nInstitution: ${settings.schoolName || 'EduLedger Academy'}\n\nThank you.\nFinance & Bursar Department`
        : `Dear ${item.name},\n\nPlease find attached your official monthly salary pay slip for ${item.period || 'Current Month'}.\n\nNet Salary Disbursed: ${formatCurrency(item.amount, settings.currencySymbol)}\nDesignation: ${item.subheading}\nInstitution: ${settings.schoolName || 'EduLedger Academy'}\n\nThank you for your service.\nHuman Resources Directorate`;
    setMessageBody(newMsg);
  };

  // Helper to clean phone numbers (remove spaces, dashes, ensure valid wa.me format)
  const formatPhoneForWhatsApp = (rawPhone: string): string => {
    let clean = rawPhone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) {
      clean = clean.slice(1);
    } else if (clean.startsWith('0')) {
      // Common Pakistani / local mobile prefix 03xx -> 923xx
      clean = '92' + clean.slice(1);
    }
    return clean;
  };

  // Trigger PDF download for the current item
  const handleDownloadCurrentPdf = () => {
    if (documentType === 'fee_voucher' && currentItem.voucherData) {
      downloadFeeVouchersPdf(
        [currentItem.voucherData],
        settings,
        currentItem.studentData ? { [currentItem.studentData.id]: currentItem.studentData } : {},
        { layout: '2-per-page' }
      );
    } else if (documentType === 'pay_slip' && currentItem.paySlipData) {
      downloadPaySlipsPdf([currentItem.paySlipData], settings, { layout: '2-per-page' });
    }
  };

  // Trigger batch download for all items
  const handleDownloadAllPdfs = () => {
    if (documentType === 'fee_voucher') {
      const vouchers = items.map(i => i.voucherData).filter(Boolean) as FeePayment[];
      const studentMap: Record<string, Student> = {};
      items.forEach(i => {
        if (i.studentData) studentMap[i.studentData.id] = i.studentData;
      });
      downloadFeeVouchersPdf(vouchers, settings, studentMap, { layout: '2-per-page' });
    } else if (documentType === 'pay_slip') {
      const paySlips = items.map(i => i.paySlipData).filter(Boolean) as PaySlipData[];
      downloadPaySlipsPdf(paySlips, settings, { layout: '2-per-page' });
    }
  };

  // Launch WhatsApp
  const handleOpenWhatsApp = () => {
    const cleanPhone = formatPhoneForWhatsApp(recipientPhone);
    const encoded = encodeURIComponent(messageBody);

    // Also download the PDF so the user has the file ready to drag-and-drop into WhatsApp!
    handleDownloadCurrentPdf();

    setSentStatuses(prev => ({ ...prev, [currentItem.id]: true }));

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank');
  };

  // Launch Email Client
  const handleOpenEmail = () => {
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(messageBody);

    // Also download the PDF so the user can easily attach it to the opened email draft
    handleDownloadCurrentPdf();

    setSentStatuses(prev => ({ ...prev, [currentItem.id]: true }));

    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageBody);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white ${
                shareMode === 'whatsapp'
                  ? 'bg-emerald-600 shadow-emerald-600/20'
                  : 'bg-indigo-600 shadow-indigo-600/20'
              }`}
            >
              {shareMode === 'whatsapp' ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {shareMode === 'whatsapp' ? 'Send via WhatsApp' : 'Send via Email'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {documentType === 'fee_voucher' ? 'Fee Voucher' : 'Salary Pay Slip'}
                </span>
                {!isSingle && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {items.length} Recipients
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {shareMode === 'whatsapp'
                  ? 'Generate PDF voucher and launch WhatsApp chat with pre-filled message'
                  : 'Prepare email dispatch with pre-filled subject and downloaded PDF attachment'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-recipient list selector if more than 1 item */}
        {!isSingle && (
          <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Recipient {activeItemIndex + 1} of {items.length}:
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
              {items.map((item, idx) => {
                const isSent = sentStatuses[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectActiveItem(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      activeItemIndex === idx
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isSent
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSent && <Check className="w-3 h-3 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleDownloadAllPdfs}
              className="shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download All PDFs ({items.length})</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Active Recipient Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {currentItem.name}
                </span>
                <p className="text-[11px] text-slate-500">{currentItem.subheading}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Amount</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm text-indigo-600">
                  {formatCurrency(currentItem.amount, settings.currencySymbol)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCurrentPdf}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                title="Download this document as PDF"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Contact Input (Phone or Email) */}
          {shareMode === 'whatsapp' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp / Mobile Number
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Include country code (e.g. +92 or 03xx)
                </span>
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Recipient Email Address
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Student / Parent or Employee Email
                  </span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Editable Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Message Body (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedNotice ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={6}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 custom-scrollbar leading-relaxed"
            />
          </div>

          {/* Attachment Instruction Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 flex items-start gap-3 text-xs">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Automated Attachment Workflow:
              </p>
              <p>
                Clicking <strong>{shareMode === 'whatsapp' ? 'Send on WhatsApp' : 'Open in Email Client'}</strong> automatically downloads the official PDF document to your device and opens your messaging client with the pre-filled message, allowing you to drag or attach the PDF instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCurrentPdf}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PDF Locally</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50"
            >
              Close
            </button>

            {shareMode === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send on WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEmail}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Open in Email Client</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
