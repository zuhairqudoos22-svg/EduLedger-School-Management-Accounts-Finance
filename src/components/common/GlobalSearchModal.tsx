import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { Search, X, GraduationCap, Briefcase, DollarSign, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    students,
    staff,
    settings,
    setActiveTab,
    setSelectedStudentIdForDetail,
    setSelectedStaffIdForDetail,
    getStudentPendingFee,
    setIdCardStudent,
  } = useSchool();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // Close handler: reset search state and notify parent
  const handleClose = useCallback(() => {
    setQuery('');
    setActiveIndex(-1);
    onClose();
  }, [onClose]);

  // Clean query string
  const cleanQuery = query.trim().toLowerCase();

  const filteredStudents = useMemo(() => {
    if (!cleanQuery) return [];
    return students.filter(
      s =>
        s.fullName.toLowerCase().includes(cleanQuery) ||
        s.rollNo.toLowerCase().includes(cleanQuery) ||
        s.className.toLowerCase().includes(cleanQuery) ||
        s.guardianName.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery, students]);

  const filteredStaff = useMemo(() => {
    if (!cleanQuery || !isAdmin) return [];
    return staff.filter(
      st =>
        st.fullName.toLowerCase().includes(cleanQuery) ||
        st.employeeCode.toLowerCase().includes(cleanQuery) ||
        st.designation.toLowerCase().includes(cleanQuery) ||
        st.department.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery, isAdmin, staff]);

  // Flattened results for keyboard navigation
  const flatResults = useMemo(() => {
    const list: Array<
      | { type: 'student'; id: string; student: (typeof filteredStudents)[0] }
      | { type: 'staff'; id: string; staff: (typeof filteredStaff)[0] }
    > = [];
    filteredStudents.forEach(s => list.push({ type: 'student', id: s.id, student: s }));
    filteredStaff.forEach(st => list.push({ type: 'staff', id: st.id, staff: st }));
    return list;
  }, [filteredStudents, filteredStaff]);

  // Reset or adjust active index when results change
  useEffect(() => {
    if (flatResults.length > 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [flatResults.length]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = document.getElementById(`search-result-item-${activeIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Body scroll lock, focus capture, and focus restoration to trigger element
  useEffect(() => {
    if (isOpen) {
      // Record currently focused element before modal takes focus
      triggerElementRef.current = document.activeElement as HTMLElement | null;

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');

      // Autofocus input
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

      return () => {
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('modal-open');

        // Restore focus to the element that triggered the modal
        if (
          triggerElementRef.current &&
          typeof triggerElementRef.current.focus === 'function'
        ) {
          requestAnimationFrame(() => {
            triggerElementRef.current?.focus();
          });
        }
      };
    } else {
      // Clear state when closed
      setQuery('');
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // 1. Dedicated Global Document Escape Key Listener
  // Attached globally via document rather than the internal input; cleaned up on unmount or close
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleGlobalEscape, true);

    return () => {
      document.removeEventListener('keydown', handleGlobalEscape, true);
    };
  }, [isOpen, handleClose]);

  // 2. Modal Focus Trap and Navigation Listener (Tab trap, Arrow Up/Down, Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleModalNavigation = (e: KeyboardEvent) => {
      // Tab key: trap focus inside modal
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        return;
      }

      // Arrow Down navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (flatResults.length === 0) return;
        setActiveIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
        return;
      }

      // Arrow Up navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (flatResults.length === 0) return;
        setActiveIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
        return;
      }

      // Enter key: activate selected result
      if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          e.preventDefault();
          const selected = flatResults[activeIndex];
          if (selected.type === 'student') {
            handleSelectStudent(selected.id);
          } else {
            handleSelectStaff(selected.id);
          }
        }
      }
    };

    document.addEventListener('keydown', handleModalNavigation, true);
    return () => {
      document.removeEventListener('keydown', handleModalNavigation, true);
    };
  }, [isOpen, flatResults, activeIndex]);

  // Mobile Back Button Support via popstate
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modal: 'global-search' }, '');

    const handlePopState = () => {
      handleClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal === 'global-search') {
        window.history.back();
      }
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSelectStudent = (studentId: string, action?: 'fee' | 'id') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    handleClose();

    if (action === 'fee') {
      setActiveTab('fee-collection');
    } else if (action === 'id') {
      setIdCardStudent(student);
    } else {
      setSelectedStudentIdForDetail(studentId);
      setActiveTab('students');
    }
  };

  const handleSelectStaff = (staffId: string) => {
    handleClose();
    setSelectedStaffIdForDetail(staffId);
    setActiveTab('hr-management');
  };

  // Click on blurred backdrop overlay outside modal card
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-24 animate-in fade-in"
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global Search"
        className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('header.searchPlaceholder', 'Search students or staff by name, Roll No, ID, or class...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
            aria-label="Search students or staff"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="Clear search text"
              aria-label="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Interactive ESC Badge Button */}
          <button
            type="button"
            onClick={handleClose}
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            title="Click or press ESC to close"
            aria-label="Close search (ESC)"
          >
            ESC
          </button>

          {/* Visible Close (X) Button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close search dialog"
            aria-label="Close search dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {!query && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type at least one character to search across students, staff, and account records.
            </div>
          )}

          {query && filteredStudents.length === 0 && filteredStaff.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching students or staff members found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Students Results */}
          {filteredStudents.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Students ({filteredStudents.length})</span>
              </p>
              <div className="space-y-1">
                {filteredStudents.map((student, sIdx) => {
                  const globalIdx = sIdx;
                  const isHighlighted = activeIndex === globalIdx;
                  const pendingFee = getStudentPendingFee(student);
                  return (
                    <div
                      key={student.id}
                      id={`search-result-item-${globalIdx}`}
                      className={`group flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer border ${
                        isHighlighted
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 ring-1 ring-indigo-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                      onClick={() => handleSelectStudent(student.id)}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {student.fullName}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {student.rollNo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {student.className} - Sec {student.section} • Guardian: {student.guardianName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {pendingFee > 0 && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                            Due: {formatCurrency(pendingFee, settings.currencySymbol)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectStudent(student.id, 'fee');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Fee</span>
                        </button>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Staff Results */}
          {filteredStaff.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>Staff ({filteredStaff.length})</span>
              </p>
              <div className="space-y-1">
                {filteredStaff.map((member, mIdx) => {
                  const globalIdx = filteredStudents.length + mIdx;
                  const isHighlighted = activeIndex === globalIdx;
                  return (
                    <div
                      key={member.id}
                      id={`search-result-item-${globalIdx}`}
                      className={`group flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer border ${
                        isHighlighted
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 ring-1 ring-indigo-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                      onClick={() => handleSelectStaff(member.id)}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {member.fullName}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {member.employeeCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {member.designation} • {member.department}
                          </p>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
