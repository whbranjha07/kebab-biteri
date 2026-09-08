// ESC/POS Commands & Receipt Generator for Kebab Biteri Thermal Printers

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  restaurantName: string;
  address?: string;
  phone?: string;
  email?: string;
  receiptNumber: string;
  orderNumber: string;
  date: string;
  time: string;
  customerName: string;
  orderType: string;
  cashierName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  changeAmount?: number;
  headerText?: string;
  footerText?: string;
  paperSize?: 'SIZE_58MM' | 'SIZE_80MM' | '58mm' | '80mm';
  openCashDrawer?: boolean;
}

// ESC/POS Control Code Constants
const ESC = 0x1b;
const GS = 0x1d;
const DLE = 0x10;

export const ESC_POS_COMMANDS = {
  HW_INIT: Buffer.from([ESC, 0x40]), // Reset printer
  TXT_CENTER: Buffer.from([ESC, 0x61, 0x01]), // Center text
  TXT_LEFT: Buffer.from([ESC, 0x61, 0x00]), // Left align text
  TXT_RIGHT: Buffer.from([ESC, 0x61, 0x02]), // Right align text
  TXT_BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  TXT_BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  TXT_NORMAL: Buffer.from([ESC, 0x21, 0x00]),
  TXT_DOUBLE_HEIGHT: Buffer.from([ESC, 0x21, 0x10]),
  TXT_DOUBLE_WIDTH: Buffer.from([ESC, 0x21, 0x20]),
  TXT_QUAD: Buffer.from([ESC, 0x21, 0x30]),
  PAPER_FULL_CUT: Buffer.from([GS, 0x56, 0x00]), // Full cut
  PAPER_PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]), // Partial cut
  PAPER_FEED_3: Buffer.from([ESC, 0x64, 0x03]),
  CASH_DRAWER_KICK: Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]), // Pulse pin 2 (Standard cash drawer command)
};

/**
 * Format string column text with proper padding for thermal paper widths
 * 58mm: ~32 characters per line
 * 80mm: ~48 characters per line
 */
export function formatColumn(left: string, right: string, width: number): string {
  const rightStr = right.toString();
  const maxLeftWidth = Math.max(1, width - rightStr.length - 1);
  let leftStr = left.toString();
  if (leftStr.length > maxLeftWidth) {
    leftStr = leftStr.substring(0, maxLeftWidth - 1) + '…';
  }
  const spaces = Math.max(1, width - leftStr.length - rightStr.length);
  return leftStr + ' '.repeat(spaces) + rightStr;
}

export function formatThreeColumn(col1: string, col2: string, col3: string, width: number): string {
  // e.g., Item Name (left), Qty (center), Total (right)
  const c2Str = col2.toString();
  const c3Str = col3.toString();
  const col1MaxWidth = Math.max(1, width - c2Str.length - c3Str.length - 4);
  let c1Str = col1.toString();
  if (c1Str.length > col1MaxWidth) {
    c1Str = c1Str.substring(0, col1MaxWidth - 1) + '…';
  }
  
  const totalRight = c2Str + ' '.repeat(3) + c3Str;
  const spaces = Math.max(1, width - c1Str.length - totalRight.length);
  return c1Str + ' '.repeat(spaces) + totalRight;
}

/**
 * Generate full ESC/POS Buffer for physical receipt printing
 */
