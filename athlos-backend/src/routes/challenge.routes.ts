import { Router } from 'express';
import { completeChallengeById, getChallenges, swapChallengeById } from '../controllers/challenge.controller';

const router = Router();
router.get('/', getChallenges);
router.patch('/:id/complete', completeChallengeById);
router.patch('/:id/swap', swapChallengeById);
export default router;