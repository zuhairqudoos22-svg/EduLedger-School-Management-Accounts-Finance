import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import { BookItem, BookSale, PaymentMode } from '../../types';
import { BookSaleReceiptModal } from './BookSaleReceiptModal';
import { BookshopQRScannerModal } from './BookshopQRScannerModal';
import { BookQRCodeModal } from './BookQRCodeModal';
import { BookshopSuppliersView } from './BookshopSuppliersView';
import { BookshopReordersView } from './BookshopReordersView';
import { SchoolAssetsView } from './SchoolAssetsView';
import {
  Boxes,
  Plus,
  Printer,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  X,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  BookOpen,
  Sliders,
  Filter,
  Tag,
  GraduationCap,
  Layers,
  Sparkles,
  Camera,
  QrCode,
  Truck,
  Package,
  ArrowRight,
  Bookmark,
} from 'lucide-react';

// Helper to determine primary categorization for any item
export const getBookPrimaryCategory = (
  b: BookItem
): 'Curriculum' | 'Stationery' | 'Reference' | 'Other' => {
  if (b.category === 'Curriculum' || b.category === 'Stationery' || b.category === 'Reference') {
    return b.category;
  }
  const tagsLower = (b.tags || []).map(t => t.toLowerCase());
  if (tagsLower.includes('reference') || b.genre?.toLowerCase() === 'reference') {
    return 'Reference';
  }
  if (
    tagsLower.includes('stationery') ||
    ['note books', 'register', 'artpad', 'time table'].includes(b.genre?.toLowerCase() || '') ||
    ['note books', 'register', 'artpad', 'time table'].includes(b.category?.toLowerCase() || '')
  ) {
    return 'Stationery';
  }
  if (
    tagsLower.includes('curriculum') ||
    tagsLower.includes('core curriculum') ||
    ['textbook', 'workbook', 'worksheet', 'exam prep'].includes(b.genre?.toLowerCase() || '')
  ) {
    return 'Curriculum';
  }
  return 'Other';
};

export interface BookshopViewProps {
  initialTab?: 'inventory' | 'assets' | 'sales' | 'reorders' | 'suppliers';
}

