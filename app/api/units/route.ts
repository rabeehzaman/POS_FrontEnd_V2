import { NextResponse } from 'next/server'
import { UOMHandler } from '@/lib/server/uom/handler'

export async function GET() {
  try {
    const uomHandler = new UOMHandler()
    
    // Return available units from the UOM handler
    const units = {
      pieces: 'PCS',
      cartons: Object.keys((uomHandler as any).UNIT_CONVERSION_MAP)
    }

    return NextResponse.json({ units })
  } catch (error) {
    console.error('Failed to fetch units:', error)
    return NextResponse.json(
      { error: 'Failed to fetch units' },
      { status: 500 }
    )
  }
}
