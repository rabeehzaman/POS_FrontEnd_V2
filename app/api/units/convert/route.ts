import { NextRequest, NextResponse } from 'next/server'
import { UOMHandler } from '@/lib/server/uom/handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quantity, fromUnit, toUnit, itemUnit } = body

    if (!quantity || !fromUnit || !toUnit || !itemUnit) {
      return NextResponse.json(
        { error: 'quantity, fromUnit, toUnit, and itemUnit are required' },
        { status: 400 }
      )
    }

    const uomHandler = new UOMHandler()
    const convertedQuantity = uomHandler.convertQuantity(
      quantity,
      fromUnit,
      toUnit,
      itemUnit
    )

    return NextResponse.json({
      originalQuantity: quantity,
      convertedQuantity,
      fromUnit,
      toUnit
    })
  } catch (error) {
    console.error('Failed to convert units:', error)
    return NextResponse.json(
      { error: 'Failed to convert units' },
      { status: 500 }
    )
  }
}
