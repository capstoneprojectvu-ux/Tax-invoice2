import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define interfaces for type safety
interface InvoiceItem {
  slNo: number;
  description: string;
  hsnSac: string;
  quantity: string;
  rate: number;
  unit: string;
  amount: number;
}

interface CompanyDetails {
  name: string;
  address: string[];
  gstin: string;
  state: string;
  stateCode: string;
  contact: string[];
  email: string;
  website: string;
  logo?: string;
}

interface BuyerDetails {
  name: string;
  address: string[];
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  placeOfSupply: string;
}

interface InvoiceDetails {
  invoiceNo: string;
  invoiceDate: string;
  eWayBillNo?: string;
  deliveryNote?: string;
  referenceNo?: string;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  billOfLadingNo?: string;
  billOfLadingDate?: string;
  modeOfPayment: string;
  otherReferences?: string;
  deliveryNoteDate?: string;
  destination?: string;
  motorVehicleNo?: string;
  termsOfDelivery?: string;
}

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNo: string;
  branchAndIFSC: string;
  swiftCode?: string;
}

interface InvoicePdfProps {
  company: CompanyDetails;
  buyer: BuyerDetails;
  invoiceDetails: InvoiceDetails;
  items: InvoiceItem[];
  igstRate: number;
  previousBalance?: number;
  bankDetails: BankDetails;
  qrCode?: string;
  notes?: string;
}

// Create comprehensive styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 20,
  },
  container: {
    border: '2px solid #000',
  },
  header: {
    fontSize: 14,
    textAlign: 'center',
    padding: 8,
    borderBottom: '1px solid #000',
    fontFamily: 'Helvetica-Bold',
  },
  headerSubtext: {
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  topSection: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  sellerSection: {
    width: '50%',
    padding: 10,
    borderRight: '1px solid #000',
  },
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 8,
    marginBottom: 2,
  },
  boldLabel: {
    fontFamily: 'Helvetica-Bold',
  },
  invoiceDetailsSection: {
    width: '50%',
  },
  detailRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  detailCell: {
    padding: 4,
    fontSize: 7,
    borderRight: '1px solid #000',
  },
  detailCellLast: {
    padding: 4,
    fontSize: 7,
  },
  detailLabel: {
    width: '25%',
    fontFamily: 'Helvetica-Bold',
  },
  detailValue: {
    width: '25%',
  },
  tableSection: {
    marginTop: 10,
    borderBottom: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
    backgroundColor: '#f0f0f0',
  },
  tableHeaderCell: {
    padding: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    borderRight: '1px solid #000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #000',
  },
  tableCell: {
    padding: 4,
    fontSize: 7,
    borderRight: '1px solid #000',
  },
  totalsSection: {
    padding: 10,
    borderBottom: '1px solid #000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  notesSection: {
    padding: 10,
    fontSize: 7,
  },
  footerNote: {
    textAlign: 'center',
    padding: 5,
    fontSize: 7,
    borderTop: '1px solid #000',
  },
});

