import { Printer } from 'escpos-buffer'

export interface PrinterConfiguration {
  width: number // Paper width in characters
  dpi: number
  maxWidth: number // Maximum dots per line
  encoding: string
}

export interface TextOptions {
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  underline?: boolean
  size?: 'normal' | 'double-height' | 'double-width' | 'double-both'
  invert?: boolean
}

export interface PrintData {
  text?: string
  options?: TextOptions
  image?: Uint8Array
  qrCode?: string
  barcode?: {
    data: string
    type: 'CODE39' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPC_A' | 'UPC_E'
  }
}

export class ESCPOSService {
  private printer: Printer
  private config: PrinterConfiguration

  // PRO-V29L Configuration (3-inch, 80mm)
  private readonly DEFAULT_CONFIG: PrinterConfiguration = {
    width: 48, // Characters per line at normal size
    dpi: 203,
    maxWidth: 576, // Dots per line
    encoding: 'utf8'
  }

  constructor(config?: Partial<PrinterConfiguration>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
    this.printer = new Printer()
  }

  initializePrinter(): Uint8Array {
    console.log('Initializing PRO-V29L printer...')
    
    this.printer
      .init() // Initialize printer
      .setCharacterSet('utf8') // Set UTF-8 encoding for Arabic support
      .setCodeTable('arabic') // Support Arabic characters if needed
    
    return this.getBuffer()
  }

  printText(text: string, options: TextOptions = {}): Uint8Array {
    console.log('Formatting text for printing:', text.substring(0, 50))
    
    // Apply text formatting
    if (options.align) {
      this.printer.setTextAlign(options.align)
    }
    
    if (options.bold) {
      this.printer.setBold(true)
    }
    
    if (options.underline) {
      this.printer.setUnderline(true)
    }
    
    if (options.size) {
      switch (options.size) {
        case 'double-height':
          this.printer.setTextDoubleHeight(true)
          break
        case 'double-width':
          this.printer.setTextDoubleWidth(true)
          break
        case 'double-both':
          this.printer.setTextDoubleHeight(true)
          this.printer.setTextDoubleWidth(true)
          break
      }
    }
    
    if (options.invert) {
      this.printer.setTextInverted(true)
    }
    
    // Print the text
    this.printer.writeLine(text)
    
    // Reset formatting
    this.resetTextFormatting()
    
    return this.getBuffer()
  }

  printQRCode(data: string, size: number = 6): Uint8Array {
    console.log('Generating QR code for:', data.substring(0, 30))
    
    try {
      this.printer
        .setTextAlign('center')
        .printQRCode(data, {
          model: 2,
          size: size,
          errorLevel: 'M'
        })
        .setTextAlign('left') // Reset alignment
      
      return this.getBuffer()
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      // Fallback: print as text
      return this.printText(`QR: ${data}`, { align: 'center' })
    }
  }

  printBarcode(data: string, type: string = 'CODE128'): Uint8Array {
    console.log('Generating barcode:', type, data)
    
    try {
      this.printer
        .setTextAlign('center')
        .printBarcode(data, type, {
          height: 60,
          width: 2,
          includeText: true
        })
        .setTextAlign('left') // Reset alignment
      
      return this.getBuffer()
    } catch (error) {
      console.error('Failed to generate barcode:', error)
      // Fallback: print as text
      return this.printText(`${type}: ${data}`, { align: 'center' })
    }
  }

  printImage(imageData: Uint8Array, width?: number): Uint8Array {
    console.log('Printing image, size:', imageData.length, 'bytes')
    
    try {
      const maxWidth = width || this.config.maxWidth
      
      this.printer
        .setTextAlign('center')
        .printImage(imageData, maxWidth)
        .setTextAlign('left') // Reset alignment
      
      return this.getBuffer()
    } catch (error) {
      console.error('Failed to print image:', error)
      return this.printText('[Image could not be printed]', { align: 'center' })
    }
  }

  printLine(): Uint8Array {
    const lineChar = '-'
    const line = lineChar.repeat(this.config.width)
    return this.printText(line, { align: 'center' })
  }

  printSeparator(): Uint8Array {
    return this.printText('', {}) // Empty line
  }

  feedPaper(lines: number = 3): Uint8Array {
    console.log('Feeding paper:', lines, 'lines')
    this.printer.feed(lines)
    return this.getBuffer()
  }

  cutPaper(): Uint8Array {
    console.log('Cutting paper (manual tear)')
    // PRO-V29L uses manual tear bar, so we just feed extra paper
    this.printer.feed(5) // Extra feed for manual cutting
    return this.getBuffer()
  }

  openCashDrawer(): Uint8Array {
    console.log('Opening cash drawer')
    this.printer.openCashDrawer()
    return this.getBuffer()
  }

