export function formatCurrency(amount: number, symbol = 'PKR'): string {
  const safeSymbol = symbol || 'PKR';
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  const sep = safeSymbol.length > 1 && !safeSymbol.endsWith(' ') ? ' ' : '';
  return `${safeSymbol}${sep}${formatted}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    // If dateString is standard ISO format "YYYY-MM-DD" or starts with it,
    // parse components directly to avoid UTC timezone off-by-one shifts in negative UTC offsets
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      const parts = dateString.slice(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${day}/${month}/${year}, ${timeStr}`;
  } catch {
    return dateString;
  }
}

export const formatDateDisplay = formatDate;

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthName(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export { exportToCSV, exportToExcel } from './exportUtils';

export function amountToWords(num: number, currencyName = 'Dollars'): string {
  if (!num || isNaN(num) || num === 0) return `Zero ${currencyName} Only`;

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '') + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 1000000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + 'Million ' + inWords(n % 1000000);
    return inWords(Math.floor(n / 1000000000)) + 'Billion ' + inWords(n % 1000000000);
  }

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = inWords(integerPart).trim();
  if (!result) result = 'Zero';
  result += ` ${currencyName}`;

  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart).trim() + ' Cents';
  }

  return result + ' Only';
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_backup_${getTodayDateString()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
