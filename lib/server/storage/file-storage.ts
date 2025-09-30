import fs from 'fs/promises'
import path from 'path'
import { StorageProvider } from './index'
import { ZohoTokens } from '../zoho/types'

export class FileStorage implements StorageProvider {
  private tokensPath: string
  private lastSoldPricesPath: string

  constructor() {
    this.tokensPath = process.env.TOKENS_FILE_PATH || path.join(process.cwd(), 'data', 'tokens.json')
    this.lastSoldPricesPath = process.env.LAST_SOLD_PRICES_FILE_PATH || path.join(process.cwd(), 'data', 'lastSoldPrices.json')

    // Ensure data directory exists
    this.ensureDataDir()
  }

  private async ensureDataDir() {
    const dataDir = path.dirname(this.tokensPath)
    try {
      await fs.mkdir(dataDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create data directory:', error)
    }
  }

  async getTokens(): Promise<ZohoTokens | null> {
    try {
      const data = await fs.readFile(this.tokensPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return null
    }
  }

  async saveTokens(tokens: ZohoTokens): Promise<void> {
    await this.ensureDataDir()
    await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2))
  }

  async clearTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokensPath)
    } catch (error) {
      // File doesn't exist, ignore
    }
  }

  async getLastSoldPrices(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.lastSoldPricesPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return {}
    }
  }

  async saveLastSoldPrice(key: string, data: any): Promise<void> {
    const prices = await this.getLastSoldPrices()
    prices[key] = data
    await this.ensureDataDir()
    await fs.writeFile(this.lastSoldPricesPath, JSON.stringify(prices, null, 2))
  }

  async clearLastSoldPrices(): Promise<void> {
    await this.ensureDataDir()
    await fs.writeFile(this.lastSoldPricesPath, '{}')
  }
}