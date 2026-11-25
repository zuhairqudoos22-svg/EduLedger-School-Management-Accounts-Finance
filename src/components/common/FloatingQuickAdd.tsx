import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  X,
  UserPlus,
  Receipt,
  CalendarCheck,
  TrendingDown,
  Briefcase,
  FileBadge,
} from 'lucide-react';

export const FloatingQuickAdd: React.FC = () => {
  const { setActiveTab } = useSchool();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'student',
      label: 'New Student Admission',
      icon: UserPlus,
      tab: 'students' as const,
      color: 'bg-blue-600 hover:bg-blue-500 text-white',
      adminOnly: true,
    },
    {
      id: 'fee',
      label: 'Collect Fee',
      icon: Receipt,
      tab: 'fee-collection' as const,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
    {
      id: 'attendance',
      label: 'Mark Attendance',
      icon: CalendarCheck,
      tab: 'student-attendance' as const,
      color: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    {
      id: 'expense',
      label: 'Add Expense',
      icon: TrendingDown,
      tab: 'expenses' as const,
      color: 'bg-rose-600 hover:bg-rose-500 text-white',
      adminOnly: true,
    },
    {
      id: 'staff-leave',
      label: 'Apply Leave / Staff',
      icon: Briefcase,
      tab: 'hr-management' as const,
      color: 'bg-purple-600 hover:bg-purple-500 text-white',
      adminOnly: true,
    },
  ];

  const allowedActions = actions.filter(a => !a.adminOnly || isAdmin);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden">
      {/* Action Popover Menu */}
      {isOpen && (
        <div className="mb-3 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {allowedActions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setActiveTab(act.tab);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer ${act.color}`}
              >
                <span>{act.label}</span>
                <div className="p-1 rounded-md bg-white/20">
                  <Icon className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Floating Action Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Close Quick Add' : 'Quick Add (+) Actions'}
        className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-slate-900 text-white rotate-45 ring-4 ring-slate-900/20'
            : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white ring-4 ring-indigo-500/20 hover:shadow-indigo-500/30'
        }`}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
