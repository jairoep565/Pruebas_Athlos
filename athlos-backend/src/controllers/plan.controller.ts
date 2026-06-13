import { Request, Response } from 'express';
import { generateTrainingPlan, PlanProfile } from '../services/plan.service';

export const generatePlan = async (req: Request, res: Response) => {
  try {
    const profile = (req.body?.perfil || {}) as PlanProfile;
    const plan = await generateTrainingPlan(profile);
    return res.status(200).json({ success: true, data: { plan } });
  } catch (error) {
    console.error('Error generando plan:', error);
    const message = error instanceof Error && error.message.includes('GEMINI_API_KEY')
      ? 'La API key de Gemini no esta configurada en el servidor.'
      : 'No se pudo generar el plan con IA. Intenta nuevamente.';
    return res.status(500).json({ success: false, message });
  }
};