  async generateTestReceipt(): Promise<Uint8Array> {
    console.log('Generating test receipt for PRO-V29L')
    
    const buffer = new Uint8Array(0)
    const commands: Uint8Array[] = []

    // Initialize printer
    commands.push(this.initializePrinter())

    // Header
    commands.push(this.printText('TMR POS SYSTEM', { align: 'center', bold: true, size: 'double-width' }))
    commands.push(this.printText('PRINTER TEST', { align: 'center', bold: true }))
    commands.push(this.printSeparator())

    // Test information
    const now = new Date()
    commands.push(this.printText(`Date: ${now.toLocaleDateString()}`, { align: 'left' }))
    commands.push(this.printText(`Time: ${now.toLocaleTimeString()}`, { align: 'left' }))
    commands.push(this.printText(`Printer: PRO-V29L (80mm)`, { align: 'left' }))
    commands.push(this.printSeparator())

    // Formatting tests
    commands.push(this.printText('FORMATTING TESTS', { align: 'center', bold: true, underline: true }))
    commands.push(this.printText('Normal text', { align: 'left' }))
    commands.push(this.printText('Bold text', { align: 'left', bold: true }))
    commands.push(this.printText('Centered text', { align: 'center' }))
    commands.push(this.printText('Right aligned', { align: 'right' }))
    commands.push(this.printText('Large Text', { align: 'center', size: 'double-both' }))
    commands.push(this.printSeparator())

    // Line test
    commands.push(this.printLine())
    commands.push(this.printSeparator())

    // QR Code test
    commands.push(this.printText('QR CODE TEST', { align: 'center', bold: true }))
    commands.push(this.printQRCode('https://tmr-pos.com/test', 4))
    commands.push(this.printSeparator())

    // Barcode test
    commands.push(this.printText('BARCODE TEST', { align: 'center', bold: true }))
    commands.push(this.printBarcode('123456789012', 'CODE128'))
    commands.push(this.printSeparator())

    // Footer
    commands.push(this.printText('Test completed successfully!', { align: 'center', bold: true }))
    commands.push(this.printText('PRO-V29L Ready for use', { align: 'center' }))
    
    // Feed and cut
    commands.push(this.feedPaper(3))
    commands.push(this.cutPaper())

    // Combine all commands
    return this.combineBuffers(commands)
  }

  async convertZohoInvoiceForPrinting(invoiceBlob: Blob): Promise<Uint8Array> {
    console.log('Converting Zoho invoice for thermal printing')

    try {
      const buffer = new Uint8Array(0)
      const commands: Uint8Array[] = []

      // Initialize printer
      commands.push(this.initializePrinter())

      // Note: For now, we'll create a simplified invoice format
      // In a full implementation, you might want to parse the PDF
      // or get structured data from the API instead of the PDF

      commands.push(this.printText('INVOICE', { align: 'center', bold: true, size: 'double-width' }))
      commands.push(this.printText('(Converted from Zoho Books)', { align: 'center' }))
      commands.push(this.printSeparator())

      // Get invoice data (this would normally come from your API)
      const invoiceData = await this.extractInvoiceData(invoiceBlob)
      
      if (invoiceData) {
        // Print structured invoice data
        commands.push(...this.formatInvoiceData(invoiceData))
      } else {
        // Fallback message
        commands.push(this.printText('Invoice data not available', { align: 'center' }))
        commands.push(this.printText('Please print from web interface', { align: 'center' }))
      }

      commands.push(this.feedPaper(3))
      commands.push(this.cutPaper())

      return this.combineBuffers(commands)

    } catch (error) {
      console.error('Failed to convert Zoho invoice:', error)
      
      // Create error receipt
      const commands = [
        this.initializePrinter(),
        this.printText('PRINT ERROR', { align: 'center', bold: true }),
        this.printText('Unable to process invoice', { align: 'center' }),
        this.printText('Please use web printing', { align: 'center' }),
        this.feedPaper(3),
        this.cutPaper()
      ]
      
      return this.combineBuffers(commands)
    }
  }

  private async extractInvoiceData(blob: Blob): Promise<any> {
    // TODO: Implement PDF parsing or get structured data from API
    // For now, return null to trigger fallback behavior
    console.log('Invoice data extraction not yet implemented')
    return null
  }

  private formatInvoiceData(data: any): Uint8Array[] {
    const commands: Uint8Array[] = []
    
    // Company header
    if (data.company) {
      commands.push(this.printText(data.company.name, { align: 'center', bold: true }))
      if (data.company.address) {
        commands.push(this.printText(data.company.address, { align: 'center' }))
      }
    }
    
    commands.push(this.printLine())
    
    // Invoice details
    if (data.invoiceNumber) {
      commands.push(this.printText(`Invoice: ${data.invoiceNumber}`, { align: 'left', bold: true }))
    }
    
    if (data.date) {
      commands.push(this.printText(`Date: ${data.date}`, { align: 'left' }))
    }
    
    // Customer info
    if (data.customer) {
      commands.push(this.printSeparator())
      commands.push(this.printText('BILL TO:', { align: 'left', bold: true }))
      commands.push(this.printText(data.customer.name, { align: 'left' }))
    }
    
    commands.push(this.printLine())
    
    // Items
    if (data.items) {
      commands.push(this.printText('ITEMS:', { align: 'left', bold: true }))
      data.items.forEach((item: any) => {
        commands.push(this.printText(item.name, { align: 'left' }))
        commands.push(this.printText(`${item.qty} x ${item.price} = ${item.total}`, { align: 'right' }))
      })
    }
    
    commands.push(this.printLine())
    
    // Total
    if (data.total) {
      commands.push(this.printText(`TOTAL: ${data.total}`, { align: 'right', bold: true, size: 'double-height' }))
    }
    
    return commands
  }

  private resetTextFormatting(): void {
    this.printer
      .setBold(false)
      .setUnderline(false)
      .setTextDoubleHeight(false)
      .setTextDoubleWidth(false)
      .setTextInverted(false)
      .setTextAlign('left')
  }

  private getBuffer(): Uint8Array {
    const buffer = this.printer.getBuffer()
    this.printer = new Printer() // Reset printer for next command
    return buffer
  }

  private combineBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
    const combined = new Uint8Array(totalLength)
    
    let offset = 0
    for (const buffer of buffers) {
      combined.set(buffer, offset)
      offset += buffer.length
    }
    
    return combined
  }

  getConfiguration(): PrinterConfiguration {
    return { ...this.config }
  }

  updateConfiguration(config: Partial<PrinterConfiguration>): void {
    this.config = { ...this.config, ...config }
    console.log('Updated printer configuration:', this.config)
  }
}