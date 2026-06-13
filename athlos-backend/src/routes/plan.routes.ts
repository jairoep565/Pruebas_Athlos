import { Router } from 'express';
import { deletePlans, generatePlan, getPlan, getPlans } from '../controllers/plan.controller';

const router = Router();
router.get('/', getPlans);
router.delete('/', deletePlans);
router.get('/:id', getPlan);
router.post('/generate', generatePlan);
export default router;
