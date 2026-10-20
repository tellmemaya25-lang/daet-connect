import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { TransactionWithBooking } from "./payment-contract";
import { formatCurrency } from "./payment-validation";

/**
 * Receipt Generator Module
 * 
 * Task 23: Receipt PDF Template with QR Code
 * 
 * Generates PDF receipts for completed transactions with:
 * - Transaction ID, booking details, payment date, amount, method
 * - Tourist name and operator name
 * - Embedded QR code for verification
 * - Professional formatting and styling
 * - Amount formatted as ₱X,XXX.XX
 * 
 * Acceptance Criteria:
 * - 9.2: Includes transaction ID, booking details, payment info, names
 * - 9.3: Formatted as PDF document
 * - 9.7: QR code embedded in receipt
 * - 13.3: Amount formatted as currency
 */

interface ReceiptData {
  transaction: TransactionWithBooking;
  touristName: string;
  touristEmail: string;
}

/**
 * Generate Receipt PDF
 * 
 * Creates a professional receipt PDF with:
 * - Header with company branding
 * - Transaction details section
 * - Booking information section
 * - Payment details table
 * - QR code for verification
 * - Footer with timestamp
 * 
 * @param data Receipt data with transaction and tourist info
 * @returns PDF buffer ready for upload or download
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const { transaction, touristName, touristEmail } = data;

  // Create PDF document
  const doc = new PDFDocument({
    bufferPages: true,
    size: "A4",
    margin: 50,
  });

  // Collect PDF into buffer
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Generate QR code data URL
  const qrCodeUrl = `https://daet-connect.ph/verify/transaction/${transaction.id}`;
  const qrCode = await QRCode.toDataURL(qrCodeUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 1,
  });

  // Add header
  addHeader(doc, transaction);

  // Add transaction details
  addTransactionDetails(doc, transaction, touristName, touristEmail);

  // Add QR code section
  doc.moveTo(50, doc.y + 20);
  doc.fontSize(12).font("Helvetica-Bold").text("Verification", { underline: true });
  doc.moveDown(10);

  // Add QR code image
  const qrBuffer = Buffer.from(qrCode.split(",")[1], "base64");
  doc.image(qrBuffer, {
    width: 120,
    height: 120,
    align: "center",
  });

  doc.moveDown(10);
  doc.fontSize(9).font("Helvetica").text("Scan QR code to verify this receipt", {
    align: "center",
  }).fillColor("#666");

  // Add footer
  addFooter(doc);

  // Finalize PDF
  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    doc.on("error", reject);
  });
}

/**
 * Add header section to PDF
 */
