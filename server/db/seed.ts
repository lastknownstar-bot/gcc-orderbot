import { Product } from './types.js';

export const initialProducts: Product[] = [
  {
    id: 'cb_prod_pistachio_cake',
    name_ar: 'كيكة الفستق الشهيرة (Famous Pistachio Cake)',
    name_en: 'Famous Pistachio Cake (8-10 Pax)',
    category: 'Cakes',
    price_bhd: 14.000,
    price_sar: 140.00,
    price_aed: 140.00,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    description_ar: 'كيكة الفستق الإسفنجية الهشة الشهيرة المليئة بطبقات كريمة الفستق الحلبي الغنية الفاخرة.',
    description_en: 'Our award-winning moist pistachio sponge layered with rich pistachio cream.',
    keywords: ['فستق', 'كيكة فستق', 'كيكة الفستق', 'كيك الفستق', 'pistachio', 'pistachio cake', 'famous pistachio']
  },
  {
    id: 'cb_prod_saffron_milk_cake',
    name_ar: 'كيكة الحليب بالزعفران (Saffron Milk Cake)',
    name_en: 'Saffron Milk Cake',
    category: 'Cakes',
    price_bhd: 4.500,
    price_sar: 45.00,
    price_aed: 45.00,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600&auto=format&fit=crop&q=80',
    description_ar: 'كيكة إسفنجية ناعمة مشبعة بصوص حليب الزعفران الفاخر الغني مع خيوط الزعفران الأصيل.',
    description_en: 'Soft sponge soaked in rich saffron milk sauce and infused with royal saffron.',
    keywords: ['زعفران', 'كيكة زعفران', 'كيكة الحليب', 'حليب بالزعفران', 'saffron', 'milk cake', 'saffron cake']
  },
  {
    id: 'cb_prod_mini_cupcakes_box',
    name_ar: 'بوكس مشكل ميني كب كيك (12 قطعة)',
    name_en: 'Assorted Mini Cupcakes Box (12 pcs)',
    category: 'Cupcakes',
    price_bhd: 7.500,
    price_sar: 75.00,
    price_aed: 75.00,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600&auto=format&fit=crop&q=80',
    description_ar: 'تشكيلة من أشهر نكهات كب كيك بوتيك: ريد فيلفيت، فستق، نوتيلا، وفانيلا بلجيكية (12 قطعة).',
    description_en: 'Assortment of Red Velvet, Pistachio, Nutella, and Vanilla cupcakes (12 pcs).',
    keywords: ['مشكل', 'ميني كب كيك', 'بوكس كب كيك', 'assorted', 'mini cupcakes', 'cupcakes box', 'كب كيك']
  },
  {
    id: 'cb_prod_red_velvet_cupcakes',
    name_ar: 'بوكس ريد فيلفيت كب كيك (6 قطع)',
    name_en: 'Red Velvet Cupcakes Box (6 pcs)',
    category: 'Cupcakes',
    price_bhd: 6.000,
    price_sar: 60.00,
    price_aed: 60.00,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&auto=format&fit=crop&q=80',
    description_ar: 'كب كيك ريد فيلفيت كلاسيكي هش مع فروستينج جبنة كريمية غنية وفاخرة (6 قطع).',
    description_en: 'Classic moist red velvet cupcakes topped with our signature cream cheese frosting (6 pcs).',
    keywords: ['ريد فيلفيت', 'ريدفيلفيت', 'red velvet', 'red velvet cupcakes']
  },
  {
    id: 'cb_prod_san_sebastian',
    name_ar: 'سان سيباستيان تشيز كيك (San Sebastian Cheesecake)',
    name_en: 'San Sebastian Basque Cheesecake with Warm Chocolate',
    category: 'Cheesecakes',
    price_bhd: 14.500,
    price_sar: 145.00,
    price_aed: 145.00,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    description_ar: 'تشيز كيك سان سيباستيان الباسكية الأصلية بقوام كريمي غني تقدم مع صوص شوكولاتة بلجيكية دافئة.',
    description_en: 'Creamy crustless Basque burnt cheesecake served with warm Belgian chocolate sauce.',
    keywords: ['سان سيباستيان', 'تشيز كيك', 'سان سباستيان', 'san sebastian', 'cheesecake']
  },
  {
    id: 'cb_prod_custom_celebration_cake',
    name_ar: 'كيكة مناسبات خاصة واحتفالات (Custom Celebration Cake)',
    name_en: 'Custom Celebration Cake (10-12 Pax)',
    category: 'Cakes',
    price_bhd: 18.000,
    price_sar: 180.00,
    price_aed: 180.00,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80',
    description_ar: 'كيكة احتفالات وتخرج وميلاد مصممة خصيصاً مع إهداء لوح الشوكولاتة المكتوب (تتطلب حجز مسبق 24 ساعة).',
    description_en: 'Custom designed celebration cake with personalized chocolate plaque inscription. Requires 24h advance notice.',
    keywords: ['مناسبات', 'كيكة مناسبات', 'كيكة تخرج', 'كيكة ميلاد', 'celebration', 'custom cake', 'birthday cake']
  }
];
