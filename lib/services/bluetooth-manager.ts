import { BleClient, BleDevice, numbersToDataView, dataViewToNumbers } from '@capacitor-community/bluetooth-le'
import { Capacitor } from '@capacitor/core'

export interface BluetoothPrinter extends BleDevice {
  name: string
  deviceId: string
  rssi?: number
  connected: boolean
  lastConnected?: Date
}

export interface BluetoothConnection {
  device: BluetoothPrinter
  serviceId: string
  characteristicId: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export class BluetoothManager {
  private static instance: BluetoothManager
  private connection: BluetoothConnection | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private connectionCallbacks: Set<(status: ConnectionStatus) => void> = new Set()
  private autoReconnectEnabled = true
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 2000

  // PRO-V29L specific configuration
  private readonly PRINTER_NAME_PATTERNS = ['PRO-V29L', 'MHT-P29L', 'Milestone']
  private readonly SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb' // Common for thermal printers
  private readonly CHARACTERISTIC_UUID = '0000ff01-0000-1000-8000-00805f9b34fb'

  private constructor() {
    this.initialize()
  }

  static getInstance(): BluetoothManager {
    if (!BluetoothManager.instance) {
      BluetoothManager.instance = new BluetoothManager()
    }
    return BluetoothManager.instance
  }

  private async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Bluetooth manager is only available on native platforms')
      return
    }

    try {
      await BleClient.initialize()
      console.log('Bluetooth manager initialized')
      
      // Try to auto-reconnect to previously connected printer
      this.attemptAutoReconnect()
    } catch (error) {
      console.error('Failed to initialize Bluetooth manager:', error)
      this.setConnectionStatus('error')
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionCallbacks.add(callback)
    return () => this.connectionCallbacks.delete(callback)
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status
    this.connectionCallbacks.forEach(callback => callback(status))
  }

