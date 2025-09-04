'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothSearching,
  Printer,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { MobilePrintingService } from '@/lib/services/mobile-printing'
import { BluetoothPrinter } from '@/lib/services/bluetooth-manager'
import { Capacitor } from '@capacitor/core'

interface PrinterStatus {
  connected: boolean
  device?: BluetoothPrinter
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  queueLength: number
  isProcessing: boolean
  lastError?: string
}

export function PrinterSetup() {
  const [isNative, setIsNative] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState<BluetoothPrinter[]>([])
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    connected: false,
    connectionStatus: 'disconnected',
    queueLength: 0,
    isProcessing: false
  })
  const [requirements, setRequirements] = useState({
    bluetooth: false,
    permissions: false,
    connected: false
  })
  const [testPrinting, setTestPrinting] = useState(false)
  const [autoReconnect, setAutoReconnect] = useState(true)

  const printService = MobilePrintingService.getInstance()

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
    
    if (Capacitor.isNativePlatform()) {
      checkRequirements()
      updateStatus()
      
      // Listen to status changes
      const unsubscribe = printService.onStatusChange((status) => {
        setPrinterStatus(status)
      })
      
      return unsubscribe
    }
  }, [])

  const checkRequirements = async () => {
    try {
      const reqs = await printService.checkRequirements()
      setRequirements(reqs)
    } catch (error) {
      console.error('Failed to check requirements:', error)
    }
  }

  const updateStatus = () => {
    const status = printService.getStatus()
    setPrinterStatus(status)
  }

  const scanForPrinters = async () => {
    if (!isNative) {
      toast.error('Bluetooth printing is only available in the mobile app')
      return
    }

    setIsScanning(true)
    setAvailablePrinters([])
    
    try {
      const printers = await printService.scanForPrinters(10000)
      setAvailablePrinters(printers)
      
      if (printers.length === 0) {
        toast.info('No printers found. Make sure your PRO-V29L is on and discoverable.')
      } else {
        toast.success(`Found ${printers.length} printer(s)`)
      }
    } catch (error) {
      console.error('Scan failed:', error)
      toast.error('Failed to scan for printers. Check Bluetooth permissions.')
    } finally {
      setIsScanning(false)
    }
  }

  const connectToPrinter = async (printer: BluetoothPrinter) => {
    try {
      const success = await printService.connectToPrinter(printer)
      if (success) {
        updateStatus()
        setAvailablePrinters([]) // Clear scan results after connection
      }
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const disconnect = async () => {
    try {
      await printService.disconnect()
      updateStatus()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  const runTestPrint = async () => {
    if (!printerStatus.connected) {
      toast.error('No printer connected')
      return
    }

    setTestPrinting(true)
    
    try {
      const jobId = await printService.printTest({ showProgress: true, retryOnFail: true })
      console.log('Test print job queued:', jobId)
    } catch (error) {
      console.error('Test print failed:', error)
      toast.error('Failed to start test print')
    } finally {
      setTestPrinting(false)
    }
  }

  const getConnectionStatusBadge = () => {
    switch (printerStatus.connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
      case 'connecting':
        return <Badge className="bg-blue-100 text-blue-800"><BluetoothSearching className="w-3 h-3 mr-1" />Connecting...</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Bluetooth className="w-3 h-3 mr-1" />Disconnected</Badge>
    }
  }

  const getRequirementsBadge = (met: boolean, label: string) => {
    return (
      <div className="flex items-center gap-2">
        {met ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <span className={met ? 'text-green-700' : 'text-red-700'}>{label}</span>
      </div>
    )
  }

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Bluetooth Printer Setup
          </CardTitle>
          <CardDescription>
            Configure PRO-V29L thermal printer for mobile printing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Mobile App Required</p>
              <p className="text-sm text-blue-700">
                Bluetooth printer setup is only available in the mobile app. 
                Install the TMR POS app on your device to use thermal printing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BluetoothConnected className="w-5 h-5" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Connection Status</span>
            {getConnectionStatusBadge()}
          </div>
          
          {printerStatus.device && (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Connected Device</span>
                <span className="text-sm text-gray-600">{printerStatus.device.name}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ID: {printerStatus.device.deviceId.slice(-8)}
                {printerStatus.device.lastConnected && (
                  <span className="ml-2">
                    Last connected: {printerStatus.device.lastConnected.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {printerStatus.queueLength > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Print Queue</span>
              <Badge variant="outline">
                {printerStatus.queueLength} job{printerStatus.queueLength !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {printerStatus.lastError && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <XCircle className="w-4 h-4 inline mr-1" />
                {printerStatus.lastError}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {printerStatus.connected ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={disconnect}
                  disabled={printerStatus.isProcessing}
                >
                  Disconnect
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={runTestPrint}
                  disabled={testPrinting || printerStatus.isProcessing}
                >
                  {testPrinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Print
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={scanForPrinters}
                disabled={isScanning}
                size="sm"
              >
                {isScanning ? (
                  <>
                    <BluetoothSearching className="w-4 h-4 mr-1" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 mr-1" />
                    Find Printers
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requirements Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {getRequirementsBadge(requirements.bluetooth, 'Bluetooth Enabled')}
          {getRequirementsBadge(requirements.permissions, 'Bluetooth Permissions')}
          
          {(!requirements.bluetooth || !requirements.permissions) && (
            <Button variant="outline" size="sm" onClick={checkRequirements}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh Status
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available Printers */}
      {availablePrinters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Printers</CardTitle>
            <CardDescription>
              Found {availablePrinters.length} printer(s). Tap to connect.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availablePrinters.map((printer, index) => (
                <div
                  key={printer.deviceId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => connectToPrinter(printer)}
                >
                  <div>
                    <p className="font-medium">{printer.name}</p>
                    <p className="text-sm text-gray-500">
                      {printer.deviceId.slice(-8)}
                      {printer.rssi && (
                        <span className="ml-2">Signal: {printer.rssi}dBm</span>
                      )}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Printer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-reconnect">Auto Reconnect</Label>
              <p className="text-sm text-gray-500">
                Automatically reconnect to the last used printer when the app starts
              </p>
            </div>
            <Switch
              id="auto-reconnect"
              checked={autoReconnect}
              onCheckedChange={setAutoReconnect}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>PRO-V29L Setup:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Turn on your PRO-V29L printer</li>
              <li>Make sure Bluetooth is enabled on your device</li>
              <li>The printer should be discoverable (check OLED display)</li>
              <li>Tap "Find Printers" to scan</li>
              <li>Select your printer from the list to connect</li>
              <li>If prompted for PIN, try: 1234 or 0000</li>
              <li>Run a test print to verify connection</li>
            </ol>
          </div>
          
          <Separator />
          
          <div className="text-sm space-y-2">
            <p><strong>Troubleshooting:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Make sure printer is charged and turned on</li>
              <li>Check printer OLED display for connection status</li>
              <li>Try turning Bluetooth off/on if no printers found</li>
              <li>Restart the printer if connection fails</li>
              <li>Paper should be loaded for test prints</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}