import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from 'recharts';
import { PieChart as PieChartIcon, Percent, TrendingUp, Layers, Tag as TagIcon, FolderTree } from 'lucide-react';
import { Expense, SchoolSettings, ExpenseTaxonomyConfig } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  getStoredTaxonomy,
  getCategoryColor,
  getTagColor,
  PRESET_COLOR_SWATCHES,
} from '../../utils/expenseTaxonomyStorage';

export type ExpensePieGroupBy = 'category' | 'subCategory' | 'tag';

interface ExpenseCategoryPieChartProps {
  expenses: Expense[];
  settings: SchoolSettings;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onSelectGranularItem?: (mode: ExpensePieGroupBy, value: string) => void;
  title?: string;
  taxonomy?: ExpenseTaxonomyConfig;
}

interface GranularPieData {
  name: string;
  shortName: string;
  parentCategory?: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

// Helper to get friendly shortened label
const getShortCategoryName = (category: string): string => {
  if (category.toLowerCase().includes('salar')) return 'Salaries';
  if (category.toLowerCase().includes('mainten')) return 'Maintenance';
  if (category.toLowerCase().includes('utilit')) return 'Utilities';
  if (category.toLowerCase().includes('suppl')) return 'Supplies';
  if (category.toLowerCase().includes('softw') || category.toLowerCase().includes('it')) return 'IT';
  if (category.toLowerCase().includes('transp') || category.toLowerCase().includes('fuel')) return 'Transport';
  if (category.toLowerCase().includes('lab') || category.toLowerCase().includes('sport')) return 'Lab & Sports';
  if (category.toLowerCase().includes('market') || category.toLowerCase().includes('advert')) return 'Marketing';
  if (category.toLowerCase().includes('exam') || category.toLowerCase().includes('event')) return 'Events';
  return category;
};

export const ExpenseCategoryPieChart: React.FC<ExpenseCategoryPieChartProps> = ({
  expenses,
  settings,
  selectedCategory = 'All',
  onSelectCategory,
  onSelectGranularItem,
  title = 'Expenditure Distribution',
  taxonomy,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isDonut, setIsDonut] = useState<boolean>(true);
  const [groupBy, setGroupBy] = useState<ExpensePieGroupBy>('category');

  const currentTaxonomy = useMemo(() => taxonomy || getStoredTaxonomy(), [taxonomy]);

  // Aggregate totals according to current groupBy mode
  const { chartData, totalAmount, totalCount } = useMemo(() => {
    let total = 0;
    let count = 0;

    if (groupBy === 'category') {
      const map: Record<string, { total: number; count: number }> = {};
      for (const exp of expenses) {
        const cat = exp.category || 'Miscellaneous';
        if (!map[cat]) {
          map[cat] = { total: 0, count: 0 };
        }
        map[cat].total += exp.amount;
        map[cat].count += 1;
        total += exp.amount;
        count += 1;
      }

      const items: GranularPieData[] = Object.entries(map)
        .map(([name, data]) => {
          const percentage = total > 0 ? (data.total / total) * 100 : 0;
          const color = getCategoryColor(name, currentTaxonomy);
          return {
            name,
            shortName: getShortCategoryName(name),
            value: data.total,
            count: data.count,
            percentage,
            color,
          };
        })
        .sort((a, b) => b.value - a.value);

      return { chartData: items, totalAmount: total, totalCount: count };
    }

    if (groupBy === 'subCategory') {
      const map: Record<string, { total: number; count: number; parentCategory: string }> = {};
      for (const exp of expenses) {
        const sub = exp.subCategory?.trim() || `${getShortCategoryName(exp.category)} (General)`;
        if (!map[sub]) {
          map[sub] = { total: 0, count: 0, parentCategory: exp.category };
        }
        map[sub].total += exp.amount;
        map[sub].count += 1;
        total += exp.amount;
        count += 1;
      }

      const items: GranularPieData[] = Object.entries(map)
        .map(([subName, data], idx) => {
          const percentage = total > 0 ? (data.total / total) * 100 : 0;
          // Use parent category color or palette variation
          const baseColor = getCategoryColor(data.parentCategory, currentTaxonomy);
          const fallbackColor = PRESET_COLOR_SWATCHES[idx % PRESET_COLOR_SWATCHES.length];
          return {
            name: subName,
            shortName: subName.length > 22 ? `${subName.slice(0, 20)}...` : subName,
            parentCategory: data.parentCategory,
            value: data.total,
            count: data.count,
            percentage,
            color: idx % 2 === 0 ? baseColor : fallbackColor,
          };
        })
        .sort((a, b) => b.value - a.value);

      return { chartData: items, totalAmount: total, totalCount: count };
    }

    // Group By Tag
    const tagMap: Record<string, { total: number; count: number }> = {};
    for (const exp of expenses) {
      total += exp.amount;
      count += 1;
      if (exp.tags && exp.tags.length > 0) {
        for (const tag of exp.tags) {
          const clean = tag.replace(/^#+/, '').trim();
          if (!tagMap[clean]) {
            tagMap[clean] = { total: 0, count: 0 };
          }
          tagMap[clean].total += exp.amount;
          tagMap[clean].count += 1;
        }
      } else {
        if (!tagMap['Untagged']) {
          tagMap['Untagged'] = { total: 0, count: 0 };
        }
        tagMap['Untagged'].total += exp.amount;
        tagMap['Untagged'].count += 1;
      }
    }

    // Total of all tag slices (can exceed sum if multi-tagged, normalized against tag totals)
    const tagSum = Object.values(tagMap).reduce((s, d) => s + d.total, 0);

    const items: GranularPieData[] = Object.entries(tagMap)
      .map(([tagName, data]) => {
        const percentage = tagSum > 0 ? (data.total / tagSum) * 100 : 0;
        const color =
          tagName === 'Untagged' ? '#94A3B8' : getTagColor(tagName, currentTaxonomy);
        return {
          name: tagName === 'Untagged' ? 'Untagged' : `#${tagName}`,
          shortName: tagName === 'Untagged' ? 'Untagged' : `#${tagName}`,
          value: data.total,
          count: data.count,
          percentage,
          color,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData: items, totalAmount: total, totalCount: count };
  }, [expenses, groupBy, currentTaxonomy]);

  // Active slice details for dynamic center display
  const activeItem = activeIndex !== null && chartData[activeIndex] ? chartData[activeIndex] : null;

  // Custom Sector render for active (hovered) slice
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          fillOpacity={0.25}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      </g>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data: GranularPieData = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs z-50 pointer-events-none animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-slate-100">{data.name}</span>
          </div>
          {data.parentCategory && (
            <p className="text-[10px] text-slate-400 mb-1">
              Category: <strong className="text-slate-300">{data.parentCategory}</strong>
            </p>
          )}
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Expenditure:</span>
              <span className="font-bold text-white">
                {formatCurrency(data.value, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Share:</span>
              <span className="font-bold text-emerald-400">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Vouchers:</span>
              <span className="text-slate-200">
                {data.count} {data.count === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSliceClick = (entry: GranularPieData) => {
    if (onSelectGranularItem) {
      onSelectGranularItem(groupBy, entry.name);
    } else if (onSelectCategory) {
      if (groupBy === 'category') {
        onSelectCategory(selectedCategory === entry.name ? 'All' : entry.name);
      } else if (groupBy === 'subCategory' && entry.parentCategory) {
        onSelectCategory(selectedCategory === entry.parentCategory ? 'All' : entry.parentCategory);
      }
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-[10px] text-slate-400">
              {chartData.length} active {chartData.length === 1 ? 'slice' : 'slices'} • Grouped by{' '}
              <strong className="text-slate-700 dark:text-slate-300 capitalize">{groupBy}</strong>
            </p>
          </div>
        </div>

        {/* View mode toggle: Group By & Donut vs Pie */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity Group By Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setGroupBy('category');
                setActiveIndex(null);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                groupBy === 'category'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Group expenditure by primary category"
            >
              <FolderTree className="w-3 h-3" />
              <span>Category</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupBy('subCategory');
                setActiveIndex(null);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                groupBy === 'subCategory'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Group expenditure by personal sub-categories"
            >
              <Layers className="w-3 h-3" />
              <span>Sub-Category</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupBy('tag');
                setActiveIndex(null);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition cursor-pointer ${
                groupBy === 'tag'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-extrabold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Group expenditure by analytical custom tags"
            >
              <TagIcon className="w-3 h-3" />
              <span>Tags</span>
            </button>
          </div>

          {/* Donut vs Pie Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setIsDonut(true)}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                isDonut
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Donut
            </button>
            <button
              type="button"
              onClick={() => setIsDonut(false)}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                !isDonut
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pie
            </button>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center p-4">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No expenses recorded
          </p>
          <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
            Adjust your filter criteria or record a new expense to see the distribution.
          </p>
        </div>
      ) : (
        <div className="py-2">
          <div className="relative h-52 sm:h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isDonut ? 52 : 0}
                  outerRadius={isDonut ? 78 : 80}
                  paddingAngle={isDonut ? 3 : 1}
                  dataKey="value"
                  {...({
                    activeIndex: activeIndex !== null ? activeIndex : undefined,
                    activeShape: renderActiveShape,
                  } as any)}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(entry: any) => handleSliceClick(entry)}
                  cursor="pointer"
                  animationDuration={700}
                >
                  {chartData.map((entry, index) => {
                    const isSelected =
                      selectedCategory === entry.name ||
                      (entry.parentCategory && selectedCategory === entry.parentCategory);
                    return (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        stroke={isSelected ? '#1E1B4B' : 'transparent'}
                        strokeWidth={isSelected ? 2.5 : 0}
                        opacity={selectedCategory === 'All' || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>

            {/* Centered Donut Label */}
            {isDonut && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {activeItem ? (
                  <div className="animate-in fade-in zoom-in-95 duration-150 max-w-[120px]">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 line-clamp-1 block">
                      {activeItem.shortName}
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white leading-tight block">
                      {formatCurrency(activeItem.value, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {activeItem.percentage.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="max-w-[120px]">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Exp
                    </span>
                    <span className="text-sm font-black font-mono text-red-600 dark:text-red-400 leading-tight block">
                      {formatCurrency(totalAmount, settings.currencySymbol)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {totalCount} vouchers
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Legend Pills */}
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
            {chartData.map((item, idx) => {
              const isSelected =
                selectedCategory === item.name ||
                (item.parentCategory && selectedCategory === item.parentCategory);

              return (
                <div
                  key={`${item.name}-${idx}`}
                  onClick={() => handleSliceClick(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-500/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  title={`Click to filter vouchers by ${item.name}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <span
                        className={`truncate text-[11px] font-medium block ${
                          isSelected
                            ? 'font-bold text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.parentCategory && groupBy === 'subCategory' && (
                        <span className="text-[9px] text-slate-400 block truncate">
                          in {item.parentCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.value, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 min-w-[40px] text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
        <span>Click any slice to filter ledger records</span>
        <span className="font-medium text-indigo-600 dark:text-indigo-400">
          Mode: {groupBy === 'category' ? 'Top Category' : groupBy === 'subCategory' ? 'Personal Sub-Categories' : 'Custom Tags'}
        </span>
      </div>
    </div>
  );
};