export function generateEscPosBuffer(data: ReceiptData): Buffer {
  const is58 = data.paperSize === 'SIZE_58MM' || data.paperSize === '58mm';
  const width = is58 ? 32 : 48;
  const divider = '='.repeat(width) + '\n';
  const subDivider = '-'.repeat(width) + '\n';

  const chunks: Buffer[] = [];

  // Initialize
  chunks.push(ESC_POS_COMMANDS.HW_INIT);

  // Cash Drawer Kick if requested
  if (data.openCashDrawer) {
    chunks.push(ESC_POS_COMMANDS.CASH_DRAWER_KICK);
  }

  // Header Section (Centered)
  chunks.push(ESC_POS_COMMANDS.TXT_CENTER);
  chunks.push(ESC_POS_COMMANDS.TXT_DOUBLE_HEIGHT);
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_ON);
  chunks.push(Buffer.from(`${data.restaurantName || 'KEBAB BITERI'}\n`));
  chunks.push(ESC_POS_COMMANDS.TXT_NORMAL);

  if (data.headerText) {
    chunks.push(Buffer.from(`${data.headerText}\n`));
  }
  if (data.address) {
    chunks.push(Buffer.from(`${data.address}\n`));
  }
  if (data.phone) {
    chunks.push(Buffer.from(`Tel: ${data.phone}\n`));
  }
  
  chunks.push(Buffer.from(divider));

  // Metadata Section (Left Aligned)
  chunks.push(ESC_POS_COMMANDS.TXT_LEFT);
  chunks.push(Buffer.from(formatColumn(`Receipt: ${data.receiptNumber}`, `Order: #${data.orderNumber}`, width) + '\n'));
  chunks.push(Buffer.from(formatColumn(`Date: ${data.date}`, `Time: ${data.time}`, width) + '\n'));
  chunks.push(Buffer.from(`Customer: ${data.customerName || 'Walk-in Customer'}\n`));
  chunks.push(Buffer.from(`Order Type: ${data.orderType}\n`));
  chunks.push(Buffer.from(`Cashier: ${data.cashierName || 'Admin'}\n`));
  chunks.push(Buffer.from(subDivider));

  // Item Table Header
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_ON);
  chunks.push(Buffer.from(formatThreeColumn('ITEM', 'QTY', 'TOTAL', width) + '\n'));
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_OFF);
  chunks.push(Buffer.from(subDivider));

  // Items List
  for (const item of data.items) {
    const priceStr = `€${item.total.toFixed(2)}`;
    const line = formatThreeColumn(item.name, item.quantity.toString(), priceStr, width);
    chunks.push(Buffer.from(line + '\n'));
  }
  chunks.push(Buffer.from(subDivider));

  // Financial Totals
  chunks.push(Buffer.from(formatColumn('Subtotal', `€${data.subtotal.toFixed(2)}`, width) + '\n'));
  if (data.discount > 0) {
    chunks.push(Buffer.from(formatColumn('Discount', `-€${data.discount.toFixed(2)}`, width) + '\n'));
  }
  if (data.tax > 0) {
    chunks.push(Buffer.from(formatColumn('Tax', `€${data.tax.toFixed(2)}`, width) + '\n'));
  }
  
  chunks.push(Buffer.from(divider));

  // Grand Total
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_ON);
  chunks.push(ESC_POS_COMMANDS.TXT_DOUBLE_HEIGHT);
  chunks.push(Buffer.from(formatColumn('TOTAL', `€${data.total.toFixed(2)}`, width) + '\n'));
  chunks.push(ESC_POS_COMMANDS.TXT_NORMAL);
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_OFF);
  chunks.push(Buffer.from(divider));

  // Payment Details
  chunks.push(Buffer.from(`Payment Method: ${(data.paymentMethod || 'CASH').toUpperCase()}\n`));
  if (data.amountReceived !== undefined && data.amountReceived !== null) {
    chunks.push(Buffer.from(formatColumn('Amount Received', `€${data.amountReceived.toFixed(2)}`, width) + '\n'));
  }
  if (data.changeAmount !== undefined && data.changeAmount !== null && data.changeAmount >= 0) {
    chunks.push(Buffer.from(formatColumn('Change Due', `€${data.changeAmount.toFixed(2)}`, width) + '\n'));
  }

  // Footer Section
  chunks.push(Buffer.from(subDivider));
  chunks.push(ESC_POS_COMMANDS.TXT_CENTER);
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_ON);
  chunks.push(Buffer.from(`${data.footerText || 'THANK YOU! VISIT AGAIN'}\n`));
  chunks.push(Buffer.from(`${data.restaurantName || 'KEBAB BITERI'}\n`));
  chunks.push(ESC_POS_COMMANDS.TXT_BOLD_OFF);

  // Feed & Cut Paper
  chunks.push(ESC_POS_COMMANDS.PAPER_FEED_3);
  chunks.push(ESC_POS_COMMANDS.PAPER_PARTIAL_CUT);

  return Buffer.concat(chunks);
}
