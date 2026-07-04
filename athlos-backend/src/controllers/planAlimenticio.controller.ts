import { Request, Response } from 'express';
import {
  deletePlanAlimenticioByUserId,
  generatePlanAlimenticio,
  getPlanAlimenticioByUserId,
} from '../services/planAlimenticio.service';
import { GeminiQuotaError } from '../services/plan.service';

export const getPlanAlimenticio = async (req: Request, res: Response) => {
  try {
    const plan = await getPlanAlimenticioByUserId(req.user.id);
    return res.status(200).json({ success: true, data: { plan } });
  } catch (error) {
    console.error('Error obteniendo plan alimenticio:', error);
    return res.status(500).json({ success: false, message: 'No se pudo obtener el plan alimenticio.' });
  }
};

export const generatePlanAlimenticioHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado. Token JWT requerido.',
      });
    }

    console.log(`[PlanAlimenticio Controller] userId extraído del JWT: ${userId}`);

    const savedPlan = await generatePlanAlimenticio(String(userId));

    return res.status(201).json({ success: true, data: { plan: savedPlan } });
  } catch (error) {
    console.error('--- ERROR CRÍTICO EN GENERATE PLAN ALIMENTICIO ---');
    console.error(error);
    if (error instanceof GeminiQuotaError) {
      return res.status(429).json({
        success: false,
        code: 'GEMINI_QUOTA_EXCEEDED',
        message: 'Gemini alcanzó su límite gratuito. Podrás intentarlo nuevamente en unos momentos.',
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'No se pudo generar el plan alimenticio. Intenta nuevamente más tarde.',
    });
  }
};

export const deletePlanAlimenticio = async (req: Request, res: Response) => {
  try {
    const deleted = await deletePlanAlimenticioByUserId(req.user.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'No tienes un plan alimenticio para eliminar.' });
    }
    return res.status(200).json({ success: true, message: 'Plan alimenticio eliminado correctamente.' });
  } catch (error) {
    console.error('Error eliminando plan alimenticio:', error);
    return res.status(500).json({ success: false, message: 'No se pudo eliminar el plan alimenticio.' });
  }
};
