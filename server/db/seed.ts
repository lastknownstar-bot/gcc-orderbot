import { Product } from './types.js';

export const initialProducts: Product[] = [
  {
    id: 'prod_karak',
    name_ar: 'بوكس شاي كرك فاخر (12 كوب)',
    name_en: 'Luxury Karak Chai Box (12 Cups)',
    category: 'Beverages',
    price_bhd: 1.800,
    price_sar: 18.00,
    price_aed: 18.00,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
    description_ar: 'شاي كرك أصيل مع الهيل والزعفران والحليب المبخر الفاخر مع أكواب حرارية.',
    description_en: 'Authentic Gulf Karak tea infused with cardamom, saffron, and evaporated milk. Includes insulated cups.',
    keywords: ['كرك', 'شاي كرك', 'karak', 'tea', 'chai']
  },
  {
    id: 'prod_saffron_latte',
    name_ar: 'سجنتشر لاتيه الزعفران والهيل',
    name_en: 'Signature Saffron Cardamom Latte',
    category: 'Beverages',
    price_bhd: 2.200,
    price_sar: 22.00,
    price_aed: 22.00,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    description_ar: 'إسبريسو غني مع خيوط الزعفران الإيراني الفاخر ونكهة الهيل الملكي.',
    description_en: 'Rich espresso blended with pure saffron threads and royal cardamom foam.',
    keywords: ['لاتيه', 'زعفران', 'saffron', 'latte', 'قهوة']
  },
  {
    id: 'prod_kunafa_bites',
    name_ar: 'بوكس ميني كنافة جبن وقشطة (16 حبة)',
    name_en: 'Mini Kunafa Bites Box (16 Pcs)',
    category: 'Sweets',
    price_bhd: 4.500,
    price_sar: 45.00,
    price_aed: 45.00,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80',
    description_ar: 'حبات كنافة مقرمشة محشوة بجبنة نابلسية وقشطة طازجة مع سيرب الشيرة بالفستق الحلبي.',
    description_en: 'Crispy golden kunafa bites stuffed with premium cheese and fresh cream, served with pistachio syrup.',
    keywords: ['كنافة', 'كنافه', 'kunafa', 'knafeh', 'حلويات', 'sweets']
  },
  {
    id: 'prod_maamoul_box',
    name_ar: 'درزن معمول تمر ملكي بالهيل',
    name_en: 'Royal Date Ma\'amoul Box (12 Pcs)',
    category: 'Sweets',
    price_bhd: 3.800,
    price_sar: 38.00,
    price_aed: 38.00,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80',
    description_ar: 'معمول فاخر بعجينة السميد والزبدة محشو بأجود أنواع تمر الإخلاص السعودي مع الهيل.',
    description_en: 'Buttery semolina cookies filled with premium Saudi Ikhlas dates and freshly ground cardamom.',
    keywords: ['معمول', 'معمول تمر', 'maamoul', 'dates', 'درزن معمول']
  },
  {
    id: 'prod_baklava',
    name_ar: 'صحن بقلاوة بالفستق الملكي (نصف كيلو)',
    name_en: 'Royal Pistachio Baklava Plate (500g)',
    category: 'Sweets',
    price_bhd: 5.500,
    price_sar: 55.00,
    price_aed: 55.00,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80',
    description_ar: 'رقائق بقلاوة ذهبية هشة محشوة بطبقات سخية من الفستق العنتابي الأخضر.',
    description_en: 'Layers of crispy phyllo dough richly layered with premium Antep pistachios and light syrup.',
    keywords: ['بقلاوة', 'بقلاوه', 'فستق', 'baklava', 'pistachio']
  },
  {
    id: 'prod_gahwa_beans',
    name_ar: 'قهوة سعودية وخليجية شقراء متبلة (500 جم)',
    name_en: 'Signature Saudi/Gulf Blonde Gahwa (500g)',
    category: 'Coffee',
    price_bhd: 4.200,
    price_sar: 42.00,
    price_aed: 42.00,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80',
    description_ar: 'خلطة القهوة السعودية الشقراء المحمصة بعناية مع الهيل الفاخر والزعفران والقرنفل.',
    description_en: 'Carefully roasted light blonde Arabica coffee blend seasoned with luxury cardamom, saffron, and cloves.',
    keywords: ['قهوة', 'قهوة شقراء', 'قهوه', 'قهوة سعودية', 'gahwa', 'arabic coffee', 'saudi coffee']
  }
];
