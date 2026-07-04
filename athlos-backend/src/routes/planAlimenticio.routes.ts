import { Router } from 'express';
import {
  deletePlanAlimenticio,
  generatePlanAlimenticioHandler,
  getPlanAlimenticio,
} from '../controllers/planAlimenticio.controller';

const router = Router();
router.get('/', getPlanAlimenticio);
router.post('/generate', generatePlanAlimenticioHandler);
router.delete('/', deletePlanAlimenticio);
export default router;
