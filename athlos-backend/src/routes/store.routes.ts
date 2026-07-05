import { Router } from 'express';
import { getCatalog, redeemReward, getRedeemedHistory } from '../controllers/store.controller';

const router = Router();
router.get('/catalog', getCatalog);
router.get('/history', getRedeemedHistory);
router.post('/redeem', redeemReward);
export default router;
