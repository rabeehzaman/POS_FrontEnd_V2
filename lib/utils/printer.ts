import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core'

// Mobile printing service - lazy import to avoid issues on web
let mobilePrintingService: any = null
async function getMobilePrintingService() {
  if (!mobilePrintingService && Capacitor.isNativePlatform()) {
    try {
      const { MobilePrintingService } = await import('@/lib/services/mobile-printing')
      mobilePrintingService = MobilePrintingService.getInstance()
    } catch (error) {
      console.error('Failed to load mobile printing service:', error)
    }
  }
  return mobilePrintingService
}

// Type definition for print-js since @types/print-js doesn't exist
declare const printJS: {
  (config: {
    printable: string | Blob
    type: 'pdf' | 'html' | 'image' | 'json'
    base64?: boolean
    showModal?: boolean
    modalMessage?: string
    header?: string
    headerStyle?: string
    documentTitle?: string
    fallbackPrintable?: string
    onPrintDialogClose?: () => void
    onError?: (error: Error) => void
    font_size?: string
    css?: string | string[]
    style?: string
    scanStyles?: boolean
    targetStyle?: string | string[]
    targetStyles?: string | string[]
    ignoreElements?: string | string[]
  }): void
}

export interface PrinterSettings {
  autoPrint: boolean
  silentPrint: boolean
  numberOfCopies: number
  printAfterInvoice: boolean
  testPrintEnabled: boolean
  // Mobile-specific settings
  preferMobilePrinting: boolean
  fallbackToWeb: boolean
  mobileAutoReconnect: boolean
}

export interface PrintOptions {
  documentTitle?: string
  copies?: number
  silent?: boolean
  showModal?: boolean
}

const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  autoPrint: false,
  silentPrint: true,
  numberOfCopies: 1,
  printAfterInvoice: false,
  testPrintEnabled: true,
  // Mobile-specific defaults
  preferMobilePrinting: true,
  fallbackToWeb: true,
  mobileAutoReconnect: true
}

// Storage key for printer settings
const PRINTER_SETTINGS_KEY = 'tmr_pos_printer_settings'

/**
 * Check if we're running on a native mobile platform
 */
export function isMobilePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check if mobile printing should be used based on settings and platform
 */
export function shouldUseMobilePrinting(): boolean {
  if (!isMobilePlatform()) return false
  
  const settings = getPrinterSettings()
  return settings.preferMobilePrinting
}

/**
 * Check if we should fallback to web printing when mobile printing fails
 */
export function shouldFallbackToWeb(): boolean {
  const settings = getPrinterSettings()
  return settings.fallbackToWeb
}

/**
 * Get printer settings from localStorage
 */
export function getPrinterSettings(): PrinterSettings {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return DEFAULT_PRINTER_SETTINGS
    }
    
    const saved = localStorage.getItem(PRINTER_SETTINGS_KEY)
    if (saved) {
      return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(saved) }
    }
    return DEFAULT_PRINTER_SETTINGS
  } catch (error) {
    console.error('Failed to load printer settings:', error)
    return DEFAULT_PRINTER_SETTINGS
  }
}

/**
 * Save printer settings to localStorage
 */
export function savePrinterSettings(settings: Partial<PrinterSettings>): void {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    
    const current = getPrinterSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save printer settings:', error)
    toast.error('Failed to save printer settings')
  }
}

/**
 * Print a PDF blob using mobile or web printing
 * @param pdfBlob - The PDF blob to print
 * @param options - Print options
 * @returns Promise<boolean> - Success status
 */
export async function printPDFBlob(
  pdfBlob: Blob, 
  options: PrintOptions = {}
): Promise<boolean> {
  // Try mobile printing first if available and preferred
  if (shouldUseMobilePrinting()) {
    try {
      console.log('Attempting mobile printing for PDF blob')
      return await printPDFBlobMobile(pdfBlob, options)
    } catch (error) {
      console.error('Mobile printing failed:', error)
      
      if (shouldFallbackToWeb()) {
        console.log('Falling back to web printing')
        toast.info('Mobile printer unavailable, using browser printing')
      } else {
        toast.error('Mobile printing failed')
        return false
      }
    }
  }
  
  // Use web printing (original implementation)
  return printPDFBlobWeb(pdfBlob, options)
}