function addHeader(
  doc: InstanceType<typeof PDFDocument>,
  transaction: TransactionWithBooking
) {
  const pageWidth = doc.page.width;

  // Title
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("DAET-CONNECT", 50, 50, {
      align: "left",
    })
    .fontSize(10)
    .font("Helvetica")
    .text("Tourism & Tours Booking Platform", 50, 75, {
      align: "left",
    });

  // Receipt label
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("PAYMENT RECEIPT", pageWidth - 200, 50, {
      align: "right",
    });

  // Receipt info
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(`Receipt ID: ${transaction.id}`, pageWidth - 200, 75, {
      align: "right",
    })
    .text(
      `Date: ${new Date(transaction.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      {
        align: "right",
      }
    );

  // Separator line
  doc.moveTo(50, doc.y + 10).lineTo(pageWidth - 50, doc.y + 10).stroke();
  doc.moveDown(20);
}

/**
 * Add transaction details section
 */
function addTransactionDetails(
  doc: InstanceType<typeof PDFDocument>,
  transaction: TransactionWithBooking,
  touristName: string,
  touristEmail: string
) {
  const booking = transaction.bookings;
  const packageInfo = booking?.packages;
  const operator = packageInfo?.profiles;

  // Tourist information
  doc.fontSize(11).font("Helvetica-Bold").text("Customer Information", {
    underline: true,
  });
  doc.fontSize(10).font("Helvetica").moveDown(5);

  doc
    .text(`Name: ${touristName}`)
    .text(`Email: ${touristEmail}`)
    .text(`Tourist ID: ${booking?.tourist_id || "N/A"}`);

  doc.moveDown(10);

  // Booking information
  doc.fontSize(11).font("Helvetica-Bold").text("Booking Details", {
    underline: true,
  });
  doc.fontSize(10).font("Helvetica").moveDown(5);

  doc
    .text(`Package: ${packageInfo?.title || "Tour Package"}`)
    .text(`Location: ${packageInfo?.location_name || "N/A"}`)
    .text(
      `Booking Date: ${booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString() : "N/A"}`
    )
    .text(`Booking ID: ${booking?.id || "N/A"}`);

  if (operator?.full_name) {
    doc.text(`Operator: ${operator.full_name}`);
  }

  doc.moveDown(10);

  // Payment information table
  doc.fontSize(11).font("Helvetica-Bold").text("Payment Information", {
    underline: true,
  });
  doc.fontSize(10).font("Helvetica").moveDown(5);

  const tableStartY = doc.y;
  const pageWidth = doc.page.width;

  // Table headers
  const col1 = 50;
  const col2 = 200;
  const col3 = 350;

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Description", col1, tableStartY)
    .text("Value", col2, tableStartY)
    .text("Details", col3, tableStartY);

  doc.moveTo(50, doc.y + 5).lineTo(pageWidth - 50, doc.y + 5).stroke();
  doc.moveDown(10);

  // Table rows
  const tableY = doc.y;
  doc.fontSize(9).font("Helvetica");

  doc
    .text("Amount", col1, tableY)
    .text(formatCurrency(transaction.amount / 100), col2, tableY)
    .text(`${transaction.currency}`, col3, tableY);

  doc.moveDown(15);

  doc
    .text("Payment Method", col1, doc.y)
    .text(transaction.payment_method ? transaction.payment_method.toUpperCase() : "Card", col2, doc.y)
    .text("Completed", col3, doc.y);

  doc.moveDown(15);

  doc
    .text("Status", col1, doc.y)
    .text(transaction.status.toUpperCase(), col2, doc.y)
    .text(new Date(transaction.created_at).toLocaleDateString(), col3, doc.y);

  doc.moveDown(10);
  doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
  doc.moveDown(10);

  // Total
  doc.fontSize(12).font("Helvetica-Bold");
  const totalY = doc.y;
  doc.text("TOTAL PAID", 50, totalY);
  doc.fontSize(16).text(formatCurrency(transaction.amount / 100), 350, totalY, {
    align: "right",
  });

  doc.moveDown(15);
}

/**
 * Add footer section
 */
function addFooter(doc: InstanceType<typeof PDFDocument>) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;

  // Separator line
  doc.moveTo(50, pageHeight - 80).lineTo(pageWidth - 50, pageHeight - 80).stroke();

  // Footer text
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#999")
    .text(
      "This is a computer-generated receipt. No signature is required.",
      50,
      pageHeight - 70,
      { align: "center" }
    )
    .text("For inquiries, contact: support@daet-connect.ph", {
      align: "center",
    })
    .text(
      `Generated: ${new Date().toLocaleString()}`,
      {
        align: "center",
      }
    );

  // Page number
  doc
    .fontSize(8)
    .text(`Page 1`, pageWidth / 2 - 10, pageHeight - 30, { align: "center" });
}

/**
 * Validate receipt data before generation
 */
export function validateReceiptData(data: ReceiptData): {
  valid: boolean;
  error?: string;
} {
  if (!data.transaction) {
    return { valid: false, error: "Transaction data is required" };
  }

  if (data.transaction.status !== "completed") {
    return {
      valid: false,
      error: "Receipt can only be generated for completed transactions",
    };
  }

  if (!data.touristName) {
    return { valid: false, error: "Tourist name is required" };
  }

  if (!data.touristEmail) {
    return { valid: false, error: "Tourist email is required" };
  }

  return { valid: true };
}

/**
 * Generate receipt file name
 */
export function generateReceiptFileName(transactionId: string): string {
  return `${transactionId}.pdf`;
}

/**
 * Generate receipt storage path
 */
export function generateReceiptPath(touristId: string, transactionId: string): string {
  return `${touristId}/${generateReceiptFileName(transactionId)}`;
}
