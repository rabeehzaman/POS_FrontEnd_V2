import { BluetoothManager, BluetoothPrinter, ConnectionStatus } from './bluetooth-manager'
import { ESCPOSService, PrinterConfiguration } from './escpos-service'
import { toast } from 'sonner'

export interface PrintJob {
  id: string
  type: 'test' | 'invoice' | 'receipt' | 'custom'
  data?: any
  blob?: Blob
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  maxAttempts: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

export interface PrintOptions {
  copies?: number
  priority?: 'low' | 'normal' | 'high'
  retryOnFail?: boolean
  showProgress?: boolean
}

export interface PrinterStatus {
  connected: boolean
  device?: BluetoothPrinter
  connectionStatus: ConnectionStatus
  queueLength: number
  isProcessing: boolean
  lastError?: string
}

export class MobilePrintingService {
  private static instance: MobilePrintingService
  private bluetoothManager: BluetoothManager
  private escposService: ESCPOSService
  private printQueue: PrintJob[] = []
  private isProcessingQueue = false
  private statusCallbacks: Set<(status: PrinterStatus) => void> = new Set()

  private constructor() {
    this.bluetoothManager = BluetoothManager.getInstance()
    this.escposService = new ESCPOSService()
    
    // Listen to connection status changes
    this.bluetoothManager.onConnectionStatusChange((status) => {
      this.notifyStatusChange()
    })
  }

  static getInstance(): MobilePrintingService {
    if (!MobilePrintingService.instance) {
      MobilePrintingService.instance = new MobilePrintingService()
    }
    return MobilePrintingService.instance
  }

  // Connection Management
  async scanForPrinters(timeoutMs = 10000): Promise<BluetoothPrinter[]> {
    try {
      console.log('Scanning for Bluetooth printers...')
      
      const hasPermissions = await this.bluetoothManager.checkBluetoothPermissions()
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted')
      }

      const isEnabled = await this.bluetoothManager.isBluetoothEnabled()
      if (!isEnabled) {
        throw new Error('Bluetooth is not enabled')
      }

      const printers = await this.bluetoothManager.scanForPrinters(timeoutMs)
      console.log(`Found ${printers.length} printers`)
      
      return printers
    } catch (error) {
      console.error('Failed to scan for printers:', error)
      toast.error(`Failed to scan for printers: ${error}`)
      return []
    }
  }

  async connectToPrinter(printer: BluetoothPrinter): Promise<boolean> {
    try {
      console.log('Connecting to printer:', printer.name)
      
      const success = await this.bluetoothManager.connectToPrinter(printer)
      
      if (success) {
        toast.success(`Connected to ${printer.name}`)
        this.notifyStatusChange()
        
        // Test connection with a simple command
        await this.sendTestCommand()
      } else {
        toast.error(`Failed to connect to ${printer.name}`)
      }
      
      return success
    } catch (error) {
      console.error('Connection failed:', error)
      toast.error(`Connection failed: ${error}`)
      return false
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.bluetoothManager.disconnect()
      this.clearQueue()
      this.notifyStatusChange()
      toast.success('Printer disconnected')
    } catch (error) {
      console.error('Disconnect failed:', error)
      toast.error('Failed to disconnect printer')
    }
  }

  // Printing Functions
  async printTest(options: PrintOptions = {}): Promise<string> {
    const jobId = this.generateJobId()
    
    try {
      console.log('Adding test print job to queue')
      
      const job: PrintJob = {
        id: jobId,
        type: 'test',
        status: 'pending',
        attempts: 0,
        maxAttempts: options.retryOnFail ? 3 : 1,
        createdAt: new Date()
      }

      this.addToQueue(job, options.priority)
      this.processQueue()
      
      if (options.showProgress) {
        toast.loading('Preparing test print...', { id: jobId })
      }
      
      return jobId
    } catch (error) {
      console.error('Failed to queue test print:', error)
      toast.error('Failed to prepare test print')
      throw error
    }
  }

  async printInvoice(invoiceBlob: Blob, options: PrintOptions = {}): Promise<string> {
    const jobId = this.generateJobId()
    
    try {
      console.log('Adding invoice print job to queue')
      
      const job: PrintJob = {
        id: jobId,
        type: 'invoice',
        blob: invoiceBlob,
        status: 'pending',
        attempts: 0,
        maxAttempts: options.retryOnFail ? 3 : 1,
        createdAt: new Date()
      }

      this.addToQueue(job, options.priority)
      
      // Handle multiple copies
      if (options.copies && options.copies > 1) {
        for (let i = 1; i < options.copies; i++) {
          const copyJob = { ...job, id: this.generateJobId() }
          this.addToQueue(copyJob, options.priority)
        }
      }
      
      this.processQueue()
      
      if (options.showProgress) {
        toast.loading('Preparing invoice for printing...', { id: jobId })
      }
      
      return jobId
    } catch (error) {
      console.error('Failed to queue invoice print:', error)
      toast.error('Failed to prepare invoice for printing')
      throw error
    }
  }

  async printCustomData(data: Uint8Array, options: PrintOptions = {}): Promise<string> {
    const jobId = this.generateJobId()
    
    try {
      console.log('Adding custom data print job to queue')
      
      const job: PrintJob = {
        id: jobId,
        type: 'custom',
        data: data,
        status: 'pending',
        attempts: 0,
        maxAttempts: options.retryOnFail ? 3 : 1,
        createdAt: new Date()
      }

      this.addToQueue(job, options.priority)
      this.processQueue()
      
      return jobId
    } catch (error) {
      console.error('Failed to queue custom print:', error)
      throw error
    }
  }

