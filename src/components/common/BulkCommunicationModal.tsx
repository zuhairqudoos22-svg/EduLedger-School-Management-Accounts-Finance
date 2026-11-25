import React, { useState, useMemo } from 'react';
import { BackButton } from './BackButton';
import {
  X,
  MessageSquare,
  Send,
  Mail,
  Phone,
  Copy,
  Printer,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Check,
  Smartphone,
  ExternalLink,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { Student, Staff, SchoolSettings } from '../../types';
import { formatCurrency, getTodayDateString, formatDate } from '../../utils/formatters';

export interface RecipientContact {
  id: string;
  name: string;
  subMeta: string; // e.g., "Class 10-A • Roll #12" or "Mathematics • Faculty"
  guardianOrRole: string; // e.g. "Father: Mr. Ahmed" or "Senior Teacher"
  phone: string;
  email?: string;
  pendingDue?: number;
  type: 'student' | 'staff';
  rawStudent?: Student;
  rawStaff?: Staff;
}

interface BulkCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'student' | 'staff';
  selectedRecipients: Student[] | Staff[];
  allRecipients?: Student[] | Staff[];
  settings: SchoolSettings;
  defaultersMap?: Record<string, number>; // studentId -> pendingAmount
}

type ChannelType = 'whatsapp' | 'sms' | 'email' | 'circular';

interface MessageTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  category: 'general' | 'fee' | 'attendance' | 'urgent';
  target: 'all' | 'student' | 'staff';
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'general-notice',
    title: 'General Circular / Notice',
    category: 'general',
    target: 'all',
    subject: 'Important Notice from {school_name}',
    body: 'Dear {guardian},\n\nThis is an official notice from {school_name}. Please be informed that {details}.\n\nFor any queries, kindly reach out to the school administrative office.\n\nWarm regards,\nAdministration, {school_name}',
  },
  {
    id: 'fee-reminder',
    title: 'Fee Dues Reminder',
    category: 'fee',
    target: 'student',
    subject: 'Tuition Fee Payment Reminder for {name}',
    body: 'Dear {guardian},\n\nThis is a gentle reminder regarding tuition dues for your ward {name} ({class_or_dept}). The outstanding balance is {due_amount}.\n\nKindly clear the pending payment at the accounts office or via our online portal at your earliest convenience to avoid late surcharges.\n\nThank you for your cooperation.\nAccounts Office, {school_name}',
  },
  {
    id: 'absence-alert',
    title: 'Daily Absence Notification',
    category: 'attendance',
    target: 'student',
    subject: 'Absence Notice: {name} ({class_or_dept})',
    body: 'Dear {guardian},\n\nPlease note that your ward {name} ({class_or_dept}) has been marked ABSENT today, {date}, without prior written intimation.\n\nIf this was an unforeseen emergency or sickness, please submit a leave application to the class teacher upon return.\n\nPrincipal,\n{school_name}',
  },
  {
    id: 'emergency-weather',
    title: 'Emergency / Weather Advisory',
    category: 'urgent',
    target: 'all',
    subject: 'URGENT Advisory: {school_name} Closure',
    body: 'URGENT ADVISORY:\n\nDue to inclement weather and administrative advisory, {school_name} will remain closed on {date}. Regular physical classes will resume tomorrow unless notified otherwise.\n\nStay safe,\nManagement, {school_name}',
  },
  {
    id: 'staff-meeting',
    title: 'Faculty Coordination Meeting',
    category: 'general',
    target: 'staff',
    subject: 'Faculty Meeting Notice: {school_name}',
    body: 'Dear {name},\n\nA faculty and staff coordination session is scheduled for tomorrow at 2:30 PM in the Conference Hall. All team members from the {class_or_dept} department are requested to attend promptly with their weekly curriculum logs.\n\nRegards,\nAcademic Coordinator, {school_name}',
  },
  {
    id: 'result-published',
    title: 'Term Examination Results Published',
    category: 'general',
    target: 'student',
    subject: 'Term Examination Results Published for {name}',
    body: 'Dear {guardian},\n\nWe are pleased to inform you that the terminal examination results and progress report cards for {name} ({class_or_dept}) have now been finalized and published. You may collect the official signed report card from the school campus or review it on the portal.\n\nBest wishes,\nAcademic Wing, {school_name}',
  },
];

