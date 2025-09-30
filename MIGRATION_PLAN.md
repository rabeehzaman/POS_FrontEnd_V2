# **POS RELIFE: Backend-to-Frontend Migration Guide**

> **Complete migration plan for combining Express.js backend into Next.js full-stack application**

---

## **📋 Table of Contents**

1. [Project Overview](#project-overview)
2. [Current Architecture](#current-architecture)
3. [Migration Benefits](#migration-benefits)
4. [Prerequisites](#prerequisites)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Migration Steps](#migration-steps)
7. [File Structure](#file-structure)
8. [Code Examples](#code-examples)
9. [Testing Checklist](#testing-checklist)
10. [Deployment Guide](#deployment-guide)
11. [Rollback Plan](#rollback-plan)
12. [Troubleshooting](#troubleshooting)

---

## **📊 Project Overview**

### **Current Setup**
- **Frontend:** Next.js 15 (App Router) at `/Users/tmr/Desktop/Final Projects/POS_RELIFE/POS_FrontEnd_V2`
- **Backend:** Express.js at `/Users/tmr/Desktop/Final Projects/POS_RELIFE_Backend/pos_backend`
- **Backend Deployment:** Railway (https://retail-pos-backend-production.up.railway.app)

### **Goal**
Merge backend into Next.js API routes to create a single full-stack application.

---

## **🏗️ Current Architecture**

```
┌─────────────────────┐
│   Next.js Frontend  │
│   (Port: 3000)      │
└──────────┬──────────┘
           │ Proxy Calls
           ↓
┌─────────────────────┐
│  Express Backend    │
│  (Port: 3001)       │
│  Railway Hosted     │
└──────────┬──────────┘
           │ API Calls
           ↓
┌─────────────────────┐
│  Zoho Books API     │
│  (zohoapis.sa)      │
└─────────────────────┘
```

### **Backend Endpoints (26 Total)**

#### **Authentication (4)**
- `GET /auth/status` - Check auth status
- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/logout` - Clear tokens

#### **Items/Products (3)**
- `GET /api/items` - List items with pagination
- `POST /api/items/bulk-last-sold-prices` - Bulk fetch LastSold prices
- `GET /api/items/:id/history` - Item sales history

#### **Customers (1)**
- `GET /api/customers` - List customers

#### **Invoices (2)**
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:invoiceId/download` - Download PDF

#### **LastSold Prices (5)**
- `POST /api/last-sold-prices/save` - Save price
- `GET /api/last-sold-prices/get` - Get price
- `POST /api/last-sold-prices/bulk` - Bulk get prices
- `DELETE /api/last-sold-prices/clear` - Clear all prices
- `GET /api/last-sold-prices/stats` - Get statistics

#### **Branches, Taxes, Vendors (3)**
- `GET /api/branches` - List branches
- `GET /api/taxes` - List tax rates
- `GET /api/vendors` - List vendors

#### **Units (3)**
- `GET /api/units` - List available units
- `PUT /api/items/:itemId/unit` - Update item unit
- `POST /api/units/convert` - Convert quantities

#### **Advanced (5)**
- `GET /api/products/:productId/sales` - Sales history
- `GET /api/products/:productId/purchases` - Purchase history
- `GET /api/vendors/:vendorId/bills` - Vendor bills
- `GET /api/bills/:billId/details` - Bill details
- `GET /api/inventory/items` - Inventory items

---

## **✅ Migration Benefits**

| Benefit | Description |
|---------|-------------|
| **Simpler Architecture** | No proxy layer, direct API calls |
| **Single Deployment** | One Railway/Vercel instance instead of two |
| **Shared Types** | TypeScript types across frontend/backend |
| **Faster Development** | One dev server (`npm run dev`) |
| **Better DX** | Unified codebase, easier debugging |
| **Cost Savings** | 50% reduction in hosting costs |
| **No CORS Issues** | Same-origin requests |
| **Improved Performance** | No extra network hop |

---

## **📋 Prerequisites**

### **Required Tools**
- Node.js 18+
- npm/yarn/pnpm
- Git

### **Before Starting**
1. ✅ Export Railway environment variables (done)
2. ✅ Commit all changes in both repos
3. ✅ Test current functionality

---

## **🔐 Environment Variables Configuration**

### **Current Railway Backend Variables**
```env
NODE_ENV="production"
PORT="3001"
RAILWAY_PUBLIC_DOMAIN="retail-pos-backend-production.up.railway.app"
ZOHO_ACCESS_TOKEN="1000.4b805a202bf15dc0ee6ad519656c3340.2fd9f00eafa8b60f6718703646b12482"
ZOHO_ACCOUNTS_URL="https://accounts.zoho.sa"
ZOHO_BOOKS_API_URL="https://www.zohoapis.sa/books/v3"
ZOHO_CLIENT_ID="1000.ZF3REMRFJZM9F7BJIMEMWV1HOLT74K"
ZOHO_CLIENT_SECRET="09913adad9d4c6aa4db873a053bef2f9368d553f1a"
ZOHO_INVENTORY_API_URL="https://www.zohoapis.sa/inventory/v1"
ZOHO_ORGANIZATION_ID="150000163897"
ZOHO_REDIRECT_URI="https://retail-pos-backend-production.up.railway.app/auth/callback"
ZOHO_REFRESH_TOKEN="1000.b72c3c8ce7118683d05f83280cfdcf97.cb9d7f4db2edf206287591306075fd2a"
ZOHO_TOKEN_EXPIRES_AT="1754830884373"
```

### **New Unified Next.js Variables**

#### **Development (.env.local)**
```env
# === Zoho OAuth Configuration ===
ZOHO_CLIENT_ID="1000.ZF3REMRFJZM9F7BJIMEMWV1HOLT74K"
ZOHO_CLIENT_SECRET="09913adad9d4c6aa4db873a053bef2f9368d553f1a"
ZOHO_ORGANIZATION_ID="150000163897"

# Development redirect URI (update when deploying)
ZOHO_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# === Zoho API URLs (Saudi Arabia Region) ===
ZOHO_ACCOUNTS_URL="https://accounts.zoho.sa"
ZOHO_BOOKS_API_URL="https://www.zohoapis.sa/books/v3"
ZOHO_INVENTORY_API_URL="https://www.zohoapis.sa/inventory/v1"

# === Token Storage (from Railway) ===
# These will be loaded from storage file initially
ZOHO_ACCESS_TOKEN="1000.4b805a202bf15dc0ee6ad519656c3340.2fd9f00eafa8b60f6718703646b12482"
ZOHO_REFRESH_TOKEN="1000.b72c3c8ce7118683d05f83280cfdcf97.cb9d7f4db2edf206287591306075fd2a"
ZOHO_TOKEN_EXPIRES_AT="1754830884373"

# === Storage Configuration ===
# Local file-based storage
STORAGE_TYPE="file"
TOKENS_FILE_PATH="./data/tokens.json"
LAST_SOLD_PRICES_FILE_PATH="./data/lastSoldPrices.json"

# === Supabase (Keep existing) ===
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-key"

# === Application Settings ===
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### **Production Railway Variables**
```env
# === Zoho OAuth Configuration ===
ZOHO_CLIENT_ID="1000.ZF3REMRFJZM9F7BJIMEMWV1HOLT74K"
ZOHO_CLIENT_SECRET="09913adad9d4c6aa4db873a053bef2f9368d553f1a"
ZOHO_ORGANIZATION_ID="150000163897"

# Production redirect URI (your Railway domain)
ZOHO_REDIRECT_URI="https://your-app.up.railway.app/api/auth/callback"

# === Zoho API URLs (Saudi Arabia Region) ===
ZOHO_ACCOUNTS_URL="https://accounts.zoho.sa"
ZOHO_BOOKS_API_URL="https://www.zohoapis.sa/books/v3"
ZOHO_INVENTORY_API_URL="https://www.zohoapis.sa/inventory/v1"

# === Token Storage (from Railway) ===
ZOHO_ACCESS_TOKEN="1000.4b805a202bf15dc0ee6ad519656c3340.2fd9f00eafa8b60f6718703646b12482"
ZOHO_REFRESH_TOKEN="1000.b72c3c8ce7118683d05f83280cfdcf97.cb9d7f4db2edf206287591306075fd2a"
ZOHO_TOKEN_EXPIRES_AT="1754830884373"

# === Storage Configuration ===
STORAGE_TYPE="file"
TOKENS_FILE_PATH="/app/data/tokens.json"
LAST_SOLD_PRICES_FILE_PATH="/app/data/lastSoldPrices.json"

# === Supabase Production ===
NEXT_PUBLIC_SUPABASE_URL="your-production-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-production-supabase-key"

# === Application Settings ===
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-app.up.railway.app"

# === Railway Specific (Auto-provided) ===
PORT="3000"
RAILWAY_ENVIRONMENT="production"
```

### **Important Notes**

⚠️ **Security:**
- Never commit `.env.local` to git
- Add to `.gitignore`:
  ```gitignore
  .env.local
  .env*.local
  data/
  tokens.json
  lastSoldPrices.json
  ```

⚠️ **Token Expiry:**
- Current token expires at: `1754830884373` (timestamp)
- Expiry date: **2025-12-10** (approximately 8 months from now)
- Backend has auto-refresh logic - migrate this!

⚠️ **Redirect URI:**
- Development: `http://localhost:3000/api/auth/callback`
- Production: `https://your-domain.up.railway.app/api/auth/callback`
- **Must update in Zoho Developer Console when changing domains**

---

## **🚀 Migration Steps**

### **✅ Phase 1: Preparation (COMPLETED)**

#### **1.1 Install Dependencies**
```bash
cd "/Users/tmr/Desktop/Final Projects/POS_RELIFE/POS_FrontEnd_V2"
npm install axios
```

#### **1.2 Create Directory Structure**
```bash
mkdir -p lib/server/zoho
mkdir -p lib/server/storage
mkdir -p lib/server/uom
mkdir -p data
```

#### **1.3 Update .gitignore**
```bash
echo "data/" >> .gitignore
echo "tokens.json" >> .gitignore
echo "lastSoldPrices.json" >> .gitignore
echo ".env*.local" >> .gitignore
```

---

### **✅ Phase 2: Migrate Core Utilities (COMPLETED)**

#### **2.1 Create Zoho API Client**

**File: `/lib/server/zoho/types.ts`**
```typescript
export interface ZohoTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  savedAt?: string
}

export interface ZohoAuthResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  api_domain: string
  token_type: string
}

export interface ZohoAPIConfig {
  accountsUrl: string
  booksApiUrl: string
  inventoryApiUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  organizationId: string
}
```

**File: `/lib/server/zoho/constants.ts`**
```typescript
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
```

**File: `/lib/server/zoho/client.ts`**
```typescript
import axios, { AxiosError } from 'axios'
import { ZohoTokens, ZohoAuthResponse } from './types'
import { ZOHO_CONFIG, TOKEN_REFRESH_THRESHOLD } from './constants'
import { StorageProvider } from '../storage'

export class ZohoAPIClient {
  private tokens: ZohoTokens | null = null
  public storage: StorageProvider

  constructor(storage: StorageProvider) {
    this.storage = storage
  }

  async initialize() {
    // Load tokens from storage
    this.tokens = await this.storage.getTokens()

    // Load from env if not in storage
    if (!this.tokens && process.env.ZOHO_ACCESS_TOKEN) {
      this.tokens = {
        accessToken: process.env.ZOHO_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN!,
        expiresAt: parseInt(process.env.ZOHO_TOKEN_EXPIRES_AT || '0'),
      }
      await this.storage.saveTokens(this.tokens)
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokens?.refreshToken) {
      console.error('No refresh token available')
      return false
    }

    try {
      const response = await axios.post<ZohoAuthResponse>(
        `${ZOHO_CONFIG.accountsUrl}/oauth/v2/token`,
        null,
        {
          params: {
            refresh_token: this.tokens.refreshToken,
            client_id: ZOHO_CONFIG.clientId,
            client_secret: ZOHO_CONFIG.clientSecret,
            grant_type: 'refresh_token',
          },
        }
      )

      this.tokens = {
        accessToken: response.data.access_token,
        refreshToken: this.tokens.refreshToken, // Keep existing refresh token
        expiresAt: Date.now() + response.data.expires_in * 1000,
        savedAt: new Date().toISOString(),
      }

      await this.storage.saveTokens(this.tokens)
      console.log('✅ Token refreshed successfully')
      return true
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      return false
    }
  }

  private async ensureValidToken(): Promise<boolean> {
    if (!this.tokens) {
      await this.initialize()
      if (!this.tokens) return false
    }

    // Check if token is expired or about to expire
    const timeUntilExpiry = this.tokens.expiresAt - Date.now()
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
      return await this.refreshAccessToken()
    }

    return true
  }

  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const isValid = await this.ensureValidToken()
    if (!isValid) {
      throw new Error('Failed to obtain valid access token')
    }

    try {
      const response = await axios.request<T>({
        method,
        url: `${ZOHO_CONFIG.booksApiUrl}${endpoint}`,
        headers: {
          Authorization: `Zoho-oauthtoken ${this.tokens!.accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          organization_id: ZOHO_CONFIG.organizationId,
          ...params,
        },
        data,
      })

      return response.data
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status === 401) {
        // Token invalid, try refresh once
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry request
          return this.makeRequest(method, endpoint, data, params)
        }
      }
      throw error
    }
  }

  getAuthStatus() {
    if (!this.tokens) {
      return {
        authenticated: false,
        hasRefreshToken: false,
        status: 'not_authenticated',
        message: 'Not authenticated',
      }
    }

    const timeUntilExpiry = this.tokens.expiresAt - Date.now()
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60)

    return {
      authenticated: true,
      hasRefreshToken: !!this.tokens.refreshToken,
      tokenExpiresIn: Math.floor(timeUntilExpiry / 1000),
      tokenExpiresInHours: hoursUntilExpiry,
      needsReauth: hoursUntilExpiry < 24,
      critical: hoursUntilExpiry < 1,
      status: hoursUntilExpiry < 1 ? 'critical' : hoursUntilExpiry < 24 ? 'warning' : 'good',
      message: `Token expires in ${hoursUntilExpiry.toFixed(1)} hours`,
    }
  }

  async logout() {
    this.tokens = null
    await this.storage.clearTokens()
  }
}
```

#### **2.2 Create Storage Provider**

**File: `/lib/server/storage/index.ts`**
```typescript
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
```

**File: `/lib/server/storage/file-storage.ts`**
```typescript
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
```

#### **2.3 Create Singleton Instance**

**File: `/lib/server/zoho/instance.ts`**
```typescript
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
```

#### **2.4 Migrate UOM Handler**

**File: `/lib/server/uom/handler.ts`**
```typescript
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
```

---

### **✅ Phase 3: Migrate API Routes (COMPLETED)**

#### **✅ 3.1 Update Auth Routes**

**File: `/app/api/auth/status/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET() {
  try {
    const zoho = await getZohoClient()
    const status = zoho.getAuthStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Auth status check failed:', error)
    return NextResponse.json(
      {
        authenticated: false,
        hasRefreshToken: false,
        status: 'not_authenticated',
        message: 'Authentication check failed'
      },
      { status: 500 }
    )
  }
}
```

**File: `/app/api/auth/login/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { ZOHO_CONFIG } from '@/lib/server/zoho/constants'

export async function GET() {
  const authUrl = `${ZOHO_CONFIG.accountsUrl}/oauth/v2/auth?` +
    `response_type=code&` +
    `client_id=${ZOHO_CONFIG.clientId}&` +
    `scope=ZohoBooks.fullaccess.all&` +
    `redirect_uri=${encodeURIComponent(ZOHO_CONFIG.redirectUri)}&` +
    `access_type=offline&` +
    `prompt=consent`

  return NextResponse.redirect(authUrl)
}
```

**File: `/app/api/auth/callback/route.ts`** (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { ZOHO_CONFIG } from '@/lib/server/zoho/constants'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
  }

  try {
    // Exchange code for tokens
    const response = await axios.post(
      `${ZOHO_CONFIG.accountsUrl}/oauth/v2/token`,
      null,
      {
        params: {
          code,
          client_id: ZOHO_CONFIG.clientId,
          client_secret: ZOHO_CONFIG.clientSecret,
          redirect_uri: ZOHO_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        },
      }
    )

    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + response.data.expires_in * 1000,
      savedAt: new Date().toISOString(),
    }

    // Save tokens
    const zoho = await getZohoClient()
    await zoho.storage.saveTokens(tokens)

    // Redirect to frontend
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 500 })
  }
}
```

**File: `/app/api/auth/logout/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function POST() {
  try {
    const zoho = await getZohoClient()
    await zoho.logout()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
```

#### **3.2 Update Customers Route (Add POST)**

**File: `/app/api/customers/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

// GET - Fetch customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'

    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('GET', '/contacts', undefined, {
      contact_type: 'customer',
      per_page: limit,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST - Create customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Build contact payload
    const contactData: any = {
      contact_name: body.displayName,
      contact_type: 'customer',
      company_name: body.displayName,
    }

    // Email
    if (body.email) {
      contactData.email = body.email
    }

    // Phone
    if (body.workPhone || body.mobile) {
      contactData.phone = body.workPhone || body.mobile
      contactData.mobile = body.mobile || body.workPhone
    }

    // Tax treatment
    if (body.taxTreatment) {
      contactData.tax_treatment = body.taxTreatment
    }

    // Tax registration number (TRN)
    if (body.taxRegistrationNumber) {
      contactData.tax_reg_no = body.taxRegistrationNumber
    }

    // Place of supply (default Saudi Arabia)
    contactData.place_of_supply = body.placeOfSupply || 'SA'

    // Billing Address
    if (body.billingAddress) {
      const addr = body.billingAddress

      // Auto-fill dummy values for VAT registered customers if fields are empty
      const isDummyNeeded = body.taxTreatment === 'vat_registered'

      contactData.billing_address = {
        attention: body.displayName,
        address: addr.street || (isDummyNeeded ? '.' : ''),
        street2: addr.buildingNumber || '',
        city: addr.city || (isDummyNeeded ? '.' : ''),
        state: addr.state || (isDummyNeeded ? '.' : ''),
        zip: addr.zipCode || '',
        country: 'Saudi Arabia',
        phone: body.workPhone || body.mobile || '',
      }
    } else {
      // Default billing address for Saudi Arabia
      contactData.billing_address = {
        attention: body.displayName,
        address: '.',
        city: '.',
        state: '.',
        country: 'Saudi Arabia',
      }
    }

    // Buyer ID (optional)
    if (body.buyerId) {
      contactData.custom_field_hash = {
        cf_buyer_id: body.buyerId,
      }
    }

    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('POST', '/contacts', contactData)

    return NextResponse.json({ success: true, customer: data })
  } catch (error: any) {
    console.error('Failed to create customer:', error.response?.data || error)
    return NextResponse.json(
      {
        error: 'Failed to create customer',
        details: error.response?.data?.message || error.message
      },
      { status: 500 }
    )
  }
}
```

#### **3.3 Update Items Route**

**File: `/app/api/items/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '200'

    const zoho = await getZohoClient()
    const data = await zoho.makeRequest('GET', '/items', undefined, {
      per_page: limit,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
```

#### **3.4 Update Invoices Route**

**File: `/app/api/invoices/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getZohoClient } from '@/lib/server/zoho/instance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const invoiceData = {
      customer_id: body.customer_id,
      line_items: body.line_items,
      is_inclusive_tax: body.is_inclusive_tax || false,
    }

    // Add branch if provided
    if (body.branch_id) {
      ;(invoiceData as any).branch_id = body.branch_id
    }

    // Add template if provided (for Main Branch)
    if (body.template_id) {
      ;(invoiceData as any).template_id = body.template_id
      ;(invoiceData as any).template_name = body.template_name
      ;(invoiceData as any).template_type = body.template_type
    }

    const zoho = await getZohoClient()

    // Create invoice
    const createResponse = await zoho.makeRequest('POST', '/invoices', invoiceData)

    // Mark as sent if requested
    if (body.mark_as_sent) {
      const invoiceId = (createResponse as any).invoice.invoice_id
      await zoho.makeRequest('POST', `/invoices/${invoiceId}/status/sent`)
    }

    return NextResponse.json({ success: true, invoice: (createResponse as any).invoice })
  } catch (error: any) {
    console.error('Failed to create invoice:', error.response?.data || error)
    return NextResponse.json(
      {
        error: 'Failed to create invoice',
        details: error.response?.data?.message || error.message
      },
      { status: 500 }
    )
  }
}
```

**Note:** Continue with remaining routes following the same pattern.

---

### **Phase 4: Update Frontend Code (1 hour)**

#### **4.1 Remove Proxy Logic**

All existing frontend API routes that use proxy pattern need to be updated.

**Before:**
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://retail-pos-backend-production.up.railway.app'
const response = await fetch(`${backendUrl}/api/customers`)
```

**After:**
```typescript
const response = await fetch('/api/customers')
```

#### **4.2 Remove Environment Variable**

Delete this from `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://retail-pos-backend-production.up.railway.app
```

---

### **Phase 5: Testing (2-3 hours)**

#### **Local Development Testing**

1. **Stop backend server** (if running)
2. **Start Next.js dev server:**
   ```bash
   cd "/Users/tmr/Desktop/Final Projects/POS_RELIFE/POS_FrontEnd_V2"
   npm run dev
   ```

3. **Test checklist:**

- [ ] **Authentication**
  - [ ] Login redirects to Zoho
  - [ ] Callback saves tokens
  - [ ] Auth status shows correct info
  - [ ] Logout clears tokens

- [ ] **Products**
  - [ ] Product list loads
  - [ ] Search works
  - [ ] Add to cart works
  - [ ] Unit conversion works

- [ ] **Customers**
  - [ ] Customer list loads
  - [ ] Customer search works
  - [ ] Create new customer (mobile/desktop)
  - [ ] Customer selection works

- [ ] **Cart**
  - [ ] Add items
  - [ ] Update quantities
  - [ ] Remove items
  - [ ] Clear cart

- [ ] **Invoices**
  - [ ] Create draft invoice
  - [ ] Create sent invoice
  - [ ] Download invoice PDF
  - [ ] Print invoice

- [ ] **LastSold Pricing**
  - [ ] Prices save correctly
  - [ ] Prices load correctly
  - [ ] Branch-specific pricing
  - [ ] Tax mode switching

---

## **📁 Complete File Structure After Migration**

```
POS_FrontEnd_V2/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── status/route.ts           ✅ Updated
│   │   │   ├── login/route.ts            ✅ Updated
│   │   │   ├── callback/route.ts         🆕 Created
│   │   │   └── logout/route.ts           ✅ Updated
│   │   ├── branches/route.ts             ✅ Updated
│   │   ├── customers/route.ts            ✅ Updated (GET + POST)
│   │   ├── invoices/
│   │   │   ├── route.ts                  ✅ Updated
│   │   │   └── [invoiceId]/
│   │   │       └── download/route.ts     ✅ Updated
│   │   ├── items/
│   │   │   ├── route.ts                  ✅ Updated
│   │   │   ├── [id]/
│   │   │   │   ├── history/route.ts      ✅ Updated
│   │   │   │   └── unit/route.ts         🆕 Created
│   │   │   └── bulk-last-sold/route.ts   🆕 Created
│   │   ├── last-sold-prices/
│   │   │   ├── bulk/route.ts             ✅ Updated
│   │   │   ├── clear/route.ts            ✅ Updated
│   │   │   ├── get/route.ts              ✅ Updated
│   │   │   ├── save/route.ts             ✅ Updated
│   │   │   └── stats/route.ts            ✅ Updated
│   │   ├── taxes/route.ts                🆕 Created
│   │   ├── units/
│   │   │   ├── route.ts                  🆕 Created
│   │   │   └── convert/route.ts          🆕 Created
│   │   └── vendors/route.ts              🆕 Created
│   ├── page.tsx
│   └── ...
├── components/
│   ├── pos/
│   │   ├── cart-sidebar.tsx              ✅ Integrate Add Customer button
│   │   ├── add-customer-dialog.tsx       🆕 Create
│   │   └── ...
│   └── ...
├── lib/
│   ├── server/                           🆕 Created
│   │   ├── zoho/
│   │   │   ├── client.ts                 🆕 Main API client
│   │   │   ├── types.ts                  🆕 TypeScript types
│   │   │   ├── constants.ts              🆕 Configuration
│   │   │   └── instance.ts               🆕 Singleton
│   │   ├── storage/
│   │   │   ├── index.ts                  🆕 Storage interface
│   │   │   └── file-storage.ts           🆕 File implementation
│   │   └── uom/
│   │       └── handler.ts                🆕 Unit conversion
│   ├── stores/
│   ├── hooks/
│   └── utils/
├── data/                                 🆕 Created (git-ignored)
│   ├── tokens.json                       🆕 Token storage
│   └── lastSoldPrices.json               🆕 Prices storage
├── .env.local                            ✅ Updated variables
├── .gitignore                            ✅ Updated
├── package.json                          ✅ Added axios
└── MIGRATION_PLAN.md                     📄 This file
```

---

## **🚢 Deployment Guide**

### **Railway Deployment**

#### **Option 1: Deploy to Same Railway Project (Recommended)**

1. **Update Railway project:**
   ```bash
   # Connect to Railway
   cd "/Users/tmr/Desktop/Final Projects/POS_RELIFE/POS_FrontEnd_V2"
   railway link
   ```

2. **Set environment variables in Railway dashboard:**
   - Copy all variables from **Environment Variables Configuration** section above
   - Update `ZOHO_REDIRECT_URI` to your Railway domain
   - Add: `NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app`

3. **Configure build:**
   - Railway should auto-detect Next.js
   - Build command: `npm run build`
   - Start command: `npm run start`

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Update Zoho Developer Console:**
   - Go to https://api-console.zoho.sa/
   - Update redirect URI to: `https://your-app.up.railway.app/api/auth/callback`

#### **Option 2: Deploy to Vercel**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd "/Users/tmr/Desktop/Final Projects/POS_RELIFE/POS_FrontEnd_V2"
   vercel
   ```

3. **Set environment variables:**
   - Use Vercel dashboard or CLI
   - Copy all variables from configuration section
   - Update `ZOHO_REDIRECT_URI`

4. **Configure storage:**
   - Consider using Vercel KV for production
   - Or use persistent file storage with Railway

---

## **🔄 Rollback Plan**

If something goes wrong:

### **Quick Rollback (Keep Backend Running)**

1. **Restore environment variable:**
   ```env
   NEXT_PUBLIC_API_URL=https://retail-pos-backend-production.up.railway.app
   ```

2. **Revert frontend API routes to proxy pattern**

3. **Keep backend Railway deployment active**

---

## **🐛 Troubleshooting**

### **Issue: "Failed to obtain valid access token"**

**Cause:** Token expired or invalid
**Solution:**
1. Delete `data/tokens.json`
2. Visit `/api/auth/login`
3. Complete OAuth flow

### **Issue: "Module not found: @/lib/server/zoho/client"**

**Cause:** TypeScript path mapping
**Solution:** Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### **Issue: "ENOENT: no such file or directory"**

**Cause:** `data/` directory doesn't exist
**Solution:**
```bash
mkdir -p data
chmod 755 data
```

### **Issue: Railway deployment fails**

**Cause:** Missing environment variables
**Solution:**
1. Check Railway dashboard for all required env vars
2. Ensure `ZOHO_REDIRECT_URI` matches deployment URL
3. Check build logs for specific errors

### **Issue: "Cannot write to file system" on Vercel**

**Cause:** Vercel has read-only file system
**Solution:** Use Vercel KV storage instead of file-based storage

---

## **📊 Migration Checklist**

### **Pre-Migration**
- [ ] Export Railway environment variables
- [ ] Test current functionality
- [ ] Commit all changes

### **Phase 1: Setup**
- [ ] Install dependencies
- [ ] Create directory structure
- [ ] Update .gitignore
- [ ] Create environment file

### **Phase 2: Core Utilities**
- [ ] Create Zoho API client
- [ ] Create storage provider
- [ ] Migrate UOM handler
- [ ] Test utilities in isolation

### **Phase 3: API Routes (High Priority)**
- [ ] Update auth/status
- [ ] Update auth/login
- [ ] Create auth/callback
- [ ] Update auth/logout
- [ ] Update items route
- [ ] Update customers route (GET + POST)
- [ ] Update invoices route
- [ ] Update invoice download route
- [ ] Update branches route
- [ ] Update all lastSold routes

### **Phase 4: API Routes (Medium Priority)**
- [ ] Create taxes route
- [ ] Create vendors route
- [ ] Create units routes
- [ ] Migrate remaining routes

### **Phase 5: Frontend**
- [ ] Remove proxy logic
- [ ] Update fetch calls
- [ ] Test all components

### **Phase 6: Testing**
- [ ] Authentication flow
- [ ] Product operations
- [ ] Customer operations
- [ ] Cart operations
- [ ] Invoice creation
- [ ] PDF download
- [ ] LastSold pricing

### **Phase 7: Deployment**
- [ ] Deploy to Railway/Vercel
- [ ] Set environment variables
- [ ] Update Zoho redirect URI
- [ ] Test production deployment
- [ ] Monitor logs

### **Phase 8: Cleanup**
- [ ] Archive old backend
- [ ] Update documentation
- [ ] Remove old Railway backend (optional)

---

## **📈 Success Metrics**

After migration, you should achieve:

✅ **Single codebase** - One project instead of two
✅ **Faster development** - One dev server
✅ **Simpler deployment** - One Railway/Vercel instance
✅ **Cost reduction** - 50% less hosting costs
✅ **Better maintainability** - Unified architecture
✅ **No breaking changes** - All features working

---

## **🤝 Support & Next Steps**

### **After Migration**
1. Monitor application for 24-48 hours
2. Keep backend Railway deployment as backup (1 week)
3. Update Zoho webhook URLs (if any)
4. Update API documentation
5. Train team on new architecture

### **Future Enhancements**
- Migrate from file storage to database (PostgreSQL/Supabase)
- Add Redis caching for API responses
- Implement rate limiting
- Add request logging/monitoring
- Add automated tests

---

**Migration Plan Created:** 2025-09-30
**Estimated Completion:** 2-3 days of focused work
**Risk Level:** Low (can rollback easily)
**Business Impact:** Zero downtime if backend kept as fallback

---

**Document Status:** Ready for implementation
**Next Action:** Await user approval to begin migration