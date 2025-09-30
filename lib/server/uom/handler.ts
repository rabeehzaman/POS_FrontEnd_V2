export class UOMHandler {
  private readonly UNIT_CONVERSION_MAP: Record<string, string> = {
    "PIECES": "9465000000009224",
    "C2P": "9465000014396910",
    "C3P": "9465000000016009",
    "C4P": "9465000000009276",
    "C5P": "9465000000009284",
    "C6P": "9465000000009236",
    "C8P": "9465000000009228",
    "C10P": "9465000000009232",
    "C12P": "9465000000009224",
    "C-12P": "9465000025261093",
    "C15P": "9465000000016001",
    "C16P": "9465000000009264",
    "C18P": "9465000000009260",
    "C20P": "9465000000009240",
    "C24P": "9465000000009248",
    "C-24P": "9465000025261136",
    "C25P": "9465000000009256",
    "C26P": "9465000000009288",
    "C30P": "9465000000009252",
    "C32P": "9465000000009296",
    "C35P": "9465000000016027",
    "C36P": "9465000000009280",
    "C40P": "9465000000009300",
    "C45P": "9465000000016031",
    "C48P": "9465000000009292",
    "C-48P": "9465000025261140",
    "C50P": "9465000000009268",
    "C60P": "9465000000009244",
    "C72P": "9465000000009272",
    "C80P": "9465000000016035",
    "C100P": "9465000000016005",
    "C140P": "9465000000016013",
    "C150P": "9465000000016017",
    "BAG(4)": "9465000006156003",
    "BAG(8)": "9465000000686132",
    "RAFTHA": "9465000000366030",
    "OUTER": "9465000000366098",
  }

  getUnitConversionId(unit: string): string | null {
    if (!unit) return null
    return this.UNIT_CONVERSION_MAP[unit.toUpperCase()] || null
  }

  parseUnitInfo(unit: string) {
    if (!unit) return null
    const match = unit.match(/C-?(\d+)P(?:CS)?/i)
    if (match) {
      return {
        type: 'carton',
        piecesPerCarton: parseInt(match[1]),
        display: `1 Carton = ${match[1]} Pieces`
      }
    }
    return null
  }

  hasUnitConversion(unit: string): boolean {
    return /C-?\d+P(?:CS)?/i.test(unit)
  }

  getPiecesPerCarton(unit: string): number {
    const info = this.parseUnitInfo(unit)
    return info ? info.piecesPerCarton : 1
  }

  convertQuantity(quantity: number, fromUnit: string, toUnit: string, itemUnit: string): number {
    if (!this.hasUnitConversion(itemUnit)) {
      return quantity
    }

    const piecesPerCarton = this.getPiecesPerCarton(itemUnit)

    if (fromUnit === 'pieces' && toUnit === 'cartons') {
      return quantity / piecesPerCarton
    } else if (fromUnit === 'cartons' && toUnit === 'pieces') {
      return quantity * piecesPerCarton
    }

    return quantity
  }

  formatInvoiceLineItem(item: any, quantity: number, selectedUnit: string) {
    const lineItem: any = {
      item_id: item.id,
      rate: item.price,
      quantity: quantity
    }

    if (selectedUnit) {
      lineItem.unit = selectedUnit

      if (selectedUnit === 'PCS' && item.storedUnit) {
        const conversionId = this.getUnitConversionId(item.storedUnit)
        if (conversionId) {
          lineItem.unit_conversion_id = conversionId
        }
      }
    } else {
      lineItem.unit = item.unit || 'qty'
    }

    return lineItem
  }
}