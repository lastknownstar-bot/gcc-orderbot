import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  metaVerifyToken: process.env.META_VERIFY_TOKEN || 'gcc_orderbot_secret_token_2026',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'mock_phone_id_100234',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  merchant: {
    name: process.env.MERCHANT_NAME || 'Al-Ameed Roastery & Sweets (العميد للحلويات والقهوة)',
    defaultCountry: process.env.DEFAULT_COUNTRY || 'BH',
    defaultCurrency: (process.env.DEFAULT_CURRENCY || 'BHD') as 'BHD' | 'SAR' | 'AED',
    defaultDeliveryFee: parseFloat(process.env.DEFAULT_DELIVERY_FEE || '1.000'),
    benefitPayIban: process.env.BENEFITPAY_IBAN || 'BH00BBGO00000001234567',
    benefitPayMerchantId: process.env.BENEFITPAY_MERCHANT_ID || 'MERC_BH_88992',
    tapPublicKey: process.env.TAP_PUBLIC_KEY || 'pk_test_V0p17xX3u',
    myfatoorahApiKey: process.env.MYFATOORAH_API_KEY || 'mock_myfatoorah_token',
  }
};
