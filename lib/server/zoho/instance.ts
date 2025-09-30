import { ZohoAPIClient } from './client'
import { FileStorage } from '../storage'

let zohoClient: ZohoAPIClient | null = null

export async function getZohoClient(): Promise<ZohoAPIClient> {
  if (!zohoClient) {
    const storage = new FileStorage()
    zohoClient = new ZohoAPIClient(storage)
    await zohoClient.initialize()
  }
  return zohoClient
}