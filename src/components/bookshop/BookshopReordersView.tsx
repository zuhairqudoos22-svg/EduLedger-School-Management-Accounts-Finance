import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BookItem, BookSupplier } from '../../types';
import {
  AlertTriangle,
  AlertCircle,
  RotateCw,
  Printer,
  Sliders,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Truck,
  CheckCircle2,
  FileText,
  Search,
  BookOpen,
  X,
} from 'lucide-react';

interface BookshopReordersViewProps {
  lowStockThreshold: number;
  onUpdateThreshold: (val: number) => void;
  onOpenRestockForBook: (book: BookItem) => void;
  onNavigateToSuppliers?: () => void;
}

export const BookshopReordersView: React.FC<BookshopReordersViewProps> = ({
  lowStockThreshold,
  onUpdateThreshold,
  onOpenRestockForBook,
  onNavigateToSuppliers,
}) => {
  const { books, bookSuppliers, settings } = useSchool();
  const currencyLabel = settings.currencyCode || 'PKR';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  // Default target safety stock level per title
  const targetStockMultiplier = 3; // e.g., replenish up to 3x the threshold

  // Identify all books at or below threshold
  const lowStockBooks = useMemo(() => {
    return books.filter(b => b.stock <= lowStockThreshold);
  }, [books, lowStockThreshold]);

  // Out of stock books
  const outOfStockBooks = useMemo(() => {
    return books.filter(b => b.stock === 0);
  }, [books]);

  // Calculations for dashboard summary
  const summaryMetrics = useMemo(() => {
    let totalDeficitUnits = 0;
    let totalEstimatedCost = 0;

    lowStockBooks.forEach(b => {
      const targetStock = Math.max(lowStockThreshold * targetStockMultiplier, 20);
      const deficit = Math.max(0, targetStock - b.stock);
      totalDeficitUnits += deficit;
      const unitCost = b.costPrice || Math.round(b.price * 0.7);
      totalEstimatedCost += deficit * unitCost;
    });

    return {
      totalDeficitUnits,
      totalEstimatedCost,
    };
  }, [lowStockBooks, lowStockThreshold]);

  // Filtered low-stock books
  const filteredLowStock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return lowStockBooks.filter(b => {
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.authorPublisher.toLowerCase().includes(q) ||
        b.className.toLowerCase().includes(q) ||
        (b.subject && b.subject.toLowerCase().includes(q)) ||
        (b.supplierName && b.supplierName.toLowerCase().includes(q));

      const matchesSupplier =
        selectedSupplierFilter === 'all' ||
        (b.supplierName &&
          b.supplierName.toLowerCase().includes(selectedSupplierFilter.toLowerCase())) ||
        b.authorPublisher.toLowerCase().includes(selectedSupplierFilter.toLowerCase());

      return matchesSearch && matchesSupplier;
    });
  }, [lowStockBooks, searchQuery, selectedSupplierFilter]);

  // Find linked supplier for a book
  const getSupplierForBook = (book: BookItem): BookSupplier | undefined => {
    if (book.supplierId) {
      const found = bookSuppliers.find(s => s.id === book.supplierId);
      if (found) return found;
    }
    return bookSuppliers.find(
      s =>
        s.name.toLowerCase().includes(book.authorPublisher.toLowerCase()) ||
        book.authorPublisher.toLowerCase().includes(s.name.toLowerCase()) ||
        (book.supplierName && s.name.toLowerCase().includes(book.supplierName.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <span>Low Stock &amp; Reorder Management</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated replenishment flagging and procurement forecasting based on your safety threshold.
          </p>
        </div>

        {/* Action: Generate Purchase Requisition / PO */}
        {lowStockBooks.length > 0 && (
          <button
            type="button"
            onClick={() => setIsPoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition shadow-sm cursor-pointer shrink-0"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Generate Reorder Slip / PO</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* DASHBOARD SUMMARY CARDS                                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Items Below Threshold */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Low Stock Items
            </span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {lowStockBooks.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Titles with stock &le; <strong className="text-slate-700 dark:text-slate-300 font-mono">{lowStockThreshold} units</strong>
          </p>
        </div>

        {/* Card 2: Out of Stock Immediately */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Out of Stock (Zero)
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {outOfStockBooks.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Halt sales until restocked</p>
        </div>

        {/* Card 3: Total Units Deficit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recommended Units
            </span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {summaryMetrics.totalDeficitUnits}
          </p>
          <p className="text-xs text-slate-500 mt-1">Units needed to reach safe buffer</p>
        </div>

        {/* Card 4: Estimated Procurement Capital */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Est. Reorder Budget
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {currencyLabel} {summaryMetrics.totalEstimatedCost.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Estimated vendor purchasing cost</p>
        </div>
      </div>

      {/* Threshold Configurator & Sensitivity Bar */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 text-amber-600">
            <Sliders className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              Adjust Low-Stock Alert Sensitivity Threshold
            </span>
            <span className="text-slate-500">
              Any item with quantity at or below this value triggers automated restock warnings.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0">
          <span className="text-slate-500 font-medium">Reorder Alert Level:</span>
          <button
            type="button"
            onClick={() => onUpdateThreshold(Math.max(1, lowStockThreshold - 1))}
            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max="999"
            value={lowStockThreshold}
            onChange={e => onUpdateThreshold(Number(e.target.value) || 1)}
            className="w-12 px-1 text-center font-bold font-mono text-slate-900 dark:text-white text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onUpdateThreshold(lowStockThreshold + 1)}
            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-slate-700 dark:text-slate-300"
          >
            +
          </button>
          <span className="text-slate-400">units</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Reorder Inventory List ({filteredLowStock.length} items flagged)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Supplier Filter */}
          <select
            value={selectedSupplierFilter}
            onChange={e => setSelectedSupplierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Vendors</option>
            {bookSuppliers.map(s => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Search title, class, vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reorder Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Flagged Book Title</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4 text-center">Threshold</th>
                <th className="py-3 px-4 text-center">Suggested Order</th>
                <th className="py-3 px-4">Assigned Supplier</th>
                <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                <th className="py-3 px-4 text-right">Est. Total Cost</th>
                <th className="py-3 px-4 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredLowStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                      All inventory stock levels are healthy!
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No items are currently at or below the threshold of {lowStockThreshold} units.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLowStock.map(book => {
                  const targetStock = Math.max(lowStockThreshold * targetStockMultiplier, 20);
                  const suggestedQty = Math.max(10, targetStock - book.stock);
                  const unitCost = book.costPrice || Math.round(book.price * 0.7);
                  const totalEst = suggestedQty * unitCost;
                  const supplier = getSupplierForBook(book);

                  return (
                    <tr
                      key={book.id}
                      className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition"
                    >
                      {/* Title & Subject */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {book.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                          <span className="text-blue-600 font-semibold">{book.genre || 'Textbook'}</span>
                          {book.subject && <span className="text-slate-400">• {book.subject}</span>}
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4 whitespace-nowrap">Class {book.className}</td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {book.stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <AlertCircle className="w-3 h-3" />
                            <span>Out of Stock (0)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{book.stock} units left</span>
                          </span>
                        )}
                      </td>

                      {/* Threshold */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">
                        {lowStockThreshold}
                      </td>

                      {/* Suggested Reorder Qty */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-200">
                          +{suggestedQty}
                        </span>
                      </td>

                      {/* Assigned Supplier */}
                      <td className="py-3 px-4">
                        {supplier ? (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {supplier.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {supplier.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {book.authorPublisher || 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                        {unitCost}
                      </td>

                      {/* Total Estimated Cost */}
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {totalEst.toLocaleString()}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenRestockForBook(book)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition shadow-2xs flex items-center gap-1.5 mx-auto cursor-pointer"
                          title="Restock this book now"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: FORMAL PURCHASE REQUISITION / PO SLIP                   */}
      {/* ============================================================== */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:static print:p-0 print:bg-transparent">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-6 print:border-none print:shadow-none print:w-full">
            {/* Modal Controls */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40 print:hidden">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Official Book Inventory Purchase Requisition
              </span>
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Requisition Slip */}
            <div className="p-8 space-y-6 text-xs text-slate-800 dark:text-slate-200 print:text-black">
              {/* Header */}
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {settings.schoolName || 'St. Augustine International Academy'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    School Bookshop &amp; Inventory Management Department
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {settings.schoolAddress || 'School Campus Store'} • Phone: {settings.schoolPhone || 'N/A'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs uppercase">
                    Purchase Order Requisition
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-700 mt-1">
                    PO-REORDER-{new Date().getFullYear()}-{String(lowStockBooks.length).padStart(3, '0')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Date: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-700 uppercase">
                  Flagged Items for Replenishment:
                </h4>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Book Title &amp; Details</th>
                      <th className="p-2">Class</th>
                      <th className="p-2 text-center">Current</th>
                      <th className="p-2 text-center">Req. Qty</th>
                      <th className="p-2 text-right">Unit Est.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lowStockBooks.map((b, idx) => {
                      const targetStock = Math.max(lowStockThreshold * targetStockMultiplier, 20);
                      const reqQty = Math.max(10, targetStock - b.stock);
                      const unitCost = b.costPrice || Math.round(b.price * 0.7);
                      const subtotal = reqQty * unitCost;

                      return (
                        <tr key={b.id}>
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-medium">
                            {b.title}
                            <span className="block text-[10px] text-slate-500">
                              Publisher: {b.authorPublisher}
                            </span>
                          </td>
                          <td className="p-2">Class {b.className}</td>
                          <td className="p-2 text-center font-mono">{b.stock}</td>
                          <td className="p-2 text-center font-bold font-mono">+{reqQty}</td>
                          <td className="p-2 text-right font-mono">{unitCost}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {subtotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-2 text-right uppercase">
                        Total Reorder Units:
                      </td>
                      <td className="p-2 text-center font-mono">
                        {summaryMetrics.totalDeficitUnits}
                      </td>
                      <td className="p-2 text-right uppercase">Total Est:</td>
                      <td className="p-2 text-right font-mono font-black text-emerald-700">
                        {currencyLabel} {summaryMetrics.totalEstimatedCost.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200">
                <div className="space-y-6">
                  <div className="border-b border-slate-300 w-48" />
                  <p className="text-[11px] text-slate-500 font-semibold uppercase">
                    Prepared By: Store Incharge
                  </p>
                </div>

                <div className="space-y-6 text-right">
                  <div className="border-b border-slate-300 w-48 ml-auto" />
                  <p className="text-[11px] text-slate-500 font-semibold uppercase">
                    Approved By: Principal / Bursar
                  </p>
                </div>
              </div>

              {/* Print buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Requisition Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
