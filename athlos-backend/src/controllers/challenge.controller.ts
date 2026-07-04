import { Request, Response } from 'express';
import {
  completeChallenge,
  getChallengesByUserId,
  getSwapsRestantes,
  getUserPoints,
  swapChallenge,
} from '../services/challenge.service';

const respuesta = async (userId: number, challenges: unknown) => ({
  success: true,
  data: {
    challenges,
    puntosTotales: await getUserPoints(userId),
    cambiosRestantes: await getSwapsRestantes(userId),
  },
});

export const getChallenges = async (req: Request, res: Response) => {
  try {
    const challenges = await getChallengesByUserId(req.user.id);
    return res.status(200).json(await respuesta(req.user.id, challenges));
  } catch (error) {
    console.error('Error obteniendo desafíos:', error);
    return res.status(500).json({ success: false, message: 'No se pudieron obtener los desafíos.' });
  }
};

export const completeChallengeById = async (req: Request, res: Response) => {
  try {
    const challengeId = Number(req.params.id);
    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de desafío inválido.' });
    }
    const challenges = await completeChallenge(challengeId, req.user.id);
    if (!challenges) {
      return res.status(404).json({ success: false, message: 'Desafío no encontrado, vencido o ya completado.' });
    }
    return res.status(200).json(await respuesta(req.user.id, challenges));
  } catch (error) {
    console.error('Error completando desafío:', error);
    return res.status(500).json({ success: false, message: 'No se pudo completar el desafío.' });
  }
};

export const swapChallengeById = async (req: Request, res: Response) => {
  try {
    const challengeId = Number(req.params.id);
    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de desafío inválido.' });
    }
    const resultado = await swapChallenge(challengeId, req.user.id);
    if (resultado === 'LIMIT') {
      return res.status(429).json({ success: false, message: 'Ya usaste tus 3 cambios de hoy. Vuelve mañana.' });
    }
    if (!resultado) {
      return res.status(404).json({ success: false, message: 'Desafío no encontrado, vencido o ya completado.' });
    }
    return res.status(200).json(await respuesta(req.user.id, resultado));
  } catch (error) {
    console.error('Error cambiando desafío:', error);
    return res.status(500).json({ success: false, message: 'No se pudo cambiar el desafío.' });
  }
};