import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { SchoolAsset, AssetCategory, AssetStatus } from '../../types';
import { formatDateDisplay } from '../../utils/formatters';
import { generateSchoolAssetRegisterPdf } from '../../utils/assetPdf';
import { exportToExcel } from '../../utils/exportUtils';
import {
  Boxes,
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  FileDown,
  Edit2,
  Trash2,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  Truck,
  RotateCcw,
  Armchair,
  Monitor,
  FlaskConical,
  Trophy,
  Briefcase,
  Package,
  Copy,
  Check,
  Tag,
  Hash,
  Activity,
  FileText,
} from 'lucide-react';

interface SchoolAssetsViewProps {
  initialCategory?: AssetCategory;
  onNavigateToBooks?: () => void;
}

export const SchoolAssetsView: React.FC<SchoolAssetsViewProps> = ({
  initialCategory = 'All',
  onNavigateToBooks,
}) => {
  const { assets, addAsset, updateAsset, deleteAsset, settings, bookSuppliers } = useSchool();
  const { isAdmin, currentUser } = useAuth();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>(initialCategory);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | AssetStatus>('All');
  const [warrantyFilter, setWarrantyFilter] = useState<'All' | 'Under Warranty' | 'Expired'>('All');

  // Copy ID toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SchoolAsset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<SchoolAsset | null>(null);
  const [maintenanceModalAsset, setMaintenanceModalAsset] = useState<SchoolAsset | null>(null);
  const [maintenanceCostInput, setMaintenanceCostInput] = useState<number | ''>('');
  const [maintenanceNotesInput, setMaintenanceNotesInput] = useState<string>('');

  // Asset Form State
  const [formData, setFormData] = useState({
    assetId: '',
    name: '',
    category: 'Furniture' as SchoolAsset['category'],
    quantity: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    currentValue: 0,
    supplier: '',
    warrantyExpiry: '',
    status: 'Active' as AssetStatus,
    location: '',
    maintenanceCost: 0,
    maintenanceNotes: '',
    condition: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Poor',
    serialNumber: '',
  });

  const currencySymbol = settings.currencySymbol || 'PKR';
  const schoolName = settings.schoolName || 'NextGen School & Academy';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Categories list per specification with dedicated icons
  const categories: { label: AssetCategory; icon: React.ElementType }[] = [
    { label: 'All', icon: Layers },
    { label: 'Furniture', icon: Armchair },
    { label: 'Computers', icon: Monitor },
    { label: 'Laboratory Equipment', icon: FlaskConical },
    { label: 'Sports Equipment', icon: Trophy },
    { label: 'Office Assets', icon: Briefcase },
    { label: 'Other', icon: Package },
  ];

  // Unique list of suppliers gathered from assets and book suppliers
  const suppliersList = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => {
      if (a.supplier && a.supplier.trim()) set.add(a.supplier.trim());
    });
    (bookSuppliers || []).forEach(s => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    return Array.from(set).sort();
  }, [assets, bookSuppliers]);

  // Helper to check if asset warranty is currently active
  const checkIsUnderWarranty = (asset: SchoolAsset | typeof formData): boolean => {
    if (!asset.warrantyExpiry || asset.warrantyExpiry.toLowerCase() === 'no warranty') {
      return false;
    }
    const expiry = new Date(asset.warrantyExpiry).getTime();
    return !isNaN(expiry) && expiry >= Date.now();
  };

  // Helper to calculate days remaining on warranty
  const getWarrantyRemainingText = (warrantyExpiry?: string): string => {
    if (!warrantyExpiry || warrantyExpiry.toLowerCase() === 'no warranty') {
      return 'No Warranty';
    }
    const expiryTime = new Date(warrantyExpiry).getTime();
    if (isNaN(expiryTime)) return 'Invalid Date';
    const diffDays = Math.ceil((expiryTime - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires Today';
    if (diffDays < 30) return `${diffDays}d left`;
    const months = Math.floor(diffDays / 30);
    return `${months}m left`;
  };

  // Category badge styling helper
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Furniture':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'Computers':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 'Laboratory Equipment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'Sports Equipment':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'Office Assets':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalItemsCount = 0;
    let totalCurrentValue = 0;
    let underWarrantyCount = 0;
    let underMaintenanceCount = 0;
    let totalMaintenanceCost = 0;

    assets.forEach(a => {
      const qty = a.quantity || 1;
      totalItemsCount += qty;
      totalCurrentValue += (a.currentValue || 0) * qty;
      if (checkIsUnderWarranty(a)) {
        underWarrantyCount++;
      }
      if (a.status === 'Under Maintenance') {
        underMaintenanceCount++;
      }
      totalMaintenanceCost += a.maintenanceCost || 0;
    });

    return {
      totalAssetsCount: assets.length,
      totalUnits: totalItemsCount,
      totalCurrentValue,
      underWarrantyCount,
      underMaintenanceCount,
      totalMaintenanceCost,
    };
  }, [assets]);

  // Filtered Assets based on Category, Search Query (Asset ID / Name / Supplier), Supplier dropdown, Status, and Warranty
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Search matching: Asset ID, Name, Supplier, Location, Serial
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        asset.assetId.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        asset.supplier.toLowerCase().includes(query) ||
        (asset.location && asset.location.toLowerCase().includes(query)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query));

      // Category matching
      const matchesCategory =
        selectedCategory === 'All' || asset.category === selectedCategory;

      // Supplier matching
      const matchesSupplier =
        selectedSupplier === 'All' || asset.supplier.toLowerCase() === selectedSupplier.toLowerCase();

      // Status matching
      const matchesStatus =
        selectedStatus === 'All' || asset.status === selectedStatus;

      // Warranty matching
      const isUnderWarranty = checkIsUnderWarranty(asset);
      const matchesWarranty =
        warrantyFilter === 'All' ||
        (warrantyFilter === 'Under Warranty' && isUnderWarranty) ||
        (warrantyFilter === 'Expired' && !isUnderWarranty);

      return matchesSearch && matchesCategory && matchesSupplier && matchesStatus && matchesWarranty;
    });
  }, [assets, searchQuery, selectedCategory, selectedSupplier, selectedStatus, warrantyFilter]);

  // Copy Asset ID to clipboard
  const handleCopyAssetId = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(assetId);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Modal to Add
  const handleOpenAddModal = () => {
    const nextNum = String(assets.length + 1).padStart(3, '0');
    setFormData({
      assetId: `AST-${nextNum}`,
      name: '',
      category: 'Furniture',
      quantity: 1,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      currentValue: 0,
      supplier: suppliersList[0] || 'National School Supplies Ltd',
      warrantyExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Active',
      location: '',
      maintenanceCost: 0,
      maintenanceNotes: '',
      condition: 'Excellent',
      serialNumber: '',
    });
    setEditingAsset(null);
    setIsAddModalOpen(true);
  };

  // Open Modal to Edit
  const handleOpenEditModal = (asset: SchoolAsset) => {
    setFormData({
      assetId: asset.assetId,
      name: asset.name,
      category: asset.category,
      quantity: asset.quantity,
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      currentValue: asset.currentValue,
      supplier: asset.supplier,
      warrantyExpiry: asset.warrantyExpiry,
      status: asset.status,
      location: asset.location || '',
      maintenanceCost: asset.maintenanceCost || 0,
      maintenanceNotes: asset.maintenanceNotes || '',
      condition: asset.condition || 'Good',
      serialNumber: asset.serialNumber || '',
    });
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.assetId.trim()) return;

    if (editingAsset) {
      await updateAsset({
        ...editingAsset,
        ...formData,
        isUnderWarranty: checkIsUnderWarranty(formData),
      });
      showToast(`Updated asset "${formData.name}" successfully.`);
    } else {
      await addAsset({
        ...formData,
        isUnderWarranty: checkIsUnderWarranty(formData),
      });
      showToast(`Added new asset "${formData.name}" (${formData.assetId}) to registry.`);
    }
    setIsAddModalOpen(false);
  };

  // Handle Delete
  const handleDeleteAsset = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete asset "${name}"? This action cannot be undone.`)) {
      await deleteAsset(id);
      showToast(`Deleted asset "${name}".`);
    }
  };

  // Handle Maintenance log
  const handleOpenMaintenance = (asset: SchoolAsset) => {
    setMaintenanceModalAsset(asset);
    setMaintenanceCostInput('');
    setMaintenanceNotesInput('');
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceModalAsset) return;
    const additionalCost = Number(maintenanceCostInput) || 0;
    const dateStr = new Date().toISOString().split('T')[0];
    const newNotes = maintenanceNotesInput.trim()
      ? `${maintenanceModalAsset.maintenanceNotes ? maintenanceModalAsset.maintenanceNotes + '\n' : ''}[${dateStr}] +${currencySymbol} ${additionalCost.toLocaleString()}: ${maintenanceNotesInput}`
      : maintenanceModalAsset.maintenanceNotes;

    await updateAsset({
      ...maintenanceModalAsset,
      maintenanceCost: (maintenanceModalAsset.maintenanceCost || 0) + additionalCost,
      maintenanceNotes: newNotes,
      status: 'Under Maintenance',
    });
    showToast(`Logged maintenance for "${maintenanceModalAsset.name}".`);
    setMaintenanceModalAsset(null);
  };

  // Export CSV (per user prompt: "Export CVS")
  const handleExportCSV = () => {
    const headers = [
      'Asset ID',
      'Name',
      'Category',
      'Qty',
      'Purchase Date',
      'Purchase Price',
      'Current Value',
      'Total Value',
      'Supplier',
      'Warranty Expiry',
      'Warranty Status',
      'Operational Status',
      'Location',
      'Serial Number',
      'Condition',
      'Total Maintenance Cost',
    ];

    const rows = filteredAssets.map(a => [
      `"${a.assetId}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      a.quantity,
      `"${a.purchaseDate}"`,
      a.purchasePrice,
      a.currentValue,
      (a.currentValue || 0) * (a.quantity || 1),
      `"${a.supplier.replace(/"/g, '""')}"`,
      `"${a.warrantyExpiry || 'N/A'}"`,
      `"${checkIsUnderWarranty(a) ? 'Under Warranty' : 'Expired / None'}"`,
      `"${a.status}"`,
      `"${(a.location || 'N/A').replace(/"/g, '""')}"`,
      `"${(a.serialNumber || 'N/A').replace(/"/g, '""')}"`,
      `"${a.condition || 'Good'}"`,
      a.maintenanceCost || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `School_Assets_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredAssets.length} assets to CSV file successfully.`);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = filteredAssets.map((a, idx) => ({
      '#': idx + 1,
      'Asset ID': a.assetId,
      'Asset Name': a.name,
      Category: a.category,
      Quantity: a.quantity || 1,
      'Location / Room': a.location || 'Unassigned',
      'Purchase Date': formatDateDisplay(a.purchaseDate) || '-',
      Supplier: a.supplier || '-',
      'Warranty Expiry': a.warrantyExpiry ? formatDateDisplay(a.warrantyExpiry) : 'None',
      'Purchase Price': a.purchasePrice || 0,
      'Current Value': a.currentValue || 0,
      Status: a.status,
      Notes: a.maintenanceNotes || '',
    }));

    exportToExcel(
      `Institutional_Asset_Register_${selectedCategory.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      'AssetRegister',
      rows as unknown as Record<string, unknown>[]
    );
    showToast(`Exported ${filteredAssets.length} assets to Excel spreadsheet.`);
  };

  // Print Report: Formatted institutional print ledger for auditing
  const handlePrintReport = () => {
    document.body.classList.add('print-mode-assets');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-assets');
    }, 1500);
  };

  // Download PDF: Generates and downloads official institutional asset register document
  const handleDownloadPDF = () => {
    try {
      generateSchoolAssetRegisterPdf({
        settings,
        assets: filteredAssets,
        categoryFilter: selectedCategory,
        searchQuery,
        generatedBy: currentUser?.fullName || 'Asset Administrator',
      });
      showToast(`Generated & downloaded official institutional asset register PDF (${filteredAssets.length} records).`);
    } catch (err) {
      console.error('Error generating asset register PDF:', err);
      // Fallback to browser print as backup
      document.body.classList.add('print-mode-assets');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('print-mode-assets');
      }, 1500);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedSupplier('All');
    setSelectedStatus('All');
    setWarrantyFilter('All');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'All' ||
    selectedSupplier !== 'All' ||
    selectedStatus !== 'All' ||
    warrantyFilter !== 'All';

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>School Assets &amp; Physical Inventory</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {assets.length} Registered
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete registry of campus assets: Furniture, Computers, Labs, Sports gear &amp; Office equipment.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Asset, search Asset Id, Supplier, Export CSV, Print report, Download PDF */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Assets to CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Export Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Assets to Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Export Excel</span>
          </button>

          {/* Print Report */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-xs transition active:scale-95 cursor-pointer"
            title="Print Official Asset Ledger Report"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Report</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-xs transition active:scale-95 cursor-pointer"
            title="Download Asset Report as PDF"
          >
            <FileDown className="w-4 h-4 text-purple-600" />
            <span>Download PDF</span>
          </button>

          {/* Add Asset */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Total asset, Current value, Under warranty, Under Maintainance, Total Maintainance cost */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 print:hidden">
        {/* Card 1: Total Asset */}
        <div
          onClick={() => {
            setSelectedCategory('All');
            setSelectedStatus('All');
            setWarrantyFilter('All');
          }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition cursor-pointer group"
          title="Click to reset filters and view all assets"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Assets
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalAssetsCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span>{stats.totalUnits} physical units</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline">All</span>
          </div>
        </div>

        {/* Card 2: Current Value */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Current Value
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono truncate">
            {currencySymbol} {stats.totalCurrentValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Depreciated valuation
          </p>
        </div>

        {/* Card 3: Under Warranty */}
        <div
          onClick={() =>
            setWarrantyFilter(prev => (prev === 'Under Warranty' ? 'All' : 'Under Warranty'))
          }
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs transition cursor-pointer group ${
            warrantyFilter === 'Under Warranty'
              ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-teal-300'
          }`}
          title="Click to toggle Under Warranty filter"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Under Warranty
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 mt-2">
            {stats.underWarrantyCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span>Active OEM coverage</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold group-hover:underline">
              {warrantyFilter === 'Under Warranty' ? 'Active' : 'Filter'}
            </span>
          </div>
        </div>

        {/* Card 4: Under Maintenance */}
        <div
          onClick={() =>
            setSelectedStatus(prev => (prev === 'Under Maintenance' ? 'All' : 'Under Maintenance'))
          }
          className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs transition cursor-pointer group ${
            selectedStatus === 'Under Maintenance'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
          title="Click to toggle Under Maintenance filter"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Under Maintenance
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.underMaintenanceCount}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            <span>In repair or servicing</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
              {selectedStatus === 'Under Maintenance' ? 'Active' : 'Filter'}
            </span>
          </div>
        </div>

        {/* Card 5: Total Maintenance Cost */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Maint. Cost
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono truncate">
            {currencySymbol} {stats.totalMaintenanceCost.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Accumulated repair spend
          </p>
        </div>
      </div>

      {/* Category Tabs: All, Furniture, Computers, Laboratory Equipment, Sports Equipment, Office Assets, Other */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar border-b border-slate-200 dark:border-slate-800 print:hidden">
        {categories.map(cat => {
          const IconComp = cat.icon;
          const isActive = selectedCategory === cat.label;
          const count =
            cat.label === 'All'
              ? assets.length
              : assets.filter(a => a.category === cat.label).length;

          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => setSelectedCategory(cat.label)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Multi-Filters: search Asset Id, Supplier, Status, Warranty */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 print:hidden">
        {/* Search Asset ID / Name */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Asset ID (e.g. AST-FUR-001), Name, Location, Serial..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns: Supplier, Status, Warranty & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="bg-transparent py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Suppliers</option>
              {suppliersList.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Decommissioned">Decommissioned</option>
            <option value="Disposed">Disposed</option>
          </select>

          {/* Warranty Filter */}
          <select
            value={warrantyFilter}
            onChange={e => setWarrantyFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Warranties</option>
            <option value="Under Warranty">Under Warranty Only</option>
            <option value="Expired">Expired / No Warranty</option>
          </select>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition cursor-pointer"
              title="Clear all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Asset Registry Table:
          Asset ID | Name | Category | Qty | Purchase Date | Supplier | Warranty | Current Value | Status | Actions */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Asset ID</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3 text-center">Qty</th>
                <th className="py-3.5 px-3">Purchase Date</th>
                <th className="py-3.5 px-3.5">Supplier</th>
                <th className="py-3.5 px-3.5">Warranty</th>
                <th className="py-3.5 px-4 text-right">Current Value</th>
                <th className="py-3.5 px-3.5 text-center">Status</th>
                <th className="py-3.5 px-3.5 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAssets.length > 0 ? (
                filteredAssets.map(asset => {
                  const isWarrantyActive = checkIsUnderWarranty(asset);
                  const remainingText = getWarrantyRemainingText(asset.warrantyExpiry);
                  const totalVal = (asset.currentValue || 0) * (asset.quantity || 1);

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => setViewingAsset(asset)}
                    >
                      {/* Asset ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
                            {asset.assetId}
                          </span>
                          <button
                            type="button"
                            onClick={e => handleCopyAssetId(e, asset.assetId)}
                            className="p-1 rounded text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition print:hidden"
                            title="Copy Asset ID"
                          >
                            {copiedId === asset.assetId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name & Location / Serial */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white max-w-[260px] truncate">
                          {asset.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {asset.location && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{asset.location}</span>
                            </span>
                          )}
                          {asset.serialNumber && (
                            <span className="font-mono text-[10px] text-slate-400">
                              · SN: {asset.serialNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                            asset.category
                          )}`}
                        >
                          {asset.category}
                        </span>
                      </td>

                      {/* Qty */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {asset.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">units</span>
                      </td>

                      {/* Purchase Date */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateDisplay(asset.purchaseDate)}</span>
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 max-w-[150px] truncate" title={asset.supplier}>
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{asset.supplier}</span>
                        </div>
                      </td>

                      {/* Warranty */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {isWarrantyActive ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{remainingText}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Exp: {asset.warrantyExpiry}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <ShieldAlert className="w-3 h-3 text-slate-400" />
                            <span>Expired / None</span>
                          </span>
                        )}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {currencySymbol} {totalVal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          @{currencySymbol} {asset.currentValue.toLocaleString()} / unit
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {asset.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : asset.status === 'Under Maintenance' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Wrench className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Under Maint.
                          </span>
                        ) : asset.status === 'Decommissioned' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            Decommissioned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Disposed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-3.5 text-center print:hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingAsset(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                            title="View Asset Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMaintenance(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                            title="Log Maintenance & Repairs"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400 text-xs">
                    <Boxes className="w-9 h-9 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      No matching assets found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Try clearing filters or search queries, or click "Add Asset" to record a new asset.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 print:hidden">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredAssets.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{assets.length}</strong> assets
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Filtered Units: <strong className="text-slate-800 dark:text-slate-200">{filteredAssets.reduce((sum, a) => sum + (a.quantity || 1), 0)}</strong>
            </span>
            <span>
              Filtered Value:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {currencySymbol}{' '}
                {filteredAssets
                  .reduce((sum, a) => sum + (a.currentValue || 0) * (a.quantity || 1), 0)
                  .toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* OFFICIAL PRINTABLE REPORT TEMPLATE (Visible during print only) */}
      {/* ============================================================== */}
      <div id="printable-assets-register" className="hidden print:block p-6 bg-white text-slate-900 w-full">
        {/* Header */}
        <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
          <h1 className="text-2xl font-black tracking-wide uppercase text-slate-900">{schoolName}</h1>
          <h2 className="text-base font-bold text-slate-700 mt-1 uppercase tracking-wider">
            Official Physical Asset &amp; Institutional Inventory Ledger
          </h2>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200">
            <span>Audit Date: {new Date().toLocaleDateString()}</span>
            <span>Category Scope: {selectedCategory === 'All' ? 'All Institutional Assets' : selectedCategory}</span>
            <span>Audited By: {currentUser?.fullName || 'Asset Administrator'}</span>
          </div>
        </div>

        {/* Audit KPI Cards */}
        <div className="grid grid-cols-4 gap-3 text-center text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl mb-5">
          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Asset Records</span>
            <strong className="text-sm text-slate-900">{stats.totalAssetsCount} items</strong>
          </div>
          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Physical Units</span>
            <strong className="text-sm text-slate-900">{stats.totalUnits} units</strong>
          </div>
          <div className="border-r border-slate-200 pr-2">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Asset Valuation</span>
            <strong className="text-sm font-mono text-emerald-700">{currencySymbol} {stats.totalCurrentValue.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cumulative Maintenance</span>
            <strong className="text-sm font-mono text-amber-700">{currencySymbol} {stats.totalMaintenanceCost.toLocaleString()}</strong>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-slate-400 text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                <th className="border border-slate-400 p-2 text-center w-8">#</th>
                <th className="border border-slate-400 p-2 w-28">Asset ID</th>
                <th className="border border-slate-400 p-2">Item Name &amp; Description</th>
                <th className="border border-slate-400 p-2 w-24">Category</th>
                <th className="border border-slate-400 p-2 text-center w-12">Qty</th>
                <th className="border border-slate-400 p-2 w-28">Location</th>
                <th className="border border-slate-400 p-2 text-center w-24">Purchase Date</th>
                <th className="border border-slate-400 p-2 w-24">Supplier</th>
                <th className="border border-slate-400 p-2 text-right w-24">Value ({currencySymbol})</th>
                <th className="border border-slate-400 p-2 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset, index) => (
                <tr key={asset.id} className="border-b border-slate-300 hover:bg-slate-50">
                  <td className="border border-slate-400 p-1.5 text-center text-slate-500">{index + 1}</td>
                  <td className="border border-slate-400 p-1.5 font-mono font-bold text-slate-900">{asset.assetId}</td>
                  <td className="border border-slate-400 p-1.5 font-medium text-slate-900">{asset.name}</td>
                  <td className="border border-slate-400 p-1.5 text-slate-700">{asset.category}</td>
                  <td className="border border-slate-400 p-1.5 text-center font-bold text-slate-900">{asset.quantity || 1}</td>
                  <td className="border border-slate-400 p-1.5 text-slate-600">{asset.location || '—'}</td>
                  <td className="border border-slate-400 p-1.5 text-center text-slate-600">{formatDateDisplay(asset.purchaseDate) || '—'}</td>
                  <td className="border border-slate-400 p-1.5 text-slate-600">{asset.supplier || '—'}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono font-bold text-slate-900">
                    {(asset.currentValue || 0).toLocaleString()}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-semibold text-slate-800">{asset.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-500">
                <td colSpan={4} className="border border-slate-400 p-2 text-right">
                  TOTAL REGISTER SUMMARY:
                </td>
                <td className="border border-slate-400 p-2 text-center font-black">
                  {filteredAssets.reduce((sum, a) => sum + (a.quantity || 1), 0)}
                </td>
                <td colSpan={3} className="border border-slate-400 p-2"></td>
                <td className="border border-slate-400 p-2 text-right font-mono font-black text-emerald-800">
                  {currencySymbol}{' '}
                  {filteredAssets
                    .reduce((sum, a) => sum + (a.currentValue || 0) * (a.quantity || 1), 0)
                    .toLocaleString()}
                </td>
                <td className="border border-slate-400 p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Auditor & Principal Sign-off */}
        <div className="pt-8 mt-8 border-t border-slate-300 grid grid-cols-3 text-center text-xs">
          <div>
            <div className="w-36 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Prepared By</span>
            <div className="text-[10px] text-slate-500 mt-0.5">Inventory &amp; Asset Officer</div>
          </div>
          <div>
            <div className="w-36 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Internal Auditor</span>
            <div className="text-[10px] text-slate-500 mt-0.5">Audit &amp; Finance Committee</div>
          </div>
          <div>
            <div className="w-36 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Principal / Official Seal</span>
            <div className="text-[10px] text-slate-500 mt-0.5">{schoolName}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Official Institutional Asset Register • For Audit &amp; Compliance Verification • Generated on {new Date().toLocaleString()}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT ASSET                                        */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingAsset ? 'Edit School Asset' : 'Register New School Asset'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter physical inventory, purchase value, warranty &amp; supplier information.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Asset ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Asset ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AST-FUR-001"
                    value={formData.assetId}
                    onChange={e => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Core i7 Terminals"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Computers">Computers</option>
                    <option value="Laboratory Equipment">Laboratory Equipment</option>
                    <option value="Sports Equipment">Sports Equipment</option>
                    <option value="Office Assets">Office Assets</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BioLab Science Instruments"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Purchase Unit Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Unit Price ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        purchasePrice: Number(e.target.value) || 0,
                        currentValue:
                          formData.currentValue === 0
                            ? Number(e.target.value) || 0
                            : formData.currentValue,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Current Unit Value */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Unit Value ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.currentValue}
                    onChange={e =>
                      setFormData({ ...formData, currentValue: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Warranty Expiry */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Warranty Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operational Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Decommissioned">Decommissioned</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>

                {/* Campus Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Campus Location / Room
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Lab 1, Room 104"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Serial Number / Asset Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DELL-OPT-i7-30B"
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Physical Condition */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Physical Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {editingAsset ? 'Update Asset Record' : 'Save Asset to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LOG MAINTENANCE / REPAIRS                               */}
      {/* ============================================================== */}
      {maintenanceModalAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Log Maintenance &amp; Repair Cost
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceModalAsset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="p-4 space-y-3.5">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {maintenanceModalAsset.name}
                </p>
                <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  {maintenanceModalAsset.assetId} · Current Total Spend: {currencySymbol}{' '}
                  {(maintenanceModalAsset.maintenanceCost || 0).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Maintenance Cost ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 4500"
                  value={maintenanceCostInput}
                  onChange={e =>
                    setMaintenanceCostInput(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service / Repair Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Replaced display inverter, renewed thermal paste..."
                  value={maintenanceNotesInput}
                  onChange={e => setMaintenanceNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalAsset(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  Save Maintenance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW ASSET DETAILS                                      */}
      {/* ============================================================== */}
      {viewingAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                  {viewingAsset.assetId}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {viewingAsset.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingAsset(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Category</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.category}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Quantity</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.quantity} Units
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Purchase Date</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatDateDisplay(viewingAsset.purchaseDate)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Supplier</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.supplier}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Purchase Price</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {currencySymbol} {viewingAsset.purchasePrice.toLocaleString()} / unit
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Current Value</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {currencySymbol}{' '}
                    {((viewingAsset.currentValue || 0) * (viewingAsset.quantity || 1)).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Warranty</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.warrantyExpiry ? `Till ${viewingAsset.warrantyExpiry}` : 'No Warranty'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Campus Location</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.location || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Serial Number</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {viewingAsset.serialNumber || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Maintenance Cost</span>
                  <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                    {currencySymbol} {(viewingAsset.maintenanceCost || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {viewingAsset.maintenanceNotes && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                    Maintenance History &amp; Service Logs
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    {viewingAsset.maintenanceNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
              <button
                type="button"
                onClick={() => {
                  const target = viewingAsset;
                  setViewingAsset(null);
                  handleOpenMaintenance(target);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 transition"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Log Maintenance</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingAsset;
                    setViewingAsset(null);
                    handleOpenEditModal(target);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAsset(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
