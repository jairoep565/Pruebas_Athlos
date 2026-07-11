import { Router } from 'express';
import { getMiRanking, getTablaGeneral, buscarEnRanking } from '../controllers/ranking.controller';

const router = Router();
router.get('/me', getMiRanking);
router.get('/top', getTablaGeneral);
router.get('/buscar', buscarEnRanking);
export default router;