export const BulkCommunicationModal: React.FC<BulkCommunicationModalProps> = ({
  isOpen,
  onClose,
  entityType,
  selectedRecipients,
  allRecipients,
  settings,
  defaultersMap = {},
}) => {
  // 1. Prepare raw recipient records
  const initialContacts = useMemo<RecipientContact[]>(() => {
    const listToUse = selectedRecipients.length > 0 ? selectedRecipients : (allRecipients || []);

    if (entityType === 'student') {
      return (listToUse as Student[]).map(student => {
        const pending = defaultersMap[student.id] || 0;
        return {
          id: student.id,
          name: student.fullName,
          subMeta: `Class ${student.className}-${student.section} • Roll #${student.rollNo}`,
          guardianOrRole: student.guardianName
            ? `${student.guardianName} (${student.guardianRelation || 'Guardian'})`
            : 'Guardian',
          phone: student.contactNumber || '',
          email: student.email || '',
          pendingDue: pending,
          type: 'student',
          rawStudent: student,
        };
      });
    } else {
      return (listToUse as Staff[]).map(member => {
        return {
          id: member.id,
          name: member.fullName,
          subMeta: `${member.designation} • ${member.department}`,
          guardianOrRole: member.designation,
          phone: member.contactNumber || '',
          email: member.email || '',
          type: 'staff',
          rawStaff: member,
        };
      });
    }
  }, [selectedRecipients, allRecipients, entityType, defaultersMap]);

  // Selected contacts checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('whatsapp');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMissingPhone, setFilterMissingPhone] = useState(false);

  // Template state
  const availableTemplates = useMemo(() => {
    return DEFAULT_TEMPLATES.filter(
      t => t.target === 'all' || t.target === entityType
    );
  }, [entityType]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(availableTemplates[0]?.id || 'general-notice');
  const [customSubject, setCustomSubject] = useState(availableTemplates[0]?.subject || 'Official School Notice');
  const [customMessage, setCustomMessage] = useState(availableTemplates[0]?.body || '');
  const [customDetails, setCustomDetails] = useState('');

  // Queue state for WhatsApp step-through
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [dispatchedCount, setDispatchedCount] = useState<number>(0);

  // Synchronize selected IDs when modal opens or initial contacts change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialContacts.map(c => c.id));
      setCurrentQueueIndex(0);
      setDispatchedCount(0);
    }
  }, [isOpen, initialContacts]);

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = availableTemplates.find(t => t.id === templateId);
    if (tmpl) {
      setCustomSubject(tmpl.subject);
      setCustomMessage(tmpl.body);
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return initialContacts.filter(contact => {
      if (filterMissingPhone && !contact.phone.trim()) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(q) ||
        contact.subMeta.toLowerCase().includes(q) ||
        contact.guardianOrRole.toLowerCase().includes(q) ||
        contact.phone.includes(q) ||
        (contact.email && contact.email.toLowerCase().includes(q))
      );
    });
  }, [initialContacts, searchQuery, filterMissingPhone]);

  // Active targeted recipients
  const activeRecipients = useMemo(() => {
    return initialContacts.filter(c => selectedIds.includes(c.id));
  }, [initialContacts, selectedIds]);

  const validPhoneRecipients = useMemo(() => {
    return activeRecipients.filter(c => c.phone.trim().length >= 7);
  }, [activeRecipients]);

  const validEmailRecipients = useMemo(() => {
    return activeRecipients.filter(c => c.email && c.email.includes('@'));
  }, [activeRecipients]);

  // Dynamic message interpolator
  const interpolateMessage = (templateText: string, contact?: RecipientContact) => {
    if (!contact) return templateText;
    const dueFormatted = contact.pendingDue
      ? formatCurrency(contact.pendingDue, settings.currencySymbol)
      : formatCurrency(0, settings.currencySymbol);

    return templateText
      .replace(/{school_name}/g, settings.schoolName || 'EduLedger Academy')
      .replace(/{name}/g, contact.name)
      .replace(/{guardian}/g, contact.guardianOrRole)
      .replace(/{class_or_dept}/g, contact.subMeta.split('•')[0].trim())
      .replace(/{roll_or_code}/g, contact.rawStudent?.rollNo || contact.rawStaff?.employeeCode || '')
      .replace(/{due_amount}/g, dueFormatted)
      .replace(/{date}/g, formatDate(getTodayDateString()))
      .replace(/{details}/g, customDetails || 'the upcoming academic schedule');
  };

  // Preview target contact
  const previewContact = activeRecipients[currentQueueIndex] || activeRecipients[0] || initialContacts[0];
  const previewBody = useMemo(() => {
    return interpolateMessage(customMessage, previewContact);
  }, [customMessage, previewContact, customDetails, settings]);

  const previewSubject = useMemo(() => {
    return interpolateMessage(customSubject, previewContact);
  }, [customSubject, previewContact, settings]);

  // Action handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleToggleId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Clean phone number for WhatsApp / Tel
  const sanitizePhoneNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    // If standard 10-digit number without country code, you can use raw or assume country code
    return digits;
  };

  // 1. WhatsApp Actions
  const handleOpenCurrentWhatsApp = () => {
    if (!previewContact || !previewContact.phone) return;
    const cleanPhone = sanitizePhoneNumber(previewContact.phone);
    const msg = encodeURIComponent(interpolateMessage(customMessage, previewContact));
    const url = `https://wa.me/${cleanPhone}?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setDispatchedCount(prev => prev + 1);

    if (currentQueueIndex < activeRecipients.length - 1) {
      setCurrentQueueIndex(prev => prev + 1);
    }
  };

  // 2. SMS Action (native URI or copy list)
  const handleOpenSMSClient = () => {
    const phones = validPhoneRecipients.map(c => sanitizePhoneNumber(c.phone)).join(',');
    const text = encodeURIComponent(interpolateMessage(customMessage, previewContact));
    const smsUrl = `sms:${phones}?body=${text}`;
    window.location.href = smsUrl;
  };

  const handleCopyPhoneList = () => {
    const phones = validPhoneRecipients.map(c => c.phone.trim()).join(', ');
    navigator.clipboard.writeText(phones);
    setCopiedNotice(`Copied ${validPhoneRecipients.length} phone numbers to clipboard!`);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // 3. Email Actions
  const handleOpenEmailClient = () => {
    const emails = validEmailRecipients.map(c => c.email!).join(',');
    const subject = encodeURIComponent(previewSubject);
    const body = encodeURIComponent(previewBody);
    const mailtoUrl = `mailto:?bcc=${emails}&subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setDispatchedCount(validEmailRecipients.length);
  };

  const handleCopyEmailList = () => {
    const emails = validEmailRecipients.map(c => c.email!).join(', ');
    navigator.clipboard.writeText(emails);
    setCopiedNotice(`Copied ${validEmailRecipients.length} email addresses to clipboard!`);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // 4. Print Notice Slips (Circular)
  const handlePrintCirculars = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Bulk Communication Dispatch
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {entityType === 'student' ? 'Parent & Guardian Contacts' : 'Faculty & Staff Directory'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Trigger WhatsApp, SMS, or Email dispatches to {activeRecipients.length} selected{' '}
                {entityType === 'student' ? 'parents' : 'staff members'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copy Notification Toast */}
        {copiedNotice && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {copiedNotice}
            </span>
            <button onClick={() => setCopiedNotice(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Channel Selection Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveChannel('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>WhatsApp Queue ({validPhoneRecipients.length})</span>
          </button>

          <button
            onClick={() => setActiveChannel('sms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeChannel === 'sms'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Bulk SMS Gateway ({validPhoneRecipients.length})</span>
          </button>

          <button
            onClick={() => setActiveChannel('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeChannel === 'email'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Broadcast ({validEmailRecipients.length})</span>
          </button>

          <button
            onClick={() => setActiveChannel('circular')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeChannel === 'circular'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Notice Slips</span>
          </button>
        </div>

        {/* Modal Main Body (2 Columns) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selection & Message Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Template Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Choose Notice Template</span>
                </label>
                <span className="text-[11px] text-slate-400">Auto-injects recipient details</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableTemplates.map(tmpl => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold truncate">{tmpl.title}</p>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mt-0.5">
                        {tmpl.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject (used for Email, Circular, SMS Header) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notice Title / Subject
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                placeholder="e.g. Important Academic Advisory"
              />
            </div>

            {/* Optional Specific Details parameter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Specific Event / Notice Details (replaces {'{details}'})
              </label>
              <input
                type="text"
                value={customDetails}
                onChange={e => setCustomDetails(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                placeholder="e.g. Annual Sports Day on Monday, 15th October at 9:00 AM"
              />
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content
                </label>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>Available tags:</span>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    {'{name}'}
                  </code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    {'{guardian}'}
                  </code>
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    {'{due_amount}'}
                  </code>
                </div>
              </div>
              <textarea
                rows={6}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                className="w-full p-3 rounded-xl text-xs font-sans bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                placeholder="Compose announcement..."
              />
            </div>

            {/* Live Personalized Preview Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Live Personalized Preview
                  </span>
                  {previewContact && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      (for {previewContact.name})
                    </span>
                  )}
                </div>
                {previewContact && (
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {previewContact.phone || 'No phone'}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {previewBody}
              </div>
            </div>
          </div>

          {/* Right Column: Recipient Contact Directory & Channel Trigger (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Contacts Header & Search */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Recipients ({activeRecipients.length} of {initialContacts.length} selected)
                  </h4>
                  <p className="text-[11px] text-slate-500">Target contacts with stored phone numbers</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedIds.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, roll, phone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMissingPhone}
                    onChange={e => setFilterMissingPhone(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Only with phone number</span>
                </label>
                <span>{filteredContacts.length} matches</span>
              </div>
            </div>

            {/* Scrollable Recipient List */}
            <div className="flex-1 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No contacts found matching filter.
                </div>
              ) : (
                filteredContacts.map((contact, idx) => {
                  const isChecked = selectedIds.includes(contact.id);
                  const isCurrentInQueue = currentQueueIndex === idx;
                  const hasPhone = contact.phone && contact.phone.trim().length >= 7;

                  return (
                    <div
                      key={contact.id}
                      className={`p-2.5 flex items-center justify-between gap-3 text-xs transition ${
                        isCurrentInQueue
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleId(contact.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {contact.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {contact.guardianOrRole} • {contact.subMeta}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{hasPhone ? contact.phone : 'No Phone'}</span>
                        </div>
                        {contact.pendingDue && contact.pendingDue > 0 ? (
                          <span className="text-[10px] font-bold text-rose-600">
                            Due: {formatCurrency(contact.pendingDue, settings.currencySymbol)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Box based on Active Channel */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Dispatch Control
                </span>
                {dispatchedCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {dispatchedCount} Dispatched
                  </span>
                )}
              </div>

              {activeChannel === 'whatsapp' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Queue Progress:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      Recipient {activeRecipients.length > 0 ? currentQueueIndex + 1 : 0} of{' '}
                      {activeRecipients.length}
                    </span>
                  </div>

                  {previewContact && (
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                      <p className="font-bold text-white truncate">{previewContact.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Contact: {previewContact.phone || 'None'} ({previewContact.guardianOrRole})
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!previewContact || !previewContact.phone}
                      onClick={handleOpenCurrentWhatsApp}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Send WhatsApp &amp; Next</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentQueueIndex < activeRecipients.length - 1) {
                          setCurrentQueueIndex(prev => prev + 1);
                        } else {
                          setCurrentQueueIndex(0);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95"
                    >
                      <span>Skip / Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeChannel === 'sms' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300">
                    Export contact list for SMS gateway or launch device SMS client for{' '}
                    {validPhoneRecipients.length} recipients.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPhoneList}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Numbers List</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenSMSClient}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Launch SMS Client</span>
                    </button>
                  </div>
                </div>
              )}

              {activeChannel === 'email' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300">
                    Send personalized message via BCC to {validEmailRecipients.length} parents or staff
                    members with registered email addresses.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenEmailClient}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Launch Mail Client</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyEmailList}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Emails</span>
                    </button>
                  </div>
                </div>
              )}

              {activeChannel === 'circular' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-300">
                    Generate printable slips with school header for physical diary dispatch or staff
                    bulletin boards.
                  </p>
                  <button
                    type="button"
                    onClick={handlePrintCirculars}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span>Print Dispatch Notices</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              All message templates utilize verified parent and emergency contacts securely stored in
              offline IndexedDB.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Close Dispatcher
          </button>
        </div>
      </div>
    </div>
  );
};
