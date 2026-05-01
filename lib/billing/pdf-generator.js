/**
 * PDF Invoice Generator
 * Generates PDF invoices using jsPDF
 */

import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateInvoicePDF(invoice, organization) {
    const doc = new jsPDF()

    // Company header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 105, 20, { align: 'center' })

    // Company details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Quinite Technologies', 14, 35)
    doc.text('Vantage CRM Platform', 14, 40)
    doc.text('support@quinite.co', 14, 45)

    // Invoice details
    doc.setFont('helvetica', 'bold')
    doc.text('Invoice Number:', 140, 35)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.invoice_number, 180, 35)

    doc.setFont('helvetica', 'bold')
    doc.text('Invoice Date:', 140, 40)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(invoice.created_at).toLocaleDateString(), 180, 40)

    doc.setFont('helvetica', 'bold')
    doc.text('Due Date:', 140, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(invoice.due_date).toLocaleDateString(), 180, 45)

    // Bill to
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 60)
    doc.setFont('helvetica', 'normal')
    doc.text(organization.name || 'Organization', 14, 65)
    if (organization.email) {
        doc.text(organization.email, 14, 70)
    }

    // Billing period
    doc.setFont('helvetica', 'bold')
    doc.text('Billing Period:', 14, 80)
    doc.setFont('helvetica', 'normal')
    const periodText = `${new Date(invoice.billing_period_start).toLocaleDateString()} - ${new Date(invoice.billing_period_end).toLocaleDateString()}`
    doc.text(periodText, 14, 85)

    // Line items table
    const tableData = []

    if (invoice.line_items && invoice.line_items.length > 0) {
        invoice.line_items.forEach(item => {
            tableData.push([
                item.description,
                item.quantity.toString(),
                `₹${parseFloat(item.unit_price).toFixed(2)}`,
                `₹${parseFloat(item.amount).toFixed(2)}`
            ])
        })
    }

    doc.autoTable({
        startY: 95,
        head: [['Description', 'Quantity', 'Unit Price', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        }
    })

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10

    // Subtotal
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', 140, finalY)
    doc.text(`₹${parseFloat(invoice.subtotal).toFixed(2)}`, 190, finalY, { align: 'right' })

    // Tax
    doc.text(`Tax (${invoice.tax_percentage}%):`, 140, finalY + 5)
    doc.text(`₹${parseFloat(invoice.tax_amount).toFixed(2)}`, 190, finalY + 5, { align: 'right' })

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 140, finalY + 15)
    doc.text(`₹${parseFloat(invoice.total_amount).toFixed(2)}`, 190, finalY + 15, { align: 'right' })

    // Payment status
    if (invoice.status === 'paid') {
        doc.setFontSize(10)
        doc.setTextColor(0, 128, 0)
        doc.text('PAID', 14, finalY + 15)
        if (invoice.paid_at) {
            doc.setFont('helvetica', 'normal')
            doc.text(`Paid on: ${new Date(invoice.paid_at).toLocaleDateString()}`, 14, finalY + 20)
        }
    } else if (invoice.status === 'overdue') {
        doc.setTextColor(255, 0, 0)
        doc.text('OVERDUE', 14, finalY + 15)
    }

    // Footer
    doc.setTextColor(128, 128, 128)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Thank you for your business!', 105, 280, { align: 'center' })
    doc.text('For any queries, please contact support@quinite.co', 105, 285, { align: 'center' })

    return doc
}

export function downloadInvoicePDF(invoice, organization) {
    const doc = generateInvoicePDF(invoice, organization)
    doc.save(`${invoice.invoice_number}.pdf`)
}

export function getInvoicePDFBlob(invoice, organization) {
    const doc = generateInvoicePDF(invoice, organization)
    return doc.output('blob')
}
