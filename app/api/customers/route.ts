import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

// GET - Fetch customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'

    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('GET', '/contacts', undefined, {
      contact_type: 'customer',
      per_page: limit,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST - Create customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Build contact payload
    const contactData: any = {
      contact_name: body.displayName,
      contact_type: 'customer',
      company_name: body.displayName,
    }

    // Email
    if (body.email) {
      contactData.email = body.email
    }

    // Phone
    if (body.workPhone || body.mobile) {
      contactData.phone = body.workPhone || body.mobile
      contactData.mobile = body.mobile || body.workPhone
    }

    // Tax treatment
    if (body.taxTreatment) {
      contactData.tax_treatment = body.taxTreatment
    }

    // Tax registration number (TRN)
    if (body.taxRegistrationNumber) {
      contactData.tax_reg_no = body.taxRegistrationNumber
    }

    // Place of supply (default Saudi Arabia)
    contactData.place_of_supply = body.placeOfSupply || 'SA'

    // Billing Address
    if (body.billingAddress) {
      const addr = body.billingAddress

      // Auto-fill dummy values for VAT registered customers if fields are empty
      const isDummyNeeded = body.taxTreatment === 'vat_registered'

      contactData.billing_address = {
        attention: body.displayName,
        address: addr.street || (isDummyNeeded ? '.' : ''),
        street2: addr.buildingNumber || '',
        city: addr.city || (isDummyNeeded ? '.' : ''),
        state: addr.state || (isDummyNeeded ? '.' : ''),
        zip: addr.zipCode || '',
        country: 'Saudi Arabia',
        phone: body.workPhone || body.mobile || '',
      }
    } else {
      // Default billing address for Saudi Arabia
      contactData.billing_address = {
        attention: body.displayName,
        address: '.',
        city: '.',
        state: '.',
        country: 'Saudi Arabia',
      }
    }

    // Buyer ID (optional)
    if (body.buyerId) {
      contactData.custom_field_hash = {
        cf_buyer_id: body.buyerId,
      }
    }

    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('POST', '/contacts', contactData)

    return NextResponse.json({ success: true, customer: data })
  } catch (error: any) {
    console.error('Failed to create customer:', error.response?.data || error)
    return NextResponse.json(
      {
        error: 'Failed to create customer',
        details: error.response?.data?.message || error.message
      },
      { status: 500 }
    )
  }
}