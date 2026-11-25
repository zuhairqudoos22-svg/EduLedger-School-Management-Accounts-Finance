import React, { useState } from 'react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Pin,
  EyeOff,
} from 'lucide-react';
import { DashboardWidgetId, DASHBOARD_WIDGET_META } from '../../utils/dashboardLayout';

interface SortableWidgetWrapperProps {
  widgetId: DashboardWidgetId;
  index: number;
  totalCount: number;
  isAdmin: boolean;
  isCustomizeMode: boolean;
  isDragged: boolean;
  isDragOver: boolean;
  onDragStart: (id: DashboardWidgetId) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, id: DashboardWidgetId) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetId: DashboardWidgetId) => void;
  onDragEnd: () => void;
  onMoveUp: (id: DashboardWidgetId) => void;
  onMoveDown: (id: DashboardWidgetId) => void;
  onPinToTop: (id: DashboardWidgetId) => void;
  onHideWidget: (id: DashboardWidgetId) => void;
  children: React.ReactNode;
}

const CATEGORY_STYLE: Record<string, string> = {
  Metrics: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  Attendance: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  Finance: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Operations: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

export const SortableWidgetWrapper: React.FC<SortableWidgetWrapperProps> = ({
  widgetId,
  index,
  totalCount,
  isAdmin,
  isCustomizeMode,
  isDragged,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onPinToTop,
  onHideWidget,
  children,
}) => {
  const [quickGripArmed, setQuickGripArmed] = useState(false);
  const meta = DASHBOARD_WIDGET_META[widgetId];
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  const canDrag = isAdmin && (isCustomizeMode || quickGripArmed);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
    onDragStart(widgetId);
  };

  return (
    <div
      data-widget-id={widgetId}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={e => {
        if (!isAdmin) return;
        onDragOver(e, widgetId);
      }}
      onDrop={e => {
        if (!isAdmin) return;
        setQuickGripArmed(false);
        onDrop(e, widgetId);
      }}
      onDragEnd={() => {
        setQuickGripArmed(false);
        onDragEnd();
      }}
      className={`group/widget relative rounded-2xl transition-all duration-150 ${
        isDragged ? 'opacity-45 scale-[0.99]' : 'opacity-100'
      } ${
        isDragOver
          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 shadow-lg'
          : isCustomizeMode
          ? 'ring-1 ring-indigo-300/80 dark:ring-indigo-700/70 bg-slate-50/40 dark:bg-slate-900/40 p-2'
          : ''
      }`}
    >
      {/* Full Admin Reorder Header Bar when Customize Mode is Active */}
      {isAdmin && isCustomizeMode && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-xs flex flex-wrap items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0"
              title="Drag to reorder widget"
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-black text-slate-400 font-mono shrink-0">
              #{index + 1}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {meta.title}
            </span>
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                CATEGORY_STYLE[meta.category] || CATEGORY_STYLE.Operations
              }`}
            >
              {meta.category}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isFirst && (
              <button
                type="button"
                onClick={() => onPinToTop(widgetId)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
                title="Prioritize widget to top of dashboard"
              >
                <Pin className="w-3 h-3" />
                <span className="hidden sm:inline">Top</span>
              </button>
            )}
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMoveUp(widgetId)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
              title="Move widget up"
              aria-label={`Move ${meta.title} up`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMoveDown(widgetId)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
              title="Move widget down"
              aria-label={`Move ${meta.title} down`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onHideWidget(widgetId)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer"
              title="Hide widget from dashboard"
              aria-label={`Hide ${meta.title}`}
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Subtle Hover Drag Grip when Customize Mode is OFF (Admin quick-drag without clutter) */}
      {isAdmin && !isCustomizeMode && (
        <button
          type="button"
          onMouseEnter={() => setQuickGripArmed(true)}
          onMouseLeave={() => {
            if (!isDragged) setQuickGripArmed(false);
          }}
          onFocus={() => setQuickGripArmed(true)}
          onBlur={() => setQuickGripArmed(false)}
          onClick={() => onPinToTop(widgetId)}
          title={`Drag "${meta.title}" to reorder, or click to prioritize to top`}
          aria-label={`Drag or prioritize ${meta.title}`}
          className="opacity-0 group-hover/widget:opacity-100 focus:opacity-100 transition-opacity absolute -top-2.5 right-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3" />
          <span className="hidden sm:inline">Drag</span>
        </button>
      )}

      {/* Drop Target Helper Banner */}
      {isDragOver && !isDragged && (
        <div className="mb-2 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold text-center shadow-xs">
          Drop here to place above "{meta.title}"
        </div>
      )}

      {children}
    </div>
  );
};
