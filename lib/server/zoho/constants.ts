export const ZOHO_CONFIG = {
  accountsUrl: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.sa',
  booksApiUrl: process.env.ZOHO_BOOKS_API_URL || 'https://www.zohoapis.sa/books/v3',
  inventoryApiUrl: process.env.ZOHO_INVENTORY_API_URL || 'https://www.zohoapis.sa/inventory/v1',
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  redirectUri: process.env.ZOHO_REDIRECT_URI!,
  organizationId: process.env.ZOHO_ORGANIZATION_ID!,
}

export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes before expiry