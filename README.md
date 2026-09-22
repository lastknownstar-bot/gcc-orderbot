# 🌴 GCC-OrderBot

> **Hyper-Local WhatsApp & Instagram Conversational Sales Agent** tailored specifically for GCC / Gulf merchants (**Bahrain 🇧🇭, Saudi Arabia 🇸🇦, UAE 🇦🇪**).

![GCC-OrderBot Banner](https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=1200&auto=format&fit=crop&q=80)

---

## ⚡ Core Features

1. **Multi-Agent Conversational AI Engine (Gemini 2.5 Flash + Khaleeji Fallback)**:
   - **Cultural Nuances & Dialects**: Understands Khaleeji / Gulf colloquial phrases (*"هلا والله"*, *"جم سعره"*, *"أبي اطلب"*, *"طرشلي الرابط"*, *"كم الحساب"*, *"موجود توصيل للرفاع/المحرق/الرياض/دبي"*), English, and Hindi/Urdu.
   - **Structured Intent & Cart Extraction**: Parses item quantities (*"أبي 2 كرك و 1 كنافة"*, *"حبتين"*, *"درزن معمول"*), calculates totals, and manages active cart states.
   - **GCC Address Parsing**: Extracts structured Area, Block (مجمع), Road (طريق), and Building (مبنى/منزل).
   - **Regional Currency Formatting**: Native support for **BHD** (Bahraini Dinar - 3 decimals e.g., `2.500 BD`), **SAR** (Saudi Riyal), and **AED** (UAE Dirham).
   - **Zero-Friction Offline Fallback**: Works immediately out-of-the-box with or without a `GEMINI_API_KEY`.

2. **Regional Payment & Dynamic Checkout**:
   - **BenefitPay (Bahrain)**: Dynamic Fawri+ QR code generator and deep link stub with automated reference generation.
   - **Tap Payments & MyFatoorah**: Hosted checkout link stubs for KSA (Mada / Apple Pay) and UAE.
   - **Automated WhatsApp Receipts**: Listening to `/api/webhook/payment-status`. When payment flips to `PAID`, an automated receipt and tracking notification is sent directly to the customer's WhatsApp chat thread.

3. **Interactive WhatsApp Simulator Sandbox**:
   - Realistic mobile WhatsApp UI for local testing without needing Meta developer verification or phone hardware.
   - One-click Khaleeji quick-test prompt pills.
   - Interactive BenefitPay QR code popup with a 1-click **"Simulate Payment"** trigger.

4. **Merchant Operations Dashboard (React + Tailwind)**:
   - **Live Orders Table**: Filter by `Pending Payment`, `Paid`, `Dispatched`, or `Cancelled`.
   - **Live Carts & Addresses Inspector**: Real-time inspection of active WhatsApp conversation baskets and AI-extracted addresses.
   - **Payment Gateways & Shopify Sync**: Live toggles for BenefitPay Fawri+, Tap Payments, and Shopify inventory sync.
   - **Product Catalog Manager**: View items, update stock availability, and inspect GCC regional pricing.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, TypeScript, `@google/genai`
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, `qrcode.react`
- **Architecture**: REST APIs + Webhook Handlers (`Meta Graph API` & `Payment Status`)

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if you have a Google Gemini API Key:
```env
PORT=5000
NODE_ENV=development

# Optional: Add your Gemini API Key.
# If left blank, the built-in smart Khaleeji Heuristic Fallback engine is active!
GEMINI_API_KEY=your_gemini_api_key_here

# Meta Graph API (WhatsApp Business API / Instagram)
META_VERIFY_TOKEN=gcc_orderbot_secret_token_2026
WHATSAPP_PHONE_NUMBER_ID=mock_phone_id_100234
WHATSAPP_ACCESS_TOKEN=mock_meta_access_token

# Regional Merchant Defaults
MERCHANT_NAME=Al-Ameed Roastery & Sweets (العميد للحلويات والقهوة)
DEFAULT_COUNTRY=BH
DEFAULT_CURRENCY=BHD
DEFAULT_DELIVERY_FEE=1.000
BENEFITPAY_IBAN=BH00BBGO00000001234567
BENEFITPAY_MERCHANT_ID=MERC_BH_88992
```

### 3. Run Locally

#### Option A: Unified Full-Stack Mode (Concurrent)
```bash
npm run dev
```
- Backend API runs on: `http://localhost:5000`
- Client runs on: `http://localhost:3000` (proxied to port 5000)

#### Option B: Production / Single-Port Mode
```bash
# Build the client bundle
npm run client:build

# Start the Express server (serves both API & Frontend)
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## 📡 API Endpoints & Webhooks

### Meta Graph API Webhook
- **`GET /api/webhook/whatsapp`**: Webhook verification challenge (`hub.mode`, `hub.challenge`, `hub.verify_token`).
- **`POST /api/webhook/whatsapp`**: Inbound WhatsApp Business API messages handler.

### Payment Gateway Webhook
- **`POST /api/webhook/payment-status`**:
  ```json
  {
    "orderId": "ord_sample_9841",
    "status": "PAID",
    "paymentMethod": "BENEFITPAY",
    "transactionRef": "BP-TXN-123456"
  }
  ```
  *Updates order status to `PAID` and sends automated confirmation to customer's WhatsApp thread.*

### Chat & Simulation
- **`POST /api/chat/simulate`**: Send simulated customer message (`phone`, `name`, `text`).
- **`GET /api/chat/history/:phone`**: Retrieve conversation thread.
- **`POST /api/chat/reset/:phone`**: Reset chat session.

### Merchant Fulfillment & Catalog
- **`GET /api/orders`**: Retrieve all orders.
- **`PATCH /api/orders/:id/status`**: Update status (`PENDING_PAYMENT`, `PAID`, `DISPATCHED`, `CANCELLED`).
- **`POST /api/orders/:id/simulate-pay`**: Trigger simulated BenefitPay/Tap payment.
- **`GET /api/products`**: Fetch product catalog.
- **`PATCH /api/products/:id`**: Update stock or price.
- **`GET /api/merchant/settings`**: Get merchant configuration & active gateways.
- **`POST /api/merchant/settings`**: Update merchant settings.

---

## 🧪 Testing Scenarios in the WhatsApp Sandbox

1. **Greeting & Recommendation**:
   - Send: *"هلا والله شنو عندكم اليوم؟"*
   - Bot greets hospitably and lists today's Gulf specialties.
2. **Order Placement & Multi-Item Cart**:
   - Send: *"أبي 2 بوكس كرك و 1 كنافة"*
   - Bot calculates items in BHD (e.g. `13.600 BHD` incl. delivery) and asks for address.
3. **Address Submission**:
   - Send: *"الرفاع الغربي، مجمع 912، طريق 1402، مبنى 55"*
   - Bot parses Area, Block, Road, and Building.
4. **BenefitPay Fawri+ Checkout**:
   - Send: *"طرش لي رابط الدفع بينفت باي"*
   - Bot sends dynamic payment card with BenefitPay QR link.
   - Click "فتح رمز QR في BenefitPay" -> "Simulate Payment".
   - Bot sends automated receipt with order reference.
5. **English & Other GCC Countries**:
   - Switch currency to `SAR` in Settings and send: *"أبي 2 معمول للرياض حي العليا"*.

---

## 📄 License
ISC © 2026 GCC-OrderBot. Built for Gulf merchants and conversational sales innovation.