  // Queue Management
  private addToQueue(job: PrintJob, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    switch (priority) {
      case 'high':
        this.printQueue.unshift(job)
        break
      case 'low':
        this.printQueue.push(job)
        break
      default:
        // Insert at middle for normal priority
        const middleIndex = Math.floor(this.printQueue.length / 2)
        this.printQueue.splice(middleIndex, 0, job)
    }
    
    this.notifyStatusChange()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.printQueue.length === 0) {
      return
    }

    if (!this.bluetoothManager.isConnected()) {
      console.log('Printer not connected, skipping queue processing')
      return
    }

    this.isProcessingQueue = true
    this.notifyStatusChange()

    try {
      while (this.printQueue.length > 0) {
        const job = this.printQueue.shift()!
        await this.processJob(job)
        
        // Small delay between jobs to prevent overwhelming the printer
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error('Queue processing error:', error)
    } finally {
      this.isProcessingQueue = false
      this.notifyStatusChange()
    }
  }

  private async processJob(job: PrintJob): Promise<void> {
    try {
      console.log(`Processing print job ${job.id} (${job.type})`)
      
      job.status = 'printing'
      job.attempts++
      this.notifyStatusChange()

      let printData: Uint8Array | null = null

      // Generate print data based on job type
      switch (job.type) {
        case 'test':
          printData = await this.escposService.generateTestReceipt()
          break
        
        case 'invoice':
          if (job.blob) {
            printData = await this.escposService.convertZohoInvoiceForPrinting(job.blob)
          }
          break
        
        case 'custom':
          printData = job.data
          break
      }

      if (!printData) {
        throw new Error('No print data generated')
      }

      // Send to printer
      const success = await this.bluetoothManager.sendData(printData)
      
      if (success) {
        job.status = 'completed'
        job.completedAt = new Date()
        console.log(`Print job ${job.id} completed successfully`)
        
        toast.success(`${job.type} print completed`, { id: job.id })
      } else {
        throw new Error('Failed to send data to printer')
      }

    } catch (error) {
      console.error(`Print job ${job.id} failed:`, error)
      
      job.error = error.toString()
      
      // Retry if attempts remaining
      if (job.attempts < job.maxAttempts) {
        console.log(`Retrying job ${job.id}, attempt ${job.attempts + 1}`)
        job.status = 'pending'
        this.printQueue.unshift(job) // Add back to front of queue
      } else {
        job.status = 'failed'
        job.completedAt = new Date()
        
        toast.error(`${job.type} print failed: ${error}`, { id: job.id })
      }
    }
  }

  private async sendTestCommand(): Promise<void> {
    try {
      // Send a simple printer status command
      const statusCommand = new Uint8Array([0x10, 0x04, 0x01]) // ESC/POS status query
      await this.bluetoothManager.sendData(statusCommand)
      console.log('Printer connection test successful')
    } catch (error) {
      console.error('Printer connection test failed:', error)
    }
  }

  // Status and Monitoring
  getStatus(): PrinterStatus {
    return {
      connected: this.bluetoothManager.isConnected(),
      device: this.bluetoothManager.getConnectedDevice(),
      connectionStatus: this.bluetoothManager.getConnectionStatus(),
      queueLength: this.printQueue.length,
      isProcessing: this.isProcessingQueue,
      lastError: this.getLastError()
    }
  }

  onStatusChange(callback: (status: PrinterStatus) => void): () => void {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  private notifyStatusChange(): void {
    const status = this.getStatus()
    this.statusCallbacks.forEach(callback => callback(status))
  }

  getQueue(): PrintJob[] {
    return [...this.printQueue]
  }

  cancelJob(jobId: string): boolean {
    const jobIndex = this.printQueue.findIndex(job => job.id === jobId)
    
    if (jobIndex >= 0) {
      const job = this.printQueue[jobIndex]
      
      if (job.status === 'pending') {
        job.status = 'cancelled'
        job.completedAt = new Date()
        this.printQueue.splice(jobIndex, 1)
        
        toast.info('Print job cancelled', { id: jobId })
        this.notifyStatusChange()
        return true
      }
    }
    
    return false
  }

  clearQueue(): void {
    this.printQueue.forEach(job => {
      if (job.status === 'pending') {
        job.status = 'cancelled'
        job.completedAt = new Date()
      }
    })
    
    this.printQueue = []
    this.notifyStatusChange()
    
    toast.info('Print queue cleared')
  }

  // Utility Functions
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getLastError(): string | undefined {
    const failedJobs = this.printQueue.filter(job => job.status === 'failed')
    return failedJobs.length > 0 ? failedJobs[failedJobs.length - 1].error : undefined
  }

  // Configuration
  updatePrinterConfiguration(config: Partial<PrinterConfiguration>): void {
    this.escposService.updateConfiguration(config)
    console.log('Printer configuration updated')
  }

  getPrinterConfiguration(): PrinterConfiguration {
    return this.escposService.getConfiguration()
  }

  // Permissions and Setup
  async checkRequirements(): Promise<{ bluetooth: boolean; permissions: boolean; connected: boolean }> {
    try {
      const bluetooth = await this.bluetoothManager.isBluetoothEnabled()
      const permissions = await this.bluetoothManager.checkBluetoothPermissions()
      const connected = this.bluetoothManager.isConnected()
      
      return { bluetooth, permissions, connected }
    } catch (error) {
      console.error('Failed to check requirements:', error)
      return { bluetooth: false, permissions: false, connected: false }
    }
  }
}