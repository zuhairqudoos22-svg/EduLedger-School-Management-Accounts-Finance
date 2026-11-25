import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { BookItem } from '../../types';
import { BackButton } from '../common/BackButton';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  RotateCw,
  Plus,
  Edit2,
  ArrowRight,
  BookOpen,
  Tag,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BookshopQRScannerModalProps {
  isOpen: boolean;
  books: BookItem[];
  currencyLabel: string;
  lowStockThreshold: number;
  onClose: () => void;
  onSelectBookForSale: (book: BookItem) => void;
  onSelectBookForRestock: (book: BookItem) => void;
  onAddNewBookWithIsbn: (isbn: string) => void;
  onEditBook: (book: BookItem) => void;
}

export const BookshopQRScannerModal: React.FC<BookshopQRScannerModalProps> = ({
  isOpen,
  books,
  currencyLabel,
  lowStockThreshold,
  onClose,
  onSelectBookForSale,
  onSelectBookForRestock,
  onAddNewBookWithIsbn,
  onEditBook,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedBook, setMatchedBook] = useState<BookItem | null>(null);
  const [manualIsbnInput, setManualIsbnInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play synthetic chime on successful scan
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, []);

  // Lookup matching book by ISBN, ID, or JSON payload
  const findBookByScannedValue = useCallback((rawValue: string): { isbn: string; book: BookItem | null } => {
    const cleanStr = rawValue.trim();
    let targetIsbn = cleanStr;

    // Check if JSON QR payload
    if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanStr);
        if (parsed.id) {
          const directMatch = books.find(b => b.id === parsed.id);
          if (directMatch) return { isbn: directMatch.isbn || parsed.isbn || cleanStr, book: directMatch };
        }
        if (parsed.isbn) {
          targetIsbn = parsed.isbn;
        }
      } catch {
        // Fallback to literal string
      }
    }

    // Match by ISBN (case-insensitive and trimmed)
    const match = books.find(b => {
      if (!b.isbn) return false;
      const bIsbnClean = b.isbn.replace(/[-\s]/g, '').toLowerCase();
      const searchClean = targetIsbn.replace(/[-\s]/g, '').toLowerCase();
      return bIsbnClean === searchClean || b.isbn.toLowerCase() === targetIsbn.toLowerCase() || b.id === targetIsbn;
    });

    return { isbn: targetIsbn, book: match || null };
  }, [books]);

  // Handle scanned payload
  const handleBarcodeDetected = useCallback((data: string) => {
    playBeep();
    setIsScanning(false);
    const { isbn, book } = findBookByScannedValue(data);
    setScannedResult(isbn);
    setMatchedBook(book);
  }, [findBookByScannedValue, playBeep]);

  // Camera frame loop
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleBarcodeDetected(code.data);
          return;
        }
      }
    }

    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [handleBarcodeDetected, isScanning]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'Unable to access camera. Please allow camera permissions or use the Image Upload or Manual ISBN tabs.'
      );
    }
  }, [tick]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize camera when open
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, scannedResult, startCamera, stopCamera]);

  // Image Upload Scanner
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleBarcodeDetected(code.data);
        } else {
          alert('No readable QR code found in this image. Please try a clearer picture.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Reset scanner to scan another book
  const handleResetScanner = () => {
    setScannedResult(null);
    setMatchedBook(null);
    setIsScanning(true);
    setManualIsbnInput('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Manual ISBN check
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIsbnInput.trim()) return;
    handleBarcodeDetected(manualIsbnInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in my-6">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <BackButton
              onClick={() => {
                stopCamera();
                onClose();
              }}
              label="Back"
              variant="modal"
            />
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-sm ml-1">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Bookshop QR &amp; ISBN Scanner
              </h3>
              <p className="text-xs text-slate-500">
                Scan book barcodes / QR codes to check stock, checkout, or add inventory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* POST-SCAN RESULT ACTION HUB                                    */}
        {/* ============================================================== */}
        {scannedResult ? (
          <div className="p-6 space-y-5 animate-in fade-in">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Scanned Code / ISBN
                </span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {scannedResult}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetScanner}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another</span>
              </button>
            </div>

            {/* Case A: Book Found in Inventory */}
            {matchedBook ? (
              <div className="space-y-4">
                {/* Book Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <h4 className="font-black text-base text-slate-900 dark:text-white">
                          {matchedBook.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 pl-7">
                        Author / Publisher: <strong>{matchedBook.authorPublisher}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-mono font-black text-slate-900 dark:text-white block">
                        {currencyLabel} {matchedBook.price}
                      </span>
                      <span className="text-[10px] text-slate-400">Unit Price</span>
                    </div>
                  </div>

                  {/* Stock Status Banner */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Stock Level:
                    </span>
                    <div className="flex items-center gap-2">
                      {matchedBook.stock === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          Out of Stock (0)
                        </span>
                      ) : matchedBook.stock <= lowStockThreshold ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Stock: {matchedBook.stock} units left</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {matchedBook.stock} units available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Details */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                      Class {matchedBook.className}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                      {matchedBook.genre || 'Textbook'}
                    </span>
                    {matchedBook.subject && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {matchedBook.subject}
                      </span>
                    )}
                  </div>
                </div>

                {/* Instant Actions Grid */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Choose Action for This Book:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Action 1: Process Checkout */}
                    <button
                      type="button"
                      disabled={matchedBook.stock <= 0}
                      onClick={() => {
                        stopCamera();
                        onClose();
                        onSelectBookForSale(matchedBook);
                      }}
                      className={`p-3 rounded-2xl text-left border transition shadow-xs flex items-center justify-between cursor-pointer ${
                        matchedBook.stock > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 active:scale-95'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-5 h-5 shrink-0" />
                        <div>
                          <span className="font-bold text-xs block">Process Checkout</span>
                          <span className="text-[10px] opacity-80">
                            {matchedBook.stock > 0 ? 'Sell to student / customer' : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Action 2: Quick Restock */}
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        onClose();
                        onSelectBookForRestock(matchedBook);
                      }}
                      className="p-3 rounded-2xl text-left bg-amber-500 hover:bg-amber-600 text-white border border-amber-400 transition shadow-xs flex items-center justify-between cursor-pointer active:scale-95"
                    >
                      <div className="flex items-center gap-2.5">
                        <RotateCw className="w-5 h-5 shrink-0" />
                        <div>
                          <span className="font-bold text-xs block">Restock Quantity</span>
                          <span className="text-[10px] opacity-80">Add more units to stock</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Secondary Action: Edit Details */}
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onEditBook(matchedBook);
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Book Information &amp; Tags</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Case B: Book Not Found in Catalog */
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Book Not Found in Catalog
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    No book with ISBN <strong>{scannedResult}</strong> currently exists in your school database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onAddNewBookWithIsbn(scannedResult);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Book with this ISBN</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* SCANNER INTERFACE (Camera / Upload / Manual)                   */
          /* ============================================================== */
          <div className="p-6 space-y-4">
            {/* Mode Selector Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manual ISBN</span>
              </button>
            </div>

            {/* TAB 1: LIVE CAMERA SCANNER */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                {cameraError ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-2 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Retry Camera Access
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Viewfinder Target Reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                      <div className="relative w-56 h-56 border-2 border-dashed border-blue-400/80 rounded-2xl">
                        {/* Corner brackets */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                        {/* Animated Laser Scan Line */}
                        <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-xs">
                        Point camera at Book QR Code or Barcode
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: IMAGE UPLOAD SCANNER */}
            {activeTab === 'upload' && (
              <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3">
                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload a photo or screenshot of the QR code
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, or WEBP book photos
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-sm">
                  <span>Browse Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* TAB 3: MANUAL ISBN SIMULATOR / LOOKUP */}
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <form onSubmit={handleManualSearch} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Type or Paste Book ISBN
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 978-969-0-0231-1"
                        value={manualIsbnInput}
                        onChange={e => setManualIsbnInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Lookup
                      </button>
                    </div>
                  </div>
                </form>

                {/* Quick Test Chips from Catalog */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    Quick-Test with Catalog Books:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {books.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleBarcodeDetected(b.isbn || b.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/70 text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {b.title} ({b.className})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleBarcodeDetected('978-000-NEW-BOOK')}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer"
                    >
                      + Test Unregistered ISBN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
