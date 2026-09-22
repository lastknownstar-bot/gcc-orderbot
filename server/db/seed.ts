import { Product } from './types.js';

export const initialProducts: Product[] = [
  {
    id: 'prod_gathering_pastry',
    name_ar: 'بوكس معجنات ميني للجمعات والزوارة (24 حبة)',
    name_en: 'Mini Pastry Gathering Box (24 Pcs)',
    category: 'Pastries',
    price_bhd: 6.500,
    price_sar: 65.00,
    price_aed: 65.00,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    description_ar: 'تشكيلة معجنات فرنسية وخليجية ميني فاخرة مثالية للزوارة وجمعات العائلة والضيوف.',
    description_en: 'Assortment of luxury French & Gulf mini savories, perfect for family gatherings, parties, and visits.',
    keywords: ['معجنات', 'بوكس معجنات', 'pastry', 'pastries', 'gathering', 'gathering box', 'زواره', 'زوارة', 'جمعة', 'جمعات', 'حفلة']
  },
  {
    id: 'prod_karak_box',
    name_ar: 'بوكس كرك ميزون الفاخر (Signature Karak Box)',
    name_en: 'Signature Karak Box (12 Cups)',
    category: 'Beverages',
    price_bhd: 2.200,
    price_sar: 22.00,
    price_aed: 22.00,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
    description_ar: 'شاي كرك ميزون دو سوكر الأصيل مع الزعفران والهيل والحليب المبخر الفاخر مع أكواب حرارية.',
    description_en: 'Authentic Maison de Sucre Karak tea infused with saffron, cardamom, and luxury evaporated milk.',
    keywords: ['كرك', 'شاي كرك', 'karak', 'signature karak', 'karak box', 'بوكس كرك', 'tea', 'chai']
  },
  {
    id: 'prod_royal_cake',
    name_ar: 'كيكة الشوكولاتة الملكية الفاخرة (Maison Royal Chocolate Cake)',
    name_en: 'Maison Royal Chocolate Truffle Cake (8-10 Pax)',
    category: 'Cakes',
    price_bhd: 12.500,
    price_sar: 125.00,
    price_aed: 125.00,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    description_ar: 'كيكة الشوكولاتة البلجيكية الداكنة الفاخرة مع طبقات الجناش مع إمكانية كتابة إهداء خاص على لوح الشوكولاتة.',
    description_en: 'Rich Belgian dark chocolate ganache cake. Includes complimentary custom written message on chocolate plaque.',
    keywords: ['كيك', 'كيكة', 'كيكه', 'cake', 'chocolate cake', 'شوكولاتة', 'كيك شوكولاته', 'تورته']
  },
  {
    id: 'prod_san_sebastian',
    name_ar: 'كيكة سان سباستيان الأصلية مع صوص الشوكولاتة البلجيكية',
    name_en: 'San Sebastian Basque Cheesecake with Belgian Chocolate',
    category: 'Cakes',
    price_bhd: 11.000,
    price_sar: 110.00,
    price_aed: 110.00,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    description_ar: 'تشيز كيك سان سباستيان الكلاسيكية بقوام كريمي غني وصوص شوكولاتة بلجيكية حارة.',
    description_en: 'Classic burnt Basque cheesecake with creamy interior and warm Belgian chocolate pour.',
    keywords: ['تشيز كيك', 'سان سباستيان', 'cheesecake', 'san sebastian', 'كيك الجبن']
  },
  {
    id: 'prod_kunafa_bites',
    name_ar: 'بوكس ميني كنافة جبن وقشطة ميزون (16 حبة)',
    name_en: 'Mini Kunafa Bites Box (16 Pcs)',
    category: 'Sweets',
    price_bhd: 4.500,
    price_sar: 45.00,
    price_aed: 45.00,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop&q=80',
    description_ar: 'حبات كنافة ذهبية مقرمشة محشوة بجبنة عكاوية وقشطة طازجة مع شيرة الفستق الحلبي.',
    description_en: 'Crispy golden kunafa bites stuffed with premium cheese and fresh cream, served with pistachio syrup.',
    keywords: ['كنافة', 'كنافه', 'kunafa', 'knafeh', 'حلويات', 'sweets']
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
  }
];