export const BookshopView: React.FC<BookshopViewProps> = ({ initialTab = 'inventory' }) => {
  const {
    books,
    bookSales,
    bookSuppliers,
    students,
    settings,
    assets,
    addBook,
    updateBook,
    deleteBook,
    recordBookSale,
    deleteBookSale,
  } = useSchool();
  const { currentUser } = useAuth();

  // Active tab: 'inventory' | 'assets' | 'sales' | 'reorders' | 'suppliers'
  const [activeTab, setActiveTab] = useState<'inventory' | 'assets' | 'sales' | 'reorders' | 'suppliers'>(initialTab);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Primary Categorization System: 'all' | 'Curriculum' | 'Stationery' | 'Reference'
  const [primaryCategoryFilter, setPrimaryCategoryFilter] = useState<
    'all' | 'Curriculum' | 'Stationery' | 'Reference'
  >('all');

  // Category Tagging & Multi-Dimensional Filters
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // User-defined low-stock threshold state (persisted in localStorage)
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eduledger_book_low_stock_threshold');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return 10; // Default threshold
  });

  // Filter toggle for inventory: 'all' | 'low-stock'
  const [stockFilter, setStockFilter] = useState<'all' | 'low-stock'>('all');

  // Modals state
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isClearBookshopModalOpen, setIsClearBookshopModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [sellingBook, setSellingBook] = useState<BookItem | null>(null);
  const [restockingBook, setRestockingBook] = useState<BookItem | null>(null);
  const [saleReceiptToView, setSaleReceiptToView] = useState<BookSale | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [bookForQRCodeView, setBookForQRCodeView] = useState<BookItem | null>(null);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string>('');

  // Form states for Add/Edit Book
  const [bookTitle, setBookTitle] = useState('');
  const [authorPublisher, setAuthorPublisher] = useState('');
  const [bookClass, setBookClass] = useState('3');
  const [bookCategory, setBookCategory] = useState<string>('Curriculum');
  const [bookGenre, setBookGenre] = useState('Textbook');
  const [bookSubject, setBookSubject] = useState('English');
  const [bookPrice, setBookPrice] = useState<number | ''>('');
  const [bookStock, setBookStock] = useState<number | ''>('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookTags, setBookTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [bookSupplierId, setBookSupplierId] = useState('');
  const [bookCostPrice, setBookCostPrice] = useState<number | ''>('');

  // Form states for Sale
  const [saleBookId, setSaleBookId] = useState<string>('');
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleStudentId, setSaleStudentId] = useState<string>('');
  const [saleCustomerName, setSaleCustomerName] = useState<string>('');
  const [salePaymentMode, setSalePaymentMode] = useState<PaymentMode>('Cash');
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Form states for Restock
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [restockNotes, setRestockNotes] = useState<string>('');

  const currencyLabel = settings.currencyCode || 'PKR';

  // Handle threshold adjustment
  const handleUpdateThreshold = (val: number) => {
    const safeVal = Math.max(1, Math.min(999, val));
    setLowStockThreshold(safeVal);
    localStorage.setItem('eduledger_book_low_stock_threshold', safeVal.toString());
  };

  // Compute Metrics matching screenshot
  // 1. Titles in Stock: count of distinct books with stock > 0
  const titlesInStock = useMemo(() => {
    return books.filter(b => b.stock > 0).length;
  }, [books]);

  // 2. Inventory Value: sum of (price * stock)
  const totalInventoryValue = useMemo(() => {
    return books.reduce((sum, b) => sum + (b.price || 0) * (b.stock || 0), 0);
  }, [books]);

  // 3. Total Sales Revenue: sum of all completed book sales
  const totalSalesRevenue = useMemo(() => {
    return bookSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }, [bookSales]);

  // Low stock books computed from user-defined threshold
  const lowStockBooks = useMemo(() => {
    return books.filter(b => b.stock <= lowStockThreshold);
  }, [books, lowStockThreshold]);

  // Available Genres for Filter
  const availableGenres = useMemo(() => {
    const defaultList = [
      'Textbook',
      'Workbook',
      'Note Books',
      'Worksheet',
      'Artpad',
      'Register',
      'Time table',
      'Reference',
      'Literature & Fiction',
      'Storybook',
      'Exam Prep',
      'Other',
    ];
    const fromBooks = books.map(b => b.genre || b.category).filter(Boolean) as string[];
    return Array.from(new Set([...defaultList, ...fromBooks])).sort();
  }, [books]);

  // Available Subjects for Filter
  const availableSubjects = useMemo(() => {
    const defaultList = [
      'English',
      'English B',
      'Urdu',
      'Urdu B',
      'Mathematics',
      'IT',
      'Physics',
      'Chemistry',
      'Biology',
      'General Science',
      'Geography',
      'Social Studies',
      'Islamiat',
      'Arts & Drawing',
      'General / Office',
    ];
    const fromBooks = books.map(b => b.subject).filter(Boolean) as string[];
    return Array.from(new Set([...defaultList, ...fromBooks])).sort();
  }, [books]);

  // Available Grades / Classes for Filter
  const availableGrades = useMemo(() => {
    const fromSettings = settings.standardClasses || [];
    const fromBooks = books.map(b => b.className).filter(Boolean);
    const combined = Array.from(new Set([...fromBooks, ...fromSettings]));
    return combined.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [books, settings.standardClasses]);

  // Primary Category Counts
  const categoryCounts = useMemo(() => {
    let curriculum = 0;
    let stationery = 0;
    let reference = 0;
    let other = 0;
    books.forEach(b => {
      const cat = getBookPrimaryCategory(b);
      if (cat === 'Curriculum') curriculum++;
      else if (cat === 'Stationery') stationery++;
      else if (cat === 'Reference') reference++;
      else other++;
    });
    return { all: books.length, curriculum, stationery, reference, other };
  }, [books]);

  // All Unique Tags across inventory
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    books.forEach(b => {
      if (b.tags && Array.isArray(b.tags)) {
        b.tags.forEach(t => tagSet.add(t));
      }
    });
    ['Curriculum', 'Stationery', 'Reference'].forEach(t => tagSet.add(t));
    return Array.from(tagSet).sort();
  }, [books]);

  // Filtered Inventory based on Category Tags (Genre, Subject, Grade, Tag, Stock, Search)
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return books.filter(b => {
      const primaryCat = getBookPrimaryCategory(b);
      const bookGenre = b.genre || b.category || 'Textbook';
      const bookSubject = b.subject || 'General';
      const bookGrade = b.className;
      const bookTags = b.tags || [];

      // Primary Category Filter: All | Curriculum | Stationery | Reference
      const matchesPrimaryCat =
        primaryCategoryFilter === 'all' || primaryCat === primaryCategoryFilter;

      // Search across title, author, class, genre, subject, isbn, and tags
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.authorPublisher.toLowerCase().includes(q) ||
        bookGrade.toLowerCase().includes(q) ||
        bookGenre.toLowerCase().includes(q) ||
        bookSubject.toLowerCase().includes(q) ||
        primaryCat.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        bookTags.some(t => t.toLowerCase().includes(q));

      const matchesStockFilter = stockFilter === 'all' || b.stock <= lowStockThreshold;
      const matchesGenre = genreFilter === 'all' || bookGenre.toLowerCase() === genreFilter.toLowerCase();
      const matchesSubject = subjectFilter === 'all' || bookSubject.toLowerCase() === subjectFilter.toLowerCase();
      const matchesGrade = gradeFilter === 'all' || bookGrade === gradeFilter;
      
      // Selected tag filter: matches tag or special category tags
      const matchesTag =
        !selectedTagFilter ||
        bookTags.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase()) ||
        (selectedTagFilter === 'Curriculum' && primaryCat === 'Curriculum') ||
        (selectedTagFilter === 'Stationery' && primaryCat === 'Stationery') ||
        (selectedTagFilter === 'Reference' && primaryCat === 'Reference');

      return (
        matchesPrimaryCat &&
        matchesSearch &&
        matchesStockFilter &&
        matchesGenre &&
        matchesSubject &&
        matchesGrade &&
        matchesTag
      );
    });
  }, [
    books,
    searchQuery,
    primaryCategoryFilter,
    stockFilter,
    lowStockThreshold,
    genreFilter,
    subjectFilter,
    gradeFilter,
    selectedTagFilter,
  ]);

  // Total active category filters count
  const activeFiltersCount =
    (primaryCategoryFilter !== 'all' ? 1 : 0) +
    (genreFilter !== 'all' ? 1 : 0) +
    (subjectFilter !== 'all' ? 1 : 0) +
    (gradeFilter !== 'all' ? 1 : 0) +
    (selectedTagFilter ? 1 : 0) +
    (stockFilter !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const handleResetAllFilters = () => {
    setPrimaryCategoryFilter('all');
    setGenreFilter('all');
    setSubjectFilter('all');
    setGradeFilter('all');
    setSelectedTagFilter(null);
    setStockFilter('all');
    setSearchQuery('');
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bookSales;
    return bookSales.filter(
      s =>
        s.invoiceNo.toLowerCase().includes(q) ||
        s.bookTitle.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q))
    );
  }, [bookSales, searchQuery]);

  // Handle open Add Modal
  const handleOpenAddModal = (presetIsbn?: string) => {
    setBookTitle('');
    setAuthorPublisher('');
    setBookClass('3');
    setBookCategory('Curriculum');
    setBookGenre('Textbook');
    setBookSubject('English');
    setBookPrice('');
    setBookStock('');
    setBookIsbn(presetIsbn || '');
    setBookTags(['Curriculum', 'Core Curriculum']);
    setTagInput('');
    setBookSupplierId('');
    setBookCostPrice('');
    setIsAddBookModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (book: BookItem) => {
    setEditingBook(book);
    setBookTitle(book.title);
    setAuthorPublisher(book.authorPublisher);
    setBookClass(book.className);
    setBookCategory(book.category || getBookPrimaryCategory(book));
    setBookGenre(book.genre || book.category || 'Textbook');
    setBookSubject(book.subject || 'English');
    setBookPrice(book.price);
    setBookStock(book.stock);
    setBookIsbn(book.isbn || '');
    setBookTags(book.tags || []);
    setBookSupplierId(book.supplierId || '');
    setBookCostPrice(book.costPrice !== undefined ? book.costPrice : '');
    setTagInput('');
    setActiveActionDropdownId(null);
  };

  // Tag helper in Add/Edit form
  const handleAddTagToForm = (tagToAdd?: string) => {
    const t = (tagToAdd || tagInput).trim();
    if (!t) return;
    if (!bookTags.includes(t)) {
      setBookTags([...bookTags, t]);
    }
    setTagInput('');
  };

  const handleRemoveTagFromForm = (tagToRemove: string) => {
    setBookTags(bookTags.filter(t => t !== tagToRemove));
  };

  // Handle open Restock Modal
  const handleOpenRestockModal = (book: BookItem) => {
    setRestockingBook(book);
    setRestockAmount(10);
    setRestockNotes('');
    setActiveActionDropdownId(null);
  };

  // Handle Save (Add / Update) Book
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;

    const priceNum = Number(bookPrice) || 0;
    const stockNum = Number(bookStock) || 0;
    const matchedSupplier = bookSuppliers.find(s => s.id === bookSupplierId);

    if (editingBook) {
      await updateBook({
        ...editingBook,
        title: bookTitle.trim(),
        authorPublisher: authorPublisher.trim() || 'N/A',
        className: bookClass.trim() || '3',
        price: priceNum,
        stock: stockNum,
        genre: bookGenre,
        subject: bookSubject,
        category: bookCategory,
        tags: Array.from(new Set([bookCategory, ...bookTags])),
        isbn: bookIsbn.trim() || undefined,
        supplierId: bookSupplierId || undefined,
        supplierName: matchedSupplier ? matchedSupplier.name : undefined,
        costPrice: bookCostPrice !== '' ? Number(bookCostPrice) : undefined,
      });
      setEditingBook(null);
      setSuccessFeedback(`Updated "${bookTitle}" with new details.`);
    } else {
      await addBook({
        title: bookTitle.trim(),
        authorPublisher: authorPublisher.trim() || 'XYZ',
        className: bookClass.trim() || '3',
        price: priceNum,
        stock: stockNum,
        genre: bookGenre,
        subject: bookSubject,
        category: bookCategory,
        tags: Array.from(new Set([bookCategory, ...bookTags])),
        isbn: bookIsbn.trim() || undefined,
        supplierId: bookSupplierId || undefined,
        supplierName: matchedSupplier ? matchedSupplier.name : undefined,
        costPrice: bookCostPrice !== '' ? Number(bookCostPrice) : undefined,
      });
      setIsAddBookModalOpen(false);
      setSuccessFeedback(`Added "${bookTitle}" to book inventory.`);
    }
    setTimeout(() => setSuccessFeedback(''), 3500);
  };

  // Handle Execute Restock
  const handleExecuteRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingBook) return;

    const added = Math.max(1, Number(restockAmount) || 1);
    const updatedBook: BookItem = {
      ...restockingBook,
      stock: restockingBook.stock + added,
      updatedAt: new Date().toISOString(),
    };

    await updateBook(updatedBook);
    setSuccessFeedback(
      `Restocked "${restockingBook.title}" with +${added} copies! New total stock: ${updatedBook.stock}`
    );
    setRestockingBook(null);
    setTimeout(() => setSuccessFeedback(''), 4000);
  };

  // Handle Open Quick Sell Modal
  const handleOpenSellModal = (book?: BookItem) => {
    const target = book || (books.length > 0 ? books[0] : null);
    if (!target) return;
    setSellingBook(target);
    setSaleBookId(target.id);
    setSaleQuantity(1);
    setSaleStudentId('');
    setSaleCustomerName('');
    setSalePaymentMode('Cash');
    setSaleNotes('');
    setActiveActionDropdownId(null);
  };

  // Execute Sale
  const handleExecuteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBook = books.find(b => b.id === saleBookId);
    if (!targetBook) return;

    const qty = Math.max(1, Number(saleQuantity) || 1);
    if (qty > targetBook.stock) {
      alert(`Cannot sell ${qty} copies. Only ${targetBook.stock} in stock!`);
      return;
    }

    let customer = saleCustomerName.trim();
    if (saleStudentId) {
      const stu = students.find(s => s.id === saleStudentId);
      if (stu) {
        customer = `${stu.fullName} (${stu.className} - Roll #${stu.rollNo})`;
      }
    }
    if (!customer) {
      customer = 'Walk-in Customer';
    }

    const total = qty * targetBook.price;
    const authorizer = currentUser?.fullName || 'Store Incharge';

    const recorded = await recordBookSale({
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      className: targetBook.className,
      quantity: qty,
      unitPrice: targetBook.price,
      totalAmount: total,
      date: new Date().toISOString().split('T')[0],
      customerName: customer,
      studentId: saleStudentId || undefined,
      paymentMode: salePaymentMode,
      notes: saleNotes.trim() || undefined,
      soldBy: authorizer,
    });

    setSellingBook(null);
    setSaleReceiptToView(recorded);
  };

  // Print current view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Books &amp; Institutional Inventory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage school textbooks, bookshop sales, and physical campus assets (furniture, computers, labs, sports &amp; office assets).
          </p>
        </div>

        {/* Prominent Quick-Action QR Scanner Trigger in Header */}
        <div className="flex items-center gap-2">
          {activeTab !== 'assets' && (
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan ISBN / QR Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Top Metric Cards for Books (shown on books/sales/reorders/suppliers tabs) */}
      {activeTab !== 'assets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Titles in Stock */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Titles in Stock
            </p>
            <p className="text-3xl font-bold text-[#2563eb] dark:text-blue-500 mt-2">
              {titlesInStock}
            </p>
            <p className="text-xs text-slate-400 mt-1">Active catalog titles</p>
          </div>

          {/* Card 2: Inventory Value */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Inventory Value
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2 font-mono">
              {currencyLabel} {totalInventoryValue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">Total physical stock value</p>
          </div>

          {/* Card 3: Total Sales Revenue */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Sales Revenue
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-2 font-mono">
              {currencyLabel} {totalSalesRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">Recorded sales collections</p>
          </div>

          {/* Card 4: Low Stock Alert Summary */}
          <div
            onClick={() => setActiveTab('reorders')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm transition hover:shadow-md cursor-pointer ${
              lowStockBooks.length > 0
                ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                : 'border-slate-100 dark:border-slate-800'
            }`}
            title="Click to view Reorder Dashboard & Purchase Orders"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Low Stock Alerts
              </p>
              {lowStockBooks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  &le; {lowStockThreshold} units
                </span>
              )}
            </div>
            <p
              className={`text-2xl font-bold mt-2 font-mono ${
                lowStockBooks.length > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {lowStockBooks.length} {lowStockBooks.length === 1 ? 'Title' : 'Titles'}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>{lowStockBooks.length > 0 ? 'Requires vendor reorder' : 'Healthy inventory'}</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-0.5">
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-[#2563eb] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Book Inventory</span>
          {lowStockBooks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              {lowStockBooks.length} Low
            </span>
          )}
        </button>

        {/* Tab: School Assets & Physical Inventory */}
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'assets'
              ? 'bg-[#2563eb] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>School Assets &amp; Physical Inventory</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'assets'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {assets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'bg-[#2563eb] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Sales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reorders')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'reorders'
              ? 'bg-[#2563eb] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reorder Dashboard</span>
          {lowStockBooks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {lowStockBooks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-[#2563eb] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Suppliers &amp; Vendors</span>
          {bookSuppliers && bookSuppliers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {bookSuppliers.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* LOW-STOCK ALERT BANNER & THRESHOLD CONTROLLER                  */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && lowStockBooks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Low Stock Alert ({lowStockBooks.length} {lowStockBooks.length === 1 ? 'Book' : 'Books'} Below Threshold)</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    Stock &le; {lowStockThreshold} units
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  The titles below have fallen below your replenishment threshold. Use the quick Restock buttons to add inventory.
                </p>
              </div>
            </div>

            {/* Reorder Action & Threshold Adjuster in Banner */}
            <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('reorders')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
                title="Open Reorder Dashboard and export purchase orders"
              >
                <span>Reorder Dashboard &amp; PO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0">
                <span className="text-slate-500 font-medium">Alert Threshold:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={lowStockThreshold}
                    onChange={e => handleUpdateThreshold(Number(e.target.value) || 1)}
                    className="w-14 px-1.5 py-0.5 text-center font-bold font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    title="Adjust minimum stock quantity that triggers alert"
                  />
                  <span className="text-slate-400">units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-action Restock Chips Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {lowStockBooks.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/90 dark:border-amber-800/60 shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                    {b.title}
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    Class {b.className} • Remaining:{' '}
                    <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                      {b.stock}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenRestockModal(b)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5"
                  title={`Quick Restock ${b.title}`}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Restock</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRIMARY CATEGORIZATION SYSTEM: SEGMENTED CATEGORY TABS         */}
      {/* (Curriculum, Stationery, Reference, All)                       */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Category:</span>
            </span>

            {/* All Inventory */}
            <button
              type="button"
              onClick={() => setPrimaryCategoryFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                primaryCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>All Items</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  primaryCategoryFilter === 'all'
                    ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {categoryCounts.all}
              </span>
            </button>

            {/* Curriculum */}
            <button
              type="button"
              onClick={() => setPrimaryCategoryFilter('Curriculum')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                primaryCategoryFilter === 'Curriculum'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                  : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Curriculum</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  primaryCategoryFilter === 'Curriculum'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                }`}
              >
                {categoryCounts.curriculum}
              </span>
            </button>

            {/* Stationery */}
            <button
              type="button"
              onClick={() => setPrimaryCategoryFilter('Stationery')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                primaryCategoryFilter === 'Stationery'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                  : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Stationery</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  primaryCategoryFilter === 'Stationery'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {categoryCounts.stationery}
              </span>
            </button>

            {/* Reference */}
            <button
              type="button"
              onClick={() => setPrimaryCategoryFilter('Reference')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                primaryCategoryFilter === 'Reference'
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/30'
                  : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span>Reference</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  primaryCategoryFilter === 'Reference'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                }`}
              >
                {categoryCounts.reference}
              </span>
            </button>
          </div>

          {/* Quick Category Tag Chips hint */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Quick Tag:</span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('Curriculum')}
              className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-semibold"
            >
              #Curriculum
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('Stationery')}
              className="cursor-pointer hover:underline text-emerald-600 dark:text-emerald-400 font-semibold"
            >
              #Stationery
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('Reference')}
              className="cursor-pointer hover:underline text-purple-600 dark:text-purple-400 font-semibold"
            >
              #Reference
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CATEGORY TAGGING SYSTEM: MULTI-DIMENSIONAL FILTERS TOOLBAR     */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Filter className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Filter Inventory by Category &amp; Tags
              </span>
            </div>

            {/* Reset Filters button if any filter is active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters ({activeFiltersCount})</span>
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid: Genre, Subject, Grade Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* 1. Filter by Genre */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-blue-500" />
                <span>Genre / Type</span>
              </label>
              <select
                value={genreFilter}
                onChange={e => setGenreFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Genres</option>
                {availableGenres.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Filter by Subject */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>Academic Subject</span>
              </label>
              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Filter by Grade Level */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                <span>Grade Level / Class</span>
              </label>
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Grades</option>
                {availableGrades.map(grade => (
                  <option key={grade} value={grade}>
                    Class {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag Cloud Pills Strip */}
          {allUniqueTags.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Filter by Tag:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTagFilter(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  !selectedTagFilter
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Tags
              </button>

              {/* Highlight Core Categorization Tags First: Curriculum, Stationery, Reference */}
              {['Curriculum', 'Stationery', 'Reference'].map(catTag => {
                const isSelected = selectedTagFilter === catTag;
                let colorClasses = '';
                let TagIcon = BookOpen;
                if (catTag === 'Curriculum') {
                  colorClasses = isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100';
                  TagIcon = BookOpen;
                } else if (catTag === 'Stationery') {
                  colorClasses = isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100';
                  TagIcon = Package;
                } else {
                  colorClasses = isSelected
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100';
                  TagIcon = GraduationCap;
                }

                return (
                  <button
                    key={catTag}
                    type="button"
                    onClick={() => setSelectedTagFilter(isSelected ? null : catTag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${colorClasses}`}
                  >
                    <TagIcon className="w-3 h-3" />
                    <span>#{catTag}</span>
                    {isSelected && <X className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}

              {/* Other Custom Tags */}
              {allUniqueTags
                .filter(tag => !['Curriculum', 'Stationery', 'Reference'].includes(tag))
                .map(tag => {
                  const isSelected = selectedTagFilter === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-slate-800 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>#{tag}</span>
                      {isSelected && <X className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Action Toolbar (Matching Screenshot + Scanner Trigger) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Action Buttons & Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'inventory' ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Book</span>
              </button>

                            {/* Clear Bookshop Button */}
              {(books.length > 0 || bookSales.length > 0) && (
                <button
                  type="button"
                  onClick={() => setIsClearBookshopModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 active:scale-95 transition shadow-sm cursor-pointer"
                  title="Clear all book inventory and sales records"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}

              {/* QR Scanner Trigger */}
              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition shadow-sm cursor-pointer"
                title="Scan Book Barcode or QR Code with camera"
              >
                <Camera className="w-4 h-4" />
                <span>Scan ISBN / QR</span>
              </button>

              {/* Filter Pills for Low-Stock */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    stockFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({books.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('low-stock')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    stockFilter === 'low-stock'
                      ? 'bg-amber-500 text-white font-bold shadow-2xs'
                      : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Low Stock ({lowStockBooks.length})</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleOpenSellModal()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] active:scale-95 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Sale</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition shadow-sm cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan &amp; Checkout</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Threshold Config, Search & Print Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Threshold Configurator in Toolbar (Always available for user customization) */}
          {activeTab === 'inventory' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500">Low-Stock Alert:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={lowStockThreshold}
                onChange={e => handleUpdateThreshold(Number(e.target.value) || 1)}
                className="w-12 px-1 py-0.5 text-center font-bold font-mono border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                title="Adjust low stock threshold level"
              />
              <span className="text-slate-400">units</span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder={
                activeTab === 'inventory'
                  ? 'Search by title, author, class, genre, tags, ISBN...'
                  : 'Search by invoice, book, or customer...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Print Button matching screenshot */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1e293b] hover:bg-[#0f172a] active:scale-95 transition shadow-sm cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BOOK INVENTORY TABLE (Exact layout from user screenshot) */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Book Inventory</span>
              <span className="text-xs font-normal text-slate-400 font-mono">
                ({filteredBooks.length} of {books.length} titles)
              </span>
            </h2>

            {/* Filter Indicators */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-slate-400 font-medium">Filtered by:</span>
                {primaryCategoryFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center gap-1">
                    Category: {primaryCategoryFilter}
                    <button
                      onClick={() => setPrimaryCategoryFilter('all')}
                      className="hover:text-blue-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {genreFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold flex items-center gap-1">
                    Genre: {genreFilter}
                    <button onClick={() => setGenreFilter('all')} className="hover:text-blue-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {subjectFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-semibold flex items-center gap-1">
                    Subject: {subjectFilter}
                    <button onClick={() => setSubjectFilter('all')} className="hover:text-indigo-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {gradeFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold flex items-center gap-1">
                    Grade: Class {gradeFilter}
                    <button onClick={() => setGradeFilter('all')} className="hover:text-purple-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedTagFilter && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold flex items-center gap-1">
                    #{selectedTagFilter}
                    <button onClick={() => setSelectedTagFilter(null)} className="hover:text-amber-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f1f5f9] dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold text-xs border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Title &amp; Category Tags</th>
                  <th className="py-3 px-4">Author / Publisher</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Price ({currencyLabel})</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        No books match the selected category filters
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Try resetting genre, subject, or grade level filters to display more books.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetAllFilters}
                          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map(book => {
                    const isLowStock = book.stock <= lowStockThreshold;
                    const isOutOfStock = book.stock === 0;
                    const currentGenre = book.genre || book.category || 'Textbook';
                    const currentSubject = book.subject || 'General';
                    const primaryCat = getBookPrimaryCategory(book);

                    return (
                      <tr
                        key={book.id}
                        className={`transition ${
                          isLowStock
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Title & Tags */}
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {book.title}
                            </span>
                            {isLowStock && (
                              <span
                                className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"
                                title={`Low Stock Alert (Stock ${book.stock} <= ${lowStockThreshold})`}
                              />
                            )}
                          </div>

                          {/* Category Tag Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {/* Primary Category Pill */}
                            {primaryCat === 'Curriculum' && (
                              <span
                                onClick={() => setPrimaryCategoryFilter('Curriculum')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-200 transition"
                                title="Filter by Curriculum category"
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>Curriculum</span>
                              </span>
                            )}
                            {primaryCat === 'Stationery' && (
                              <span
                                onClick={() => setPrimaryCategoryFilter('Stationery')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:bg-emerald-200 transition"
                                title="Filter by Stationery category"
                              >
                                <Package className="w-2.5 h-2.5" />
                                <span>Stationery</span>
                              </span>
                            )}
                            {primaryCat === 'Reference' && (
                              <span
                                onClick={() => setPrimaryCategoryFilter('Reference')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-200 transition"
                                title="Filter by Reference category"
                              >
                                <GraduationCap className="w-2.5 h-2.5" />
                                <span>Reference</span>
                              </span>
                            )}

                            {/* Genre Tag */}
                            <span
                              onClick={() => setGenreFilter(currentGenre)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 transition"
                              title="Filter by this Genre"
                            >
                              {currentGenre}
                            </span>

                            {/* Subject Tag */}
                            {currentSubject && (
                              <span
                                onClick={() => setSubjectFilter(currentSubject)}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer hover:bg-indigo-100 transition"
                                title="Filter by this Subject"
                              >
                                {currentSubject}
                              </span>
                            )}

                            {/* Custom Tags */}
                            {book.tags &&
                              book.tags
                                .filter(t => !['Curriculum', 'Stationery', 'Reference'].includes(t))
                                .map(t => (
                                  <span
                                    key={t}
                                    onClick={() => setSelectedTagFilter(t)}
                                    className="px-1.5 py-0.2 rounded text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition cursor-pointer"
                                    title={`Filter by tag #${t}`}
                                  >
                                    #{t}
                                  </span>
                                ))}

                            {book.isbn && (
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                ISBN: {book.isbn}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Author / Publisher */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {book.authorPublisher}
                        </td>

                        {/* Class / Grade Level */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setGradeFilter(book.className)}
                            className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 transition cursor-pointer"
                            title={`Filter books for Class ${book.className}`}
                          >
                            Class {book.className}
                          </button>
                        </td>

                        {/* Price (PKR) */}
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-medium font-mono">
                          {book.price}
                        </td>

                        {/* Stock (with Low Stock Alert badge when <= threshold) */}
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              <AlertCircle className="w-3 h-3" />
                              <span>Out of Stock (0)</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Low Stock: {book.stock}</span>
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#d1fae5] text-[#065f46] dark:bg-emerald-950 dark:text-emerald-300">
                              {book.stock}
                            </span>
                          )}
                        </td>

                        {/* Actions (Including Dedicated Restock Quick-Action Button & QR Code Viewer) */}
                        <td className="py-3.5 px-4 text-center relative">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* QR Sticker View Button */}
                            <button
                              type="button"
                              onClick={() => setBookForQRCodeView(book)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="View & Print QR Code Sticker"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {/* Prominent Quick-Action 'Restock' button for each low-stock item */}
                            {isLowStock && (
                              <button
                                type="button"
                                onClick={() => handleOpenRestockModal(book)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title={`Quick Restock "${book.title}" (Current stock: ${book.stock})`}
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Restock</span>
                              </button>
                            )}

                            {/* Dropdown Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                setActiveActionDropdownId(
                                  activeActionDropdownId === book.id ? null : book.id
                                )
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>

                          {/* Action Menu Dropdown */}
                          {activeActionDropdownId === book.id && (
                            <div className="absolute right-4 top-10 z-20 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1 text-xs animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  setBookForQRCodeView(book);
                                  setActiveActionDropdownId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium text-left cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                                <span>View QR Sticker</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRestockModal(book)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium text-left cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                                <span>Restock Inventory</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSellModal(book)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-left cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                                <span>Sell Book</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(book)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-left cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit Details &amp; Tags</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
                                    deleteBook(book.id);
                                    setActiveActionDropdownId(null);
                                  }
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Delete Book</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: SCHOOL ASSETS & PHYSICAL INVENTORY                        */}
      {/* ============================================================== */}
      {activeTab === 'assets' && (
        <SchoolAssetsView onNavigateToBooks={() => setActiveTab('inventory')} />
      )}

      {/* ============================================================== */}
      {/* TAB 2: SALES LOG                                               */}
      {/* ============================================================== */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sales Records
            </h2>
            <span className="text-xs text-slate-400">
              Total Recorded Revenue: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{currencyLabel} {totalSalesRevenue.toLocaleString()}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f1f5f9] dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold text-xs border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Customer / Student</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Price ({currencyLabel})</th>
                  <th className="py-3 px-4 text-right">Total ({currencyLabel})</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        No sales recorded yet
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sell books or scan barcodes with the QR Scanner to record sales transactions.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {sale.date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        {sale.bookTitle}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {sale.className}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {sale.customerName || 'Walk-in'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {sale.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {sale.unitPrice}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {sale.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {sale.paymentMode}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSaleReceiptToView(sale)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                            title="Print / View Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Refund / cancel sale #${sale.invoiceNo}? This will restore ${sale.quantity} copies back to stock.`)) {
                                deleteBookSale(sale.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            title="Refund & Restore Stock"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REORDER DASHBOARD & SUMMARY                             */}
      {/* ============================================================== */}
      {activeTab === 'reorders' && (
        <BookshopReordersView
          lowStockThreshold={lowStockThreshold}
          onUpdateThreshold={handleUpdateThreshold}
          onOpenRestockForBook={handleOpenRestockModal}
          onNavigateToSuppliers={() => setActiveTab('suppliers')}
        />
      )}

      {/* ============================================================== */}
      {/* TAB 4: SUPPLIERS & VENDOR DIRECTORY                            */}
      {/* ============================================================== */}
      {activeTab === 'suppliers' && (
        <BookshopSuppliersView
          onOpenRestockForBook={handleOpenRestockModal}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL: QR & ISBN LIVE CAMERA SCANNER                           */}
      {/* ============================================================== */}
      <BookshopQRScannerModal
        isOpen={isQRScannerOpen}
        books={books}
        currencyLabel={currencyLabel}
        lowStockThreshold={lowStockThreshold}
        onClose={() => setIsQRScannerOpen(false)}
        onSelectBookForSale={book => {
          setIsQRScannerOpen(false);
          handleOpenSellModal(book);
        }}
        onSelectBookForRestock={book => {
          setIsQRScannerOpen(false);
          handleOpenRestockModal(book);
        }}
        onAddNewBookWithIsbn={isbn => {
          setIsQRScannerOpen(false);
          handleOpenAddModal(isbn);
        }}
        onEditBook={book => {
          setIsQRScannerOpen(false);
          handleOpenEditModal(book);
        }}
      />

      {/* ============================================================== */}
      {/* MODAL: BOOK QR CODE STICKER VIEWER                             */}
      {/* ============================================================== */}
      <BookQRCodeModal
        book={bookForQRCodeView}
        currencyLabel={currencyLabel}
        onClose={() => setBookForQRCodeView(null)}
      />

      {/* ============================================================== */}
      {/* MODAL: QUICK RESTOCK INVENTORY                                 */}
      {/* ============================================================== */}
      {restockingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/30">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <RotateCw className="w-5 h-5 text-amber-600" />
                <span>Restock Book Inventory</span>
              </h3>
              <button
                type="button"
                onClick={() => setRestockingBook(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRestock} className="p-5 space-y-4 text-xs">
              {/* Target Book Info Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {restockingBook.title}
                  </span>
                  <span className="text-slate-500 font-medium">Class: {restockingBook.className}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Current Stock:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                      restockingBook.stock <= lowStockThreshold
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {restockingBook.stock} units
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Author / Publisher: {restockingBook.authorPublisher}</span>
                  <span>Threshold: {lowStockThreshold} units</span>
                </div>
              </div>

              {/* Quantity to Add */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Add Stock Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={e => setRestockAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">Quick Presets:</span>
                  {[5, 10, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRestockAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                        restockAmount === amt
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Updated Total Stock
                  </span>
                  <span className="text-xs text-slate-300">
                    {restockingBook.stock} current + {restockAmount} added
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {restockingBook.stock + restockAmount}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">units</span>
                  {restockingBook.stock + restockAmount > lowStockThreshold && (
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Resolves low-stock alert</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Notes / Supplier reference */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch / Supplier Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch #2026-B, Supplier invoice #441"
                  value={restockNotes}
                  onChange={e => setRestockNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockingBook(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Confirm Restock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT BOOK (With Genre, Subject, Grade & Tags)     */}
      {/* ============================================================== */}
      {(isAddBookModalOpen || editingBook) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-800/40">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>{editingBook ? 'Edit Book & Category Tags' : 'Add New Book to Inventory'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddBookModalOpen(false);
                  setEditingBook(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-6 space-y-4 text-xs">
              {/* Title & Author */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English Literature Coursebook, Mathematics Explorer"
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Author / Publisher
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oxford University Press, Cambridge, National Book Foundation"
                  value={authorPublisher}
                  onChange={e => setAuthorPublisher(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Categorization: Primary Category, Genre, Subject, Grade Level */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Category Tagging &amp; Classification</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2 border-b border-blue-100 dark:border-blue-900/40">
                  {/* Primary Category */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Category *
                    </label>
                    <select
                      value={bookCategory}
                      onChange={e => {
                        const val = e.target.value;
                        setBookCategory(val);
                        if (val === 'Curriculum' && (bookGenre === 'Note Books' || bookGenre === 'Register' || bookGenre === 'Artpad' || bookGenre === 'Reference')) {
                          setBookGenre('Textbook');
                        } else if (val === 'Stationery' && (bookGenre === 'Textbook' || bookGenre === 'Workbook' || bookGenre === 'Reference')) {
                          setBookGenre('Note Books');
                        } else if (val === 'Reference') {
                          setBookGenre('Reference');
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-700 dark:text-blue-300 cursor-pointer focus:outline-none"
                    >
                      <option value="Curriculum">📚 Curriculum (Textbooks &amp; Syllabi)</option>
                      <option value="Stationery">✏️ Stationery (Notebooks &amp; Registers)</option>
                      <option value="Reference">📖 Reference (Dictionaries &amp; Atlases)</option>
                      <option value="Other">📦 Other</option>
                    </select>
                  </div>

                  {/* Genre */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sub-Type / Genre *
                    </label>
                    <select
                      value={bookGenre}
                      onChange={e => setBookGenre(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
                    >
                      <option value="Textbook">Textbook</option>
                      <option value="Workbook">Workbook</option>
                      <option value="Note Books">Note Books</option>
                      <option value="Worksheet">Worksheet</option>
                      <option value="Artpad">Artpad</option>
                      <option value="Register">Register</option>
                      <option value="Time table">Time table</option>
                      <option value="Reference">Reference</option>
                      <option value="Literature & Fiction">Literature</option>
                      <option value="Exam Prep">Exam Prep</option>
                      <option value="Other">Other Stationery</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Subject */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subject *
                    </label>
                    <select
                      value={bookSubject}
                      onChange={e => setBookSubject(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
                    >
                      <option value="English">English</option>
                      <option value="English B">English B</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Urdu B">Urdu B</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="IT">IT / Computer</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="General Science">General Science</option>
                      <option value="Geography">Geography</option>
                      <option value="Social Studies">Social Studies</option>
                      <option value="Islamiat">Islamiat</option>
                      <option value="Arts & Drawing">Arts &amp; Drawing</option>
                      <option value="General / Office">General / Office</option>
                    </select>
                  </div>

                  {/* Class / Grade Level */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Grade Level / Class *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3, 5, 10 or All Classes"
                      value={bookClass}
                      onChange={e => setBookClass(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Tags Editor */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Custom Category Tags</span>
                  <span className="text-[10px] text-slate-400">Press Enter or click Add</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. Core Syllabus, Oxford Series, STEM"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagToForm();
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddTagToForm()}
                    className="px-3 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs hover:bg-slate-900 transition cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Display Current Tags */}
                {bookTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {bookTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTagFromForm(tag)}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Suggestions */}
                <div className="flex items-center gap-1 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400">Suggestions:</span>
                  {['Curriculum', 'Stationery', 'Reference', 'Core Curriculum', 'Oxford', 'STEM', 'Exam Prep', 'Workbook'].map(sugg => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => handleAddTagToForm(sugg)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950 cursor-pointer transition"
                    >
                      +{sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price, Stock & ISBN */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price ({currencyLabel}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 450"
                    value={bookPrice}
                    onChange={e => setBookPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 23"
                    value={bookStock}
                    onChange={e => setBookStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ISBN / Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 978-969-0-0231-1"
                    value={bookIsbn}
                    onChange={e => setBookIsbn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Vendor / Supplier Link & Procurement Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assigned Supplier / Vendor</span>
                  </label>
                  <select
                    value={bookSupplierId}
                    onChange={e => setBookSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- No Supplier Assigned (Unlinked) --</option>
                    {bookSuppliers &&
                      bookSuppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.contactPerson})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost / Procurement Price ({currencyLabel})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 320 (Purchase cost)"
                    value={bookCostPrice}
                    onChange={e => setBookCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBookModalOpen(false);
                    setEditingBook(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {editingBook ? 'Update Book & Tags' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECORD SALE                                             */}
      {/* ============================================================== */}
      {sellingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span>Sell Book / Issue Invoice</span>
              </h3>
              <button
                type="button"
                onClick={() => setSellingBook(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSale} className="p-5 space-y-4 text-xs">
              {/* Selected Book Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {sellingBook.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sellingBook.stock <= lowStockThreshold
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Stock: {sellingBook.stock}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-xs">
                  <span>Class: {sellingBook.className} • {sellingBook.genre || 'Textbook'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {currencyLabel} {sellingBook.price} / unit
                  </span>
                </div>
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity * (Max available: {sellingBook.stock})
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellingBook.stock}
                  required
                  value={saleQuantity}
                  onChange={e => setSaleQuantity(Math.max(1, Math.min(sellingBook.stock, Number(e.target.value) || 1)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Customer / Student Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student / Customer (Optional)
                </label>
                <select
                  value={saleStudentId}
                  onChange={e => {
                    setSaleStudentId(e.target.value);
                    if (e.target.value) setSaleCustomerName('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs mb-2 cursor-pointer"
                >
                  <option value="">-- Choose Registered Student or type name below --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className} - Roll #{s.rollNo})
                    </option>
                  ))}
                </select>

                {!saleStudentId && (
                  <input
                    type="text"
                    placeholder="Or enter buyer name (e.g. Walk-in Student, Parent)"
                    value={saleCustomerName}
                    onChange={e => setSaleCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={salePaymentMode}
                  onChange={e => setSalePaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Online/UPI">Online Transfer / Card</option>
                  <option value="Bank Transfer">Bank Direct Deposit</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              {/* Total Calculation Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Sale Amount
                  </span>
                  <span className="text-xs text-slate-300">
                    {saleQuantity} × {sellingBook.price} {currencyLabel}
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {currencyLabel} {(saleQuantity * sellingBook.price).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSellingBook(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Confirm &amp; Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PRINTABLE SALE RECEIPT                                  */}
      {/* ============================================================== */}
      {saleReceiptToView && (
        <BookSaleReceiptModal
          sale={saleReceiptToView}
          settings={settings}
          onClose={() => setSaleReceiptToView(null)}
        />
      )}
          {/* Clear Bookshop Confirmation Modal */}
      {isClearBookshopModalOpen && (
        <DataResetConfirmationModal
          isOpen={isClearBookshopModalOpen}
          targetModule="books"
          onClose={() => setIsClearBookshopModalOpen(false)}
        />
      )}

    </div>
  );
};