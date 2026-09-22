import { Router } from 'express';
import { store } from '../db/store.js';

export const merchantRouter = Router();

merchantRouter.get('/settings', (req, res) => {
  const settings = store.getMerchantSettings();
  return res.json({ success: true, settings });
});

merchantRouter.post('/settings', (req, res) => {
  const updated = store.updateMerchantSettings(req.body);
  return res.json({ success: true, settings: updated });
});

export const conversationsRouter = Router();

conversationsRouter.get('/', (req, res) => {
  const conversations = store.getConversations();
  return res.json({ success: true, conversations });
});
