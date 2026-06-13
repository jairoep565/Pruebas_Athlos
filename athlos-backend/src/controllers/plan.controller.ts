import { Request, Response } from 'express';
import {
  deletePlansByUserId,
  GeminiQuotaError,
  generateTrainingPlan,
  getPlanByIdForUser,
  getPlansByUserId,
} from '../services/plan.service';

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await getPlansByUserId(req.user.id);
    return res.status(200).json({ success: true, data: { plans } });
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron obtener los planes.' });
  }
};

export const getPlan = async (req: Request, res: Response) => {
  try {
    const planId = Number(req.params.id);
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de plan inválido.' });
    }
    const plan = await getPlanByIdForUser(planId, req.user.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
    return res.status(200).json({ success: true, data: { plan } });
  } catch (error) {
    console.error('Error obteniendo plan:', error);
    return res.status(500).json({ success: false, message: 'No se pudo obtener el plan.' });
  }
};

export const deletePlans = async (req: Request, res: Response) => {
  try {
    const rawPlanIds = req.body?.planIds;
    if (!Array.isArray(rawPlanIds)) {
      return res.status(400).json({ success: false, message: 'Debes seleccionar al menos un plan.' });
    }

    const planIds = [...new Set(rawPlanIds.map(Number))];
    if (
      planIds.length === 0 ||
      planIds.length > 50 ||
      planIds.some((planId) => !Number.isInteger(planId) || planId <= 0)
    ) {
      return res.status(400).json({ success: false, message: 'La selección de planes no es válida.' });
    }

    const deletedPlanIds = await deletePlansByUserId(planIds, req.user.id);
    return res.status(200).json({ success: true, data: { deletedPlanIds } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Uno de los planes no existe o no te pertenece.' });
    }
    console.error('Error eliminando planes:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron eliminar los planes.' });
  }
};

export const generatePlan = async (req: Request, res: Response) => {
  try {
    // req.user.id viene del authMiddleware (JWT payload: { id: number })
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado. Token JWT requerido.',
      });
    }

    console.log(`[Plan Controller] userId extraido del JWT: ${userId}`);

    // Genera el plan con IA (RAG) y lo persiste en la BD transaccionalmente
    const savedPlan = await generateTrainingPlan(String(userId));

    // Devuelve el plan con los IDs generados por la BD (idplan, idrutina)
    return res.status(201).json({ success: true, data: { plan: savedPlan } });
  } catch (error) {
    console.error("--- ERROR CRÍTICO EN GENERATE PLAN ---");
    console.error(error); // Esto expondrá la línea exacta en la consola del backend
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
      message: 'No se pudo generar el plan. Intenta nuevamente más tarde.'
    });
  }
};
