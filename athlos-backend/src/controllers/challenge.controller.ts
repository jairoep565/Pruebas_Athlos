import { Request, Response } from 'express';
import {
  completeChallenge,
  getChallengesByUserId,
  getSwapsRestantes,
  getUserPoints,
  swapChallenge,
} from '../services/challenge.service';


export const getChallenges = async (req: Request, res: Response) => {
  try {
    const challenges = await getChallengesByUserId(req.user.id);
    const puntosTotales = await getUserPoints(req.user.id);
    const cambiosRestantes = await getSwapsRestantes(req.user.id);

    return res.status(200).json({
      success: true,
      data: { challenges, puntosTotales, cambiosRestantes },
    });
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

    const resultado = await completeChallenge(challengeId, req.user.id);
    if (resultado === null) {
      return res.status(404).json({ success: false, message: 'Desafío no encontrado, vencido o ya completado.' });
    }

    const puntosTotales = await getUserPoints(req.user.id);
    const cambiosRestantes = await getSwapsRestantes(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        challenges: resultado.challenges,
        puntosTotales,
        cambiosRestantes,
        progresoRango: resultado.progresoRango,
      },
    });
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

    const cambios = await getSwapsRestantes(req.user.id);
    if (cambios === 0) {
      return res.status(429).json({ success: false, message: 'Ya usaste tus 3 cambios de hoy. Vuelve mañana.' });
    }

    const challenges = await swapChallenge(challengeId, req.user.id);
    if (challenges === null) {
      return res.status(404).json({ success: false, message: 'Desafío no encontrado, vencido o ya completado.' });
    }

    const puntosTotales = await getUserPoints(req.user.id);
    const cambiosRestantes = await getSwapsRestantes(req.user.id);

    return res.status(200).json({
      success: true,
      data: { challenges, puntosTotales, cambiosRestantes },
    });
  } catch (error) {
    console.error('Error cambiando desafío:', error);
    return res.status(500).json({ success: false, message: 'No se pudo cambiar el desafío.' });
  }
};