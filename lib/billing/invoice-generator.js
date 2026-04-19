/**
 * Invoice Generation Utility
 * Generates monthly invoices for organizations based on subscription and usage
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Generate invoice number in format: INV-YYYYMM-XXXXX
 * @returns {Promise<string>}
 */
async function generateInvoiceNumber() {
    const supabase = await createServerSupabaseClient()
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')

    // Get count of invoices this month
    const { count } = await supabase
        .from('billing_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const sequence = String((count || 0) + 1).padStart(5, '0')
    return `INV-${yearMonth}-${sequence}`
}

/**
 * Calculate tax amount based on country
 * @param {number} subtotal - Subtotal amount
 * @param {string} countryCode - Country code
 * @returns {Promise<{taxPercentage: number, taxAmount: number}>}
 */
async function calculateTax(subtotal, countryCode) {
    // Default tax rates by country
    const taxRates = {
        'IN': 18.00, // GST
        'US': 0.00,  // Varies by state, handle separately
        'GB': 20.00, // VAT
    }

    const taxPercentage = taxRates[countryCode] || 0
    const taxAmount = (subtotal * taxPercentage) / 100

    return {
        taxPercentage,
        taxAmount: Math.round(taxAmount * 100) / 100
    }
}

/**
 * Generate monthly invoice for an organization
 * @param {string} organizationId - Organization UUID
 * @param {Date} periodStart - Billing period start date
 * @param {Date} periodEnd - Billing period end date
 * @returns {Promise<{success: boolean, invoice: object|null, error: string|null}>}
 */
export async function generateMonthlyInvoice(organizationId, periodStart, periodEnd) {
    const supabase = await createServerSupabaseClient()

    try {
        // Get organization details
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('name, country_code')
            .eq('id', organizationId)
            .single()

        if (orgError || !org) {
            return {
                success: false,
                invoice: null,
                error: 'Organization not found'
            }
        }

        // Get subscription details
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(*)')
            .eq('organization_id', organizationId)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (subError || !subscription) {
            return {
                success: false,
                invoice: null,
                error: 'No active subscription found'
            }
        }

        // Get country pricing
        const { data: pricing, error: pricingError } = await supabase
            .from('country_pricing')
            .select('*')
            .eq('country_code', org.country_code || 'IN')
            .single()

        if (pricingError || !pricing) {
            return {
                success: false,
                invoice: null,
                error: 'Pricing information not found'
            }
        }

        const lineItems = []
        let subscriptionAmount = 0
        let creditsAmount = 0

        // Calculate subscription charges (flat plan price)
        const planPrice = subscription.billing_cycle === 'yearly'
            ? (subscription.plan?.price_yearly || 0)
            : (subscription.plan?.price_monthly || 0)

        if (planPrice > 0) {
            subscriptionAmount = planPrice
            lineItems.push({
                description: `${subscription.plan?.name || 'Plan'} subscription (${subscription.billing_cycle || 'monthly'})`,
                quantity: 1,
                unit_price: planPrice,
                amount: planPrice,
                type: 'subscription'
            })
        }

        // Calculate credit consumption charges
        const { data: creditTransactions } = await supabase
            .from('credit_transactions')
            .select('amount')
            .eq('organization_id', organizationId)
            .eq('transaction_type', 'consumption')
            .gte('created_at', periodStart.toISOString())
            .lte('created_at', periodEnd.toISOString())

        if (creditTransactions && creditTransactions.length > 0) {
            const totalCreditsConsumed = creditTransactions.reduce(
                (sum, txn) => sum + Math.abs(parseFloat(txn.amount)),
                0
            )

            // 4 Rupees = 1 Credit
            creditsAmount = totalCreditsConsumed * pricing.call_credit_rate

            lineItems.push({
                description: `Call Credits - ${totalCreditsConsumed.toFixed(2)} credits consumed`,
                quantity: totalCreditsConsumed,
                unit_price: pricing.call_credit_rate,
                amount: creditsAmount,
                type: 'credits'
            })
        }

        const subtotal = subscriptionAmount + creditsAmount

        // Calculate tax
        const { taxPercentage, taxAmount } = await calculateTax(subtotal, org.country_code || 'IN')
        const totalAmount = subtotal + taxAmount

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber()

        // Calculate due date (15 days from issue)
        const dueDate = new Date(periodEnd)
        dueDate.setDate(dueDate.getDate() + 15)

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('billing_invoices')
            .insert({
                organization_id: organizationId,
                invoice_number: invoiceNumber,
                billing_period_start: periodStart.toISOString(),
                billing_period_end: periodEnd.toISOString(),
                subscription_amount: subscriptionAmount,
                credits_amount: creditsAmount,
                subtotal,
                tax_percentage: taxPercentage,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: 'issued',
                due_date: dueDate.toISOString(),
                line_items: lineItems
            })
            .select()
            .single()

        if (invoiceError) {
            return {
                success: false,
                invoice: null,
                error: 'Failed to create invoice'
            }
        }

        // Advance subscription period end date
        const nextPeriodEnd = new Date(periodEnd)
        if (subscription.billing_cycle === 'yearly') {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1)
        } else {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1)
        }

        await supabase
            .from('subscriptions')
            .update({
                current_period_start: periodEnd.toISOString(),
                current_period_end: nextPeriodEnd.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('organization_id', organizationId)

        return {
            success: true,
            invoice,
            error: null
        }
    } catch (error) {
        console.error('Error generating invoice:', error)
        return {
            success: false,
            invoice: null,
            error: 'Error generating invoice'
        }
    }
}

/**
 * Mark invoice as overdue if past due date
 * @param {string} invoiceId - Invoice UUID
 * @returns {Promise<{success: boolean}>}
 */
export async function markInvoiceOverdue(invoiceId) {
    const supabase = await createServerSupabaseClient()

    try {
        const { error } = await supabase
            .from('billing_invoices')
            .update({ status: 'overdue' })
            .eq('id', invoiceId)
            .eq('status', 'issued')
            .lt('due_date', new Date().toISOString())

        return { success: !error }
    } catch (error) {
        console.error('Error marking invoice overdue:', error)
        return { success: false }
    }
}

/**
 * Mark invoice as paid
 * @param {string} invoiceId - Invoice UUID
 * @param {string} paymentMethod - Payment method used
 * @param {string} paymentReference - Payment reference/transaction ID
 * @returns {Promise<{success: boolean}>}
 */
export async function markInvoicePaid(invoiceId, paymentMethod, paymentReference) {
    const supabase = await createServerSupabaseClient()

    try {
        const { error } = await supabase
            .from('billing_invoices')
            .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: paymentMethod,
                payment_reference: paymentReference
            })
            .eq('id', invoiceId)

        if (error) {
            return { success: false }
        }

        // If invoice was overdue, reactivate the subscription
        const { data: invoice } = await supabase
            .from('billing_invoices')
            .select('organization_id')
            .eq('id', invoiceId)
            .single()

        if (invoice) {
            // No-op: subscription status not changed on payment (no 'suspended' state in simplified model)
        }

        return { success: true }
    } catch (error) {
        console.error('Error marking invoice paid:', error)
        return { success: false }
    }
}

/**
 * Generate invoices for all active subscriptions (cron job)
 * @returns {Promise<{generated: number, failed: number}>}
 */
export async function generateAllMonthlyInvoices() {
    const supabase = await createServerSupabaseClient()

    try {
        // Get all active subscriptions due for billing
        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('organization_id, current_period_end')
            .eq('status', 'active')
            .lte('current_period_end', new Date().toISOString())

        if (!subscriptions || subscriptions.length === 0) {
            return { generated: 0, failed: 0 }
        }

        let generated = 0
        let failed = 0

        for (const sub of subscriptions) {
            const periodEnd = new Date(sub.current_period_end)
            const periodStart = new Date(periodEnd)
            periodStart.setMonth(periodStart.getMonth() - 1)

            const result = await generateMonthlyInvoice(
                sub.organization_id,
                periodStart,
                periodEnd
            )

            if (result.success) {
                generated++
            } else {
                failed++
            }
        }

        return { generated, failed }
    } catch (error) {
        console.error('Error generating monthly invoices:', error)
        return { generated: 0, failed: 0 }
    }
}