/**
 * Print a PDF blob using mobile Bluetooth printing
 * @param pdfBlob - The PDF blob to print
 * @param options - Print options
 * @returns Promise<boolean> - Success status
 */
async function printPDFBlobMobile(
  pdfBlob: Blob, 
  options: PrintOptions = {}
): Promise<boolean> {
  const mobilePrinter = await getMobilePrintingService()
  
  if (!mobilePrinter) {
    throw new Error('Mobile printing service not available')
  }

  const settings = getPrinterSettings()
  const copies = options.copies || settings.numberOfCopies
  
  try {
    const jobId = await mobilePrinter.printInvoice(pdfBlob, {
      copies,
      showProgress: !options.silent,
      retryOnFail: true,
      priority: 'normal'
    })
    
    console.log('Mobile print job queued:', jobId)
    return true
  } catch (error) {
    console.error('Mobile print failed:', error)
    throw error
  }
}

/**
 * Print a PDF blob using web printing (original implementation)
 * @param pdfBlob - The PDF blob to print
 * @param options - Print options
 * @returns Promise<boolean> - Success status
 */
async function printPDFBlobWeb(
  pdfBlob: Blob, 
  options: PrintOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const {
        documentTitle = 'Invoice',
        copies = 1,
        silent = true,
        showModal = false
      } = options

      const settings = getPrinterSettings()
      const actualCopies = copies || settings.numberOfCopies
      const actualSilent = silent && settings.silentPrint

      console.log(`Printing ${documentTitle} - Copies: ${actualCopies}, Silent: ${actualSilent}`)

      // Convert blob to object URL for print-js
      const pdfUrl = URL.createObjectURL(pdfBlob)

      try {
        printJS({
          printable: pdfUrl,
          type: 'pdf',
          showModal: showModal || !actualSilent,
          modalMessage: actualSilent ? 'Printing invoice...' : 'Preparing to print...',
          documentTitle: documentTitle,
          onPrintDialogClose: () => {
            URL.revokeObjectURL(pdfUrl)
            console.log(`Print dialog closed for ${documentTitle}`)
          },
          onError: (error: Error) => {
            console.error('Print error:', error)
            URL.revokeObjectURL(pdfUrl)
            toast.error('Printing failed. Please try again.')
            resolve(false)
          }
        })

        // For multiple copies, we need to print multiple times
        if (actualCopies > 1) {
          for (let i = 1; i < actualCopies; i++) {
            setTimeout(() => {
              printJS({
                printable: pdfUrl,
                type: 'pdf',
                showModal: false,
                onError: (error: Error) => {
                  console.error(`Print copy ${i + 1} error:`, error)
                }
              })
            }, i * 1000) // Delay each copy by 1 second
          }
        }

        // Clean up after a delay to ensure printing completes
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl)
        }, 5000)

        resolve(true)

      } catch (error) {
        console.error('Print-js error:', error)
        URL.revokeObjectURL(pdfUrl)
        
        // Fallback to browser print dialog
        const fallbackWindow = window.open(pdfUrl, '_blank')
        if (fallbackWindow) {
          fallbackWindow.onload = () => {
            fallbackWindow.print()
            fallbackWindow.close()
          }
          resolve(true)
        } else {
          toast.error('Failed to open print dialog. Please check popup blocker.')
          resolve(false)
        }
      }

    } catch (error) {
      console.error('Print setup error:', error)
      toast.error('Failed to setup printing. Please try again.')
      resolve(false)
    }
  })
}

/**
 * Print an invoice by fetching it from the API
 * @param invoiceId - The invoice ID
 * @param invoiceNumber - The invoice number for display
 * @param options - Print options
 * @returns Promise<boolean> - Success status
 */
