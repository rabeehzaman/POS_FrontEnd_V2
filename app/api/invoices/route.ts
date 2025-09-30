import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const invoiceData = {
      customer_id: body.customer_id,
      line_items: body.line_items,
      is_inclusive_tax: body.is_inclusive_tax || false,
    }

    // Add branch if provided
    if (body.branch_id) {
      ;(invoiceData as any).branch_id = body.branch_id
    }

    // Add template if provided (for Main Branch)
    if (body.template_id) {
      ;(invoiceData as any).template_id = body.template_id
      ;(invoiceData as any).template_name = body.template_name
      ;(invoiceData as any).template_type = body.template_type
    }

    const zoho = await getZohoClient()

    // Create invoice
    const createResponse = await zoho.makeRequest('POST', '/invoices', invoiceData)

    // Mark as sent if requested
    if (body.mark_as_sent) {
      const invoiceId = (createResponse as any).invoice.invoice_id
      await zoho.makeRequest('POST', `/invoices/${invoiceId}/status/sent`)
    }

    return NextResponse.json({ success: true, invoice: (createResponse as any).invoice })
  } catch (error: any) {
    console.error('Failed to create invoice:', error.response?.data || error)
    return NextResponse.json(
      {
        error: 'Failed to create invoice',
        details: error.response?.data?.message || error.message
      },
      { status: 500 }
    )
  }
}