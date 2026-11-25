import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BookItem } from '../../types';
import { BackButton } from '../common/BackButton';
import { X, Printer, Download, QrCode } from 'lucide-react';

interface BookQRCodeModalProps {
  book: BookItem | null;
  currencyLabel: string;
  onClose: () => void;
}

export const BookQRCodeModal: React.FC<BookQRCodeModalProps> = ({
  book,
  currencyLabel,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!book) return;
    const qrPayload = JSON.stringify({
      isbn: book.isbn || `BOOK-${book.id}`,
      id: book.id,
      title: book.title,
      price: book.price,
      class: book.className,
    });

    QRCode.toDataURL(
      book.isbn || qrPayload,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [book]);

  if (!book) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in print:border-none print:shadow-none print:w-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <div className="flex items-center gap-1.5 ml-1">
              <QrCode className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Book ISBN QR Code
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div>
            <h4 className="font-black text-base text-slate-900 dark:text-white">
              {book.title}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Class {book.className} • {book.authorPublisher}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs inline-block">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${book.title}`}
                className="w-48 h-48 mx-auto"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>ISBN / Barcode:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {book.isbn || `BOOK-${book.id}`}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300 mt-1">
              <span>Unit Price:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {currencyLabel} {book.price}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300 mt-1">
              <span>Stock on Hand:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {book.stock} units
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Scan this QR code with the Bookshop Scanner to instantly check stock, process checkouts, or restock.
          </p>

          <div className="flex items-center gap-2 pt-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sticker</span>
            </button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`${book.title.replace(/\s+/g, '_')}_QR.png`}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Download QR Image"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
