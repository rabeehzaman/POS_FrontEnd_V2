import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const invoiceId = params.invoiceId

    const zoho = await getZohoClient()

    // Get the PDF download URL from Zoho
    const data: any = await zoho.makeRequest(
      'GET',
      `/invoices/${invoiceId}`,
      undefined,
      { accept: 'pdf' }
    )

    // Redirect to the PDF URL or return the URL
    if (data.invoice?.invoice_url) {
      return NextResponse.redirect(data.invoice.invoice_url)
    }

    return NextResponse.json({ error: 'Invoice PDF not available' }, { status: 404 })
  } catch (error) {
    console.error('Failed to download invoice:', error)
    return NextResponse.json(
      { error: 'Failed to download invoice' },
      { status: 500 }
    )
  }
}
