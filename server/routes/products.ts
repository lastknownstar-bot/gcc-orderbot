import { Router } from 'express';
import { store } from '../db/store.js';

export const productsRouter = Router();

productsRouter.get('/', (req, res) => {
  const products = store.getProducts();
  return res.json({ success: true, products });
});

productsRouter.patch('/:id', (req, res) => {
  const { stock, price_bhd, price_sar, price_aed } = req.body;
  const updated = store.updateProduct(req.params.id, {
    ...(stock !== undefined && { stock: parseInt(stock, 10) }),
    ...(price_bhd !== undefined && { price_bhd: parseFloat(price_bhd) }),
    ...(price_sar !== undefined && { price_sar: parseFloat(price_sar) }),
    ...(price_aed !== undefined && { price_aed: parseFloat(price_aed) }),
  });

  if (!updated) return res.status(404).json({ error: 'Product not found' });
  return res.json({ success: true, product: updated });
});
