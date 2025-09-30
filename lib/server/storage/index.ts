import { ZohoTokens } from '../zoho/types'

export interface StorageProvider {
  getTokens(): Promise<ZohoTokens | null>
  saveTokens(tokens: ZohoTokens): Promise<void>
  clearTokens(): Promise<void>

  getLastSoldPrices(): Promise<Record<string, any>>
  saveLastSoldPrice(key: string, data: any): Promise<void>
  clearLastSoldPrices(): Promise<void>
}

// Export implementations
export { FileStorage } from './file-storage'