export async function printInvoice(
  invoiceId: string,
  invoiceNumber: string,
  options: PrintOptions = {}
): Promise<boolean> {
  const toastId = toast.loading(`Preparing to print invoice ${invoiceNumber}...`)

  try {
    // Fetch the invoice PDF
    const response = await fetch(`/api/invoices/${invoiceId}/download`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.statusText}`)
    }

    const pdfBlob = await response.blob()
    
    if (!pdfBlob.type.includes('pdf')) {
      throw new Error('Downloaded file is not a PDF')
    }

    toast.success(`Printing invoice ${invoiceNumber}...`, { id: toastId })

    const success = await printPDFBlob(pdfBlob, {
      ...options,
      documentTitle: `Invoice ${invoiceNumber}`
    })

    if (success) {
      toast.success(`Invoice ${invoiceNumber} sent to printer!`, { id: toastId })
    } else {
      toast.error(`Failed to print invoice ${invoiceNumber}`, { id: toastId })
    }

    return success

  } catch (error) {
    console.error('Print invoice error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Failed to print invoice: ${errorMessage}`, { id: toastId })
    return false
  }
}

/**
 * Print a test page to check printer connectivity
 * @returns Promise<boolean> - Success status
 */
export async function printTestPage(): Promise<boolean> {
  // Try mobile printing first if available and preferred
  if (shouldUseMobilePrinting()) {
    try {
      console.log('Attempting mobile test print')
      return await printTestPageMobile()
    } catch (error) {
      console.error('Mobile test print failed:', error)
      
      if (shouldFallbackToWeb()) {
        console.log('Falling back to web test print')
        toast.info('Mobile printer unavailable, using browser test print')
      } else {
        toast.error('Mobile test print failed')
        return false
      }
    }
  }

  // Use web test printing (original implementation)
  return printTestPageWeb()
}

/**
 * Print a test page using mobile Bluetooth printing
 * @returns Promise<boolean> - Success status
 */
async function printTestPageMobile(): Promise<boolean> {
  const mobilePrinter = await getMobilePrintingService()
  
  if (!mobilePrinter) {
    throw new Error('Mobile printing service not available')
  }

  try {
    const jobId = await mobilePrinter.printTest({
      showProgress: true,
      retryOnFail: true,
      priority: 'normal'
    })
    
    console.log('Mobile test print job queued:', jobId)
    return true
  } catch (error) {
    console.error('Mobile test print failed:', error)
    throw error
  }
}

/**
 * Print a test page using web printing (original implementation)
 * @returns Promise<boolean> - Success status
 */
