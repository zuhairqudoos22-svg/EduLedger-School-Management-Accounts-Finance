import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { BookSupplier, SupplierPayment, BookItem, PaymentMode } from '../../types';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Printer,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Receipt,
  ArrowRight,
} from 'lucide-react';

interface BookshopSuppliersViewProps {
  onOpenRestockForBook?: (book: BookItem) => void;
}

export const BookshopSuppliersView: React.FC<BookshopSuppliersViewProps> = ({
  onOpenRestockForBook,
}) => {
  const {
    bookSuppliers,
    supplierPayments,
    books,
    settings,
    addBookSupplier,
    updateBookSupplier,
    deleteBookSupplier,
    recordSupplierPayment,
    deleteSupplierPayment,
  } = useSchool();

  const currencyLabel = settings.currencyCode || 'PKR';

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modals state
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<BookSupplier | null>(null);
  const [activeLedgerSupplier, setActiveLedgerSupplier] = useState<BookSupplier | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [supplierForNewPayment, setSupplierForNewPayment] = useState<BookSupplier | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string>('');

  // Form state for Supplier
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Textbook']);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Form state for Payment / Procurement Record
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentBookTitle, setPaymentBookTitle] = useState('');
  const [quantitySupplied, setQuantitySupplied] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Categories list
  const availableCategoriesList = [
    'Textbook',
    'Workbook',
    'Note Books',
    'Worksheet',
    'Artpad',
    'Register',
    'Time table',
    'Reference',
    'Literature & Fiction',
    'Exam Prep',
    'IT',
    'General Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Stationery',
    'Other',
  ];

  // Metrics
  const totalSuppliersCount = bookSuppliers.length;

  const totalProcurementSpent = useMemo(() => {
    return supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [supplierPayments]);

  const pendingPaymentsCount = useMemo(() => {
    return supplierPayments.filter(p => p.status === 'Pending' || p.status === 'Partial').length;
  }, [supplierPayments]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bookSuppliers.filter(sup => {
      const matchesSearch =
        !q ||
        sup.name.toLowerCase().includes(q) ||
        sup.contactPerson.toLowerCase().includes(q) ||
        sup.phone.toLowerCase().includes(q) ||
        sup.email.toLowerCase().includes(q) ||
        (sup.address && sup.address.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategoryFilter === 'all' ||
        sup.suppliedCategories.some(
          c => c.toLowerCase() === selectedCategoryFilter.toLowerCase()
        );

      return matchesSearch && matchesCategory;
    });
  }, [bookSuppliers, searchQuery, selectedCategoryFilter]);

  // Helper to get payments for a supplier
  const getPaymentsForSupplier = (supplierId: string) => {
    return supplierPayments.filter(p => p.supplierId === supplierId);
  };

  // Helper to get books for a supplier
  const getBooksForSupplier = (supplierNameOrId: string) => {
    return books.filter(
      b =>
        b.supplierId === supplierNameOrId ||
        (b.supplierName &&
          b.supplierName.toLowerCase() === supplierNameOrId.toLowerCase()) ||
        b.authorPublisher.toLowerCase().includes(supplierNameOrId.toLowerCase())
    );
  };

  // Open Add Supplier Modal
  const handleOpenAddSupplier = () => {
    setSupplierName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPaymentTerms('Net 30 Days');
    setBankDetails('');
    setNotes('');
    setSelectedCategories(['Textbook']);
    setCustomCategoryInput('');
    setEditingSupplier(null);
    setIsAddSupplierModalOpen(true);
  };

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (sup: BookSupplier) => {
    setEditingSupplier(sup);
    setSupplierName(sup.name);
    setContactPerson(sup.contactPerson);
    setPhone(sup.phone);
    setEmail(sup.email);
    setAddress(sup.address || '');
    setPaymentTerms(sup.paymentTerms || 'Net 30 Days');
    setBankDetails(sup.bankDetails || '');
    setNotes(sup.notes || '');
    setSelectedCategories(sup.suppliedCategories || ['Textbook']);
    setCustomCategoryInput('');
    setIsAddSupplierModalOpen(true);
  };

  // Toggle Category selection
  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories([...selectedCategories, trimmed]);
      setCustomCategoryInput('');
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    if (editingSupplier) {
      await updateBookSupplier({
        ...editingSupplier,
        name: supplierName.trim(),
        contactPerson: contactPerson.trim() || 'N/A',
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim() || undefined,
        suppliedCategories: selectedCategories,
        paymentTerms: paymentTerms.trim(),
        bankDetails: bankDetails.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccessFeedback(`Updated supplier "${supplierName}" successfully.`);
    } else {
      await addBookSupplier({
        name: supplierName.trim(),
        contactPerson: contactPerson.trim() || 'Key Representative',
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim() || undefined,
        suppliedCategories: selectedCategories,
        paymentTerms: paymentTerms.trim(),
        bankDetails: bankDetails.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccessFeedback(`Added new supplier "${supplierName}".`);
    }

    setIsAddSupplierModalOpen(false);
    setEditingSupplier(null);
    setTimeout(() => setSuccessFeedback(''), 3500);
  };

  // Open Record Payment Modal
  const handleOpenRecordPayment = (sup: BookSupplier) => {
    setSupplierForNewPayment(sup);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount('');
    setPaymentMode('Bank Transfer');
    setReferenceNo(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPaymentBookTitle('');
    setQuantitySupplied('');
    setUnitCost('');
    setPaymentStatus('Paid');
    setPaymentNotes('');
    setIsRecordPaymentModalOpen(true);
  };

  // Save Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForNewPayment || !paymentAmount) return;

    const amountNum = Number(paymentAmount);
    await recordSupplierPayment({
      supplierId: supplierForNewPayment.id,
      supplierName: supplierForNewPayment.name,
      date: paymentDate,
      amount: amountNum,
      paymentMode,
      referenceNo: referenceNo.trim() || `REF-${Date.now()}`,
      bookTitle: paymentBookTitle.trim() || undefined,
      quantitySupplied: quantitySupplied ? Number(quantitySupplied) : undefined,
      unitCost: unitCost ? Number(unitCost) : undefined,
      status: paymentStatus,
      notes: paymentNotes.trim() || undefined,
    });

    setIsRecordPaymentModalOpen(false);
    setSuccessFeedback(
      `Recorded payment of ${currencyLabel} ${amountNum.toLocaleString()} for ${supplierForNewPayment.name}.`
    );
    setTimeout(() => setSuccessFeedback(''), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner & Feedback */}
      {successFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Suppliers
            </span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {totalSuppliersCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Vendors &amp; book distributors</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Procurements Paid
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {currencyLabel} {totalProcurementSpent.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Across all registered purchase batches</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending / Partial Bills
            </span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {pendingPaymentsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Invoices requiring balance settlement</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Left: Add Supplier */}
        <button
          type="button"
          onClick={handleOpenAddSupplier}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>

        {/* Right: Search & Category Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={e => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Supplied Categories</option>
            {availableCategoriesList.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search vendor, contact, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Suppliers Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Truck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching suppliers found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add vendors to track purchases, contact details, and payment histories.
            </p>
          </div>
        ) : (
          filteredSuppliers.map(supplier => {
            const payments = getPaymentsForSupplier(supplier.id);
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const linkedBooks = getBooksForSupplier(supplier.name);
            const lowStockCount = linkedBooks.filter(b => b.stock <= 10).length;

            return (
              <div
                key={supplier.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                        {supplier.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {supplier.contactPerson}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSupplier(supplier)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Supplier Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
                            deleteBookSupplier(supplier.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 mt-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{supplier.phone}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {supplier.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Supplied Categories Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3">
                    {supplier.suppliedCategories.slice(0, 3).map(cat => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {cat}
                      </span>
                    ))}
                    {supplier.suppliedCategories.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-50">
                        +{supplier.suppliedCategories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Summary & Catalog Link */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Procured:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currencyLabel} {totalPaid.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Payment Terms:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {supplier.paymentTerms || 'Standard'}
                    </span>
                  </div>

                  {/* Low stock alert badge if any books from this supplier need reorder */}
                  {lowStockCount > 0 && (
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs">
                      <span className="text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-1.5 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{lowStockCount} title(s) low in stock</span>
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveLedgerSupplier(supplier)}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ledger ({payments.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRecordPayment(supplier)}
                      className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Bill</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: SUPPLIER PAYMENT HISTORY & ACCOUNT LEDGER               */}
      {/* ============================================================== */}
      {activeLedgerSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-6">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-600 text-white">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {activeLedgerSupplier.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vendor Payment History &amp; Procurement Ledger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLedgerSupplier(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Vendor Info Strip */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Contact Person
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeLedgerSupplier.contactPerson}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {activeLedgerSupplier.phone}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Payment Terms
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeLedgerSupplier.paymentTerms || 'Net 30 Days'}
                  </span>
                  {activeLedgerSupplier.bankDetails && (
                    <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                      {activeLedgerSupplier.bankDetails}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Transactions
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {currencyLabel}{' '}
                    {getPaymentsForSupplier(activeLedgerSupplier.id)
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Procurement Invoices &amp; Payments
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const sup = activeLedgerSupplier;
                      setActiveLedgerSupplier(null);
                      handleOpenRecordPayment(sup);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record New Invoice / Payment</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Ref / Invoice</th>
                        <th className="py-2.5 px-3">Item / Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Amount ({currencyLabel})</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {getPaymentsForSupplier(activeLedgerSupplier.id).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No payment transactions recorded for this supplier yet.
                          </td>
                        </tr>
                      ) : (
                        getPaymentsForSupplier(activeLedgerSupplier.id).map(pmt => (
                          <tr key={pmt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 whitespace-nowrap">{pmt.date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold">{pmt.referenceNo}</td>
                            <td className="py-2.5 px-3 max-w-48 truncate">
                              {pmt.bookTitle || 'General Batch Stock'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {pmt.quantitySupplied || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {pmt.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pmt.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : pmt.status === 'Partial'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {pmt.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Delete payment record ${pmt.referenceNo}?`)) {
                                    deleteSupplierPayment(pmt.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                                title="Delete Payment Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Vendor Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLedgerSupplier(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT SUPPLIER                                     */}
      {/* ============================================================== */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>{editingSupplier ? 'Edit Vendor Details' : 'Add New Book Supplier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vendor / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oxford University Press, Punjab Textbook Board"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mahmood (Sales Head)"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300-1234567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="orders@publisher.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                    <option value="Advance 50% / Balance on Delivery">Advance 50% / Balance on Delivery</option>
                    <option value="100% Advance Payment">100% Advance Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Office / Warehouse Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 38, Industrial Area, Karachi"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                />
              </div>

              {/* Supplied Categories Multi-Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplied Categories
                </label>
                <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                  {availableCategoriesList.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank / Payment Account Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. HBL Title: Oxford Press A/C 00427901844203"
                  value={bankDetails}
                  onChange={e => setBankDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECORD PROCUREMENT PAYMENT / BILL                      */}
      {/* ============================================================== */}
      {isRecordPaymentModalOpen && supplierForNewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-50/50 dark:bg-blue-950/30">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Record Procurement / Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRecordPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Supplier
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {supplierForNewPayment.name}
                </span>
                <span className="text-xs text-slate-500 block">
                  Terms: {supplierForNewPayment.paymentTerms || 'Standard'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice / Ref No *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item / Batch Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 150 Note Books, Physics Class 9 Batch"
                  value={paymentBookTitle}
                  onChange={e => setPaymentBookTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Supplied
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={quantitySupplied}
                    onChange={e => setQuantitySupplied(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Amount ({currencyLabel}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Cash at Office</option>
                    <option value="Online/UPI">Online / Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as 'Paid' | 'Partial' | 'Pending')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partial">Partial Payment</option>
                    <option value="Pending">Pending / Unpaid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Payment Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via cheque #88120 for new academic session"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