const InvoicePdf: React.FC<InvoicePdfProps> = ({
  company,
  buyer,
  invoiceDetails,
  items,
  igstRate,
  previousBalance = 0,
  bankDetails,
  notes,
}) => {
  // ✅ SAFE CALCULATION - handles empty arrays
  const calculateTotals = () => {
    try {
      const subtotal = Array.isArray(items) && items.length > 0
        ? items.reduce((sum, item) => sum + (item.amount || 0), 0)
        : 0;
      const igstAmount = (subtotal * (igstRate || 0)) / 100;
      const roundOff = Math.round((subtotal + igstAmount) * 100) / 100 - (subtotal + igstAmount);
      const grandTotal = subtotal + igstAmount + roundOff;
      const currentBalance = (previousBalance || 0) + grandTotal;

      return {
        subtotal,
        igstAmount,
        roundOff,
        grandTotal,
        currentBalance,
      };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return {
        subtotal: 0,
        igstAmount: 0,
        roundOff: 0,
        grandTotal: 0,
        currentBalance: previousBalance || 0,
      };
    }
  };

  const { subtotal, igstAmount, roundOff, grandTotal } = calculateTotals();

  // ✅ SAFE STRING PARSING
  const totalQuantity = Array.isArray(items) && items.length > 0
    ? items.reduce((sum, item) => {
        try {
          const qty = parseFloat(String(item.quantity || '0').replace(/[^\d.-]/g, ''));
          return sum + (isNaN(qty) ? 0 : qty);
        } catch {
          return sum;
        }
      }, 0)
    : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text>
              Tax Invoice <Text style={styles.headerSubtext}>(ORIGINAL FOR RECIPIENT)</Text>
            </Text>
          </View>

          {/* Top Section - Seller & Invoice Details */}
          <View style={styles.topSection}>
            {/* Seller Details */}
            <View style={styles.sellerSection}>
              <Text style={styles.companyName}>{company?.name || ''}</Text>
              {Array.isArray(company?.address) && company.address.map((line, idx) => (
                <Text key={idx} style={styles.companyDetail}>{line || ''}</Text>
              ))}
              {company?.gstin && (
                <Text style={styles.companyDetail}>
                  <Text style={styles.boldLabel}>GSTIN/UIN: </Text>{company.gstin}
                </Text>
              )}
              {company?.state && (
                <Text style={styles.companyDetail}>
                  <Text style={styles.boldLabel}>State: </Text>{company.state} {company.stateCode ? `(${company.stateCode})` : ''}
                </Text>
              )}
              {Array.isArray(company?.contact) && company.contact.length > 0 && (
                <Text style={styles.companyDetail}>
                  <Text style={styles.boldLabel}>Contact: </Text>{company.contact.filter(Boolean).join(', ')}
                </Text>
              )}
              {company?.email && (
                <Text style={styles.companyDetail}>
                  <Text style={styles.boldLabel}>E-Mail: </Text>{company.email}
                </Text>
              )}
              {company?.website && (
                <Text style={styles.companyDetail}>{company.website}</Text>
              )}
            </View>

            {/* Invoice Details Table */}
            <View style={styles.invoiceDetailsSection}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailCell, styles.detailLabel]}>Invoice No.</Text>
                <Text style={[styles.detailCell, styles.detailValue]}>{invoiceDetails?.invoiceNo || ''}</Text>
                <Text style={[styles.detailCell, styles.detailLabel]}>Date</Text>
                <Text style={[styles.detailCellLast, styles.detailValue]}>{invoiceDetails?.invoiceDate || ''}</Text>
              </View>
            </View>
          </View>

          {/* Buyer Details */}
          <View style={{ padding: 10, borderBottom: '1px solid #000' }}>
            <Text style={styles.boldLabel}>Bill To:</Text>
            <Text style={styles.companyDetail}>{buyer?.name || ''}</Text>
            {Array.isArray(buyer?.address) && buyer.address.map((line, idx) => (
              <Text key={idx} style={styles.companyDetail}>{line || ''}</Text>
            ))}
            {buyer?.gstin && (
              <Text style={styles.companyDetail}>
                <Text style={styles.boldLabel}>GSTIN: </Text>{buyer.gstin}
              </Text>
            )}
          </View>

          {/* Items Table */}
          {Array.isArray(items) && items.length > 0 && (
            <View style={styles.tableSection}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '8%' }]}>SL</Text>
                <Text style={[styles.tableHeaderCell, { width: '32%' }]}>Description</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Rate</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Amount</Text>
              </View>
              {items.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '8%' }]}>{item.slNo || idx + 1}</Text>
                  <Text style={[styles.tableCell, { width: '32%' }]}>{item.description || ''}</Text>
                  <Text style={[styles.tableCell, { width: '12%' }]}>{item.quantity || '0'}</Text>
                  <Text style={[styles.tableCell, { width: '12%' }]}>{item.rate || 0}</Text>
                  <Text style={[styles.tableCell, { width: '18%' }]}>{item.amount || 0}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            {igstAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IGST ({igstRate}%):</Text>
                <Text style={styles.totalValue}>₹{igstAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={{ ...styles.totalRow, borderTop: '1px solid #000', paddingTop: 4, marginTop: 4 }}>
              <Text style={styles.totalLabel}>GRAND TOTAL:</Text>
              <Text style={styles.totalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes */}
          {notes && (
            <View style={styles.notesSection}>
              <Text style={styles.boldLabel}>Notes:</Text>
              <Text>{notes}</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footerNote}>
            <Text>Thank you for your business!</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePdf;
