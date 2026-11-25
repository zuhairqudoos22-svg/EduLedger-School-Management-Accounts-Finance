import React, { useEffect } from 'react';
import {
  Student,
  ExamResult,
  Exam,
  SchoolSettings,
} from '../../types';
import { StudentPerformanceHistory } from './StudentPerformanceHistory';
import { BackButton } from '../common/BackButton';
import { X, Award, TrendingUp } from 'lucide-react';

interface StudentPerformanceHistoryModalProps {
  isOpen: boolean;
  studentId: string | null;
  students: Student[];
  exams: Exam[];
  examResults: ExamResult[];
  settings: SchoolSettings;
  onClose: () => void;
  onViewResultCard?: (result: ExamResult) => void;
}

export const StudentPerformanceHistoryModal: React.FC<StudentPerformanceHistoryModalProps> = ({
  isOpen,
  studentId,
  students,
  exams,
  examResults,
  settings,
  onClose,
  onViewResultCard,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-50 dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Student Grade Trends &amp; Multi-Semester History
                </h3>
                <p className="text-[11px] text-slate-500">
                  Performance visualization over time
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <StudentPerformanceHistory
            students={students}
            exams={exams}
            examResults={examResults}
            settings={settings}
            selectedStudentId={studentId}
            onViewResultCard={result => {
              onClose();
              onViewResultCard?.(result);
            }}
          />
        </div>
      </div>
    </div>
  );
};