async function printTestPageWeb(): Promise<boolean> {
  const toastId = toast.loading('Printing test page...')

  try {
    // Create a unique ID for the temporary element
    const printElementId = `print-test-${Date.now()}`
    
    // Create temporary DOM element
    const testElement = document.createElement('div')
    testElement.id = printElementId
    testElement.style.display = 'none'
    testElement.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">
          POS Printer Test
        </h1>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Test Status:</strong> SUCCESS</p>
        <p>If you can see this page clearly, your printer is working correctly.</p>
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9;">
          <h3>System Information:</h3>
          <p><strong>Browser:</strong> ${navigator.userAgent}</p>
          <p><strong>Platform:</strong> ${navigator.platform}</p>
          <p><strong>Language:</strong> ${navigator.language}</p>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          TMR POS System - Printer Test Page
        </p>
      </div>
    `
    
    // Add to DOM
    document.body.appendChild(testElement)

    return new Promise((resolve) => {
      try {
        printJS({
          printable: printElementId,
          type: 'html',
          showModal: true,
          modalMessage: 'Preparing test page...',
          documentTitle: 'POS Printer Test',
          header: 'Printer Test Page',
          headerStyle: 'font-size: 20px; font-weight: bold; color: #333;',
          style: 'body { font-family: Arial, sans-serif; }',
          onPrintDialogClose: () => {
            console.log('Test print dialog closed')
            // Clean up the temporary element
            document.body.removeChild(testElement)
          },
          onError: (error: Error) => {
            console.error('Test print error:', error)
            // Clean up the temporary element
            document.body.removeChild(testElement)
            toast.error('Test print failed. Please check your printer.', { id: toastId })
            resolve(false)
          }
        })

        toast.success('Test page sent to printer!', { id: toastId })
        
        // Clean up after a delay to ensure printing completes
        setTimeout(() => {
          if (document.body.contains(testElement)) {
            document.body.removeChild(testElement)
          }
        }, 5000)
        
        resolve(true)

      } catch (error) {
        console.error('Test print setup error:', error)
        // Clean up the temporary element
        if (document.body.contains(testElement)) {
          document.body.removeChild(testElement)
        }
        toast.error('Failed to setup test print.', { id: toastId })
        resolve(false)
      }
    })

  } catch (error) {
    console.error('Test print error:', error)
    toast.error('Failed to print test page.', { id: toastId })
    return false
  }
}

/**
 * Check if auto-print is enabled for new invoices
 */
export function shouldAutoPrintInvoice(): boolean {
  const settings = getPrinterSettings()
  return settings.autoPrint && settings.printAfterInvoice
}

/**
 * Print an invoice automatically if settings allow
 * @param invoiceId - The invoice ID
 * @param invoiceNumber - The invoice number
 * @param delay - Delay before printing (default: 2000ms)
 */
export async function autoPrintInvoice(
  invoiceId: string,
  invoiceNumber: string,
  delay: number = 2000
): Promise<boolean> {
  if (!shouldAutoPrintInvoice()) {
    console.log('Auto-print disabled, skipping print')
    return false
  }

  return new Promise((resolve) => {
    setTimeout(async () => {
      const settings = getPrinterSettings()
      const success = await printInvoice(invoiceId, invoiceNumber, {
        silent: settings.silentPrint,
        copies: settings.numberOfCopies
      })
      resolve(success)
    }, delay)
  })
}

/**
 * Get mobile printer status
 * @returns Promise<object | null> - Mobile printer status or null if not available
 */
export async function getMobilePrinterStatus(): Promise<any> {
  if (!shouldUseMobilePrinting()) {
    return null
  }

  try {
    const mobilePrinter = await getMobilePrintingService()
    return mobilePrinter ? mobilePrinter.getStatus() : null
  } catch (error) {
    console.error('Failed to get mobile printer status:', error)
    return null
  }
}

/**
 * Check if mobile printer is connected
 * @returns Promise<boolean> - True if mobile printer is connected
 */
export async function isMobilePrinterConnected(): Promise<boolean> {
  const status = await getMobilePrinterStatus()
  return status ? status.connected : false
}

/**
 * Get available mobile printing options
 * @returns Promise<object> - Available mobile printing capabilities
 */
export async function getMobilePrintingCapabilities(): Promise<{
  available: boolean
  connected: boolean
  bluetoothEnabled: boolean
  permissionsGranted: boolean
}> {
  if (!isMobilePlatform()) {
    return {
      available: false,
      connected: false,
      bluetoothEnabled: false,
      permissionsGranted: false
    }
  }

  try {
    const mobilePrinter = await getMobilePrintingService()
    
    if (!mobilePrinter) {
      return {
        available: false,
        connected: false,
        bluetoothEnabled: false,
        permissionsGranted: false
      }
    }

    const requirements = await mobilePrinter.checkRequirements()
    const status = mobilePrinter.getStatus()

    return {
      available: true,
      connected: status.connected,
      bluetoothEnabled: requirements.bluetooth,
      permissionsGranted: requirements.permissions
    }
  } catch (error) {
    console.error('Failed to check mobile printing capabilities:', error)
    return {
      available: false,
      connected: false,
      bluetoothEnabled: false,
      permissionsGranted: false
    }
  }
}

/**
 * Update mobile-specific printer settings
 * @param mobileSettings - Mobile printer settings
 */
export function updateMobilePrinterSettings(mobileSettings: {
  preferMobilePrinting?: boolean
  fallbackToWeb?: boolean
  mobileAutoReconnect?: boolean
}): void {
  const currentSettings = getPrinterSettings()
  const updatedSettings = { ...currentSettings, ...mobileSettings }
  savePrinterSettings(updatedSettings)
  
  // Apply auto-reconnect setting to mobile service if available
  if (mobileSettings.mobileAutoReconnect !== undefined && isMobilePlatform()) {
    getMobilePrintingService().then(mobilePrinter => {
      if (mobilePrinter) {
        // Note: This would need to be implemented in BluetoothManager
        // mobilePrinter.setAutoReconnect(mobileSettings.mobileAutoReconnect)
      }
    }).catch(console.error)
  }
}

/**
 * Reset printer settings to defaults
 */
export function resetPrinterSettings(): void {
  try {
    localStorage.removeItem(PRINTER_SETTINGS_KEY)
    toast.success('Printer settings reset to defaults')
  } catch (error) {
    console.error('Failed to reset printer settings:', error)
    toast.error('Failed to reset printer settings')
  }
}