  async scanForPrinters(timeoutMs = 10000): Promise<BluetoothPrinter[]> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Bluetooth scanning is only available on native platforms')
    }

    try {
      console.log('Starting Bluetooth scan for printers...')
      
      const devices: BluetoothPrinter[] = []
      
      await BleClient.requestLEScan(
        {
          services: [], // Scan for all devices
          allowDuplicates: false
        },
        (result) => {
          const device = result.device
          
          // Filter for thermal printer devices
          if (this.isPrinterDevice(device)) {
            const printer: BluetoothPrinter = {
              ...device,
              name: device.name || device.deviceId,
              connected: false,
              rssi: result.rssi
            }
            
            // Avoid duplicates
            if (!devices.find(d => d.deviceId === printer.deviceId)) {
              devices.push(printer)
              console.log('Found printer:', printer.name, printer.deviceId)
            }
          }
        }
      )

      // Stop scanning after timeout
      setTimeout(async () => {
        await BleClient.stopLEScan()
        console.log(`Bluetooth scan completed. Found ${devices.length} printers.`)
      }, timeoutMs)

      return devices
    } catch (error) {
      console.error('Bluetooth scan failed:', error)
      throw new Error(`Failed to scan for printers: ${error}`)
    }
  }

  private isPrinterDevice(device: BleDevice): boolean {
    const name = device.name?.toLowerCase() || ''
    return this.PRINTER_NAME_PATTERNS.some(pattern => 
      name.includes(pattern.toLowerCase())
    ) || name.includes('thermal') || name.includes('printer')
  }

  async connectToPrinter(device: BluetoothPrinter): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Bluetooth connection is only available on native platforms')
    }

    try {
      this.setConnectionStatus('connecting')
      console.log('Connecting to printer:', device.name, device.deviceId)

      // Connect to device
      await BleClient.connect(device.deviceId)
      
      // Discover services
      const services = await BleClient.getServices(device.deviceId)
      console.log('Available services:', services.map(s => s.uuid))

      // Find the printer service
      let serviceId = this.SERVICE_UUID
      let characteristicId = this.CHARACTERISTIC_UUID

      // Try to find a suitable service and characteristic
      for (const service of services) {
        for (const characteristic of service.characteristics) {
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            serviceId = service.uuid
            characteristicId = characteristic.uuid
            break
          }
        }
        if (serviceId !== this.SERVICE_UUID) break
      }

      this.connection = {
        device: { ...device, connected: true, lastConnected: new Date() },
        serviceId,
        characteristicId
      }

      // Save connection preferences
      this.saveConnectionPreferences(device)
      
      this.setConnectionStatus('connected')
      this.reconnectAttempts = 0
      
      console.log('Successfully connected to printer:', device.name)
      return true

    } catch (error) {
      console.error('Failed to connect to printer:', error)
      this.setConnectionStatus('error')
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return

    try {
      await BleClient.disconnect(this.connection.device.deviceId)
      this.connection = null
      this.setConnectionStatus('disconnected')
      console.log('Disconnected from printer')
    } catch (error) {
      console.error('Error disconnecting from printer:', error)
    }
  }

  async sendData(data: Uint8Array): Promise<boolean> {
    if (!this.connection || this.connectionStatus !== 'connected') {
      throw new Error('No active printer connection')
    }

    try {
      const dataView = numbersToDataView(Array.from(data))
      
      await BleClient.write(
        this.connection.device.deviceId,
        this.connection.serviceId,
        this.connection.characteristicId,
        dataView
      )

      console.log('Data sent to printer:', data.length, 'bytes')
      return true
    } catch (error) {
      console.error('Failed to send data to printer:', error)
      
      // Try to reconnect if connection lost
      if (error.toString().includes('disconnected')) {
        this.handleConnectionLost()
      }
      
      return false
    }
  }

  private async handleConnectionLost(): Promise<void> {
    console.log('Connection lost, attempting to reconnect...')
    this.setConnectionStatus('error')
    
    if (this.autoReconnectEnabled && this.connection) {
      await this.attemptReconnect()
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.connection || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

    setTimeout(async () => {
      if (this.connection) {
        const success = await this.connectToPrinter(this.connection.device)
        if (!success) {
          await this.attemptReconnect()
        }
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  private async attemptAutoReconnect(): Promise<void> {
    const savedDevice = this.getSavedConnectionPreferences()
    if (!savedDevice) return

    console.log('Attempting auto-reconnect to:', savedDevice.name)
    await this.connectToPrinter(savedDevice)
  }

  private saveConnectionPreferences(device: BluetoothPrinter): void {
    try {
      const preferences = {
        deviceId: device.deviceId,
        name: device.name,
        lastConnected: new Date().toISOString()
      }
      localStorage.setItem('bluetooth_printer_prefs', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save connection preferences:', error)
    }
  }

  private getSavedConnectionPreferences(): BluetoothPrinter | null {
    try {
      const saved = localStorage.getItem('bluetooth_printer_prefs')
      if (!saved) return null

      const prefs = JSON.parse(saved)
      return {
        deviceId: prefs.deviceId,
        name: prefs.name,
        connected: false,
        lastConnected: new Date(prefs.lastConnected)
      }
    } catch (error) {
      console.error('Failed to load connection preferences:', error)
      return null
    }
  }

  getConnectedDevice(): BluetoothPrinter | null {
    return this.connection?.device || null
  }

  isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.connection !== null
  }

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnectEnabled = enabled
  }

  async checkBluetoothPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true

    try {
      // Request permissions if needed
      await BleClient.requestPermissions()
      return true
    } catch (error) {
      console.error('Bluetooth permissions denied:', error)
      return false
    }
  }

  async isBluetoothEnabled(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false

    try {
      const state = await BleClient.getState()
      return state === 'poweredOn'
    } catch (error) {
      console.error('Failed to check Bluetooth state:', error)
      return false
    }
  }
}