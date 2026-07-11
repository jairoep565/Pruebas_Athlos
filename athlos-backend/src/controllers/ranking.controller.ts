import { Request, Response } from 'express';
import { getMiRango, getRankingGlobal, buscarPosicionPorNombre } from '../models/Rango.model';

export const getMiRanking = async (req: Request, res: Response) => {
  try {
    const progreso = await getMiRango(req.user.id);
    if (!progreso) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    return res.status(200).json({ success: true, data: progreso });
  } catch (error) {
    console.error('Error obteniendo rango:', error);
    return res.status(500).json({ success: false, message: 'No se pudo obtener el rango.' });
  }
};

export const getTablaGeneral = async (req: Request, res: Response) => {
  try {
    const { top, miPosicion } = await getRankingGlobal(10, req.user.id); // ← 10 en vez de 20
    return res.status(200).json({ success: true, data: { top, miPosicion } });
  } catch (error) {
    console.error('Error obteniendo ranking:', error);
    return res.status(500).json({ success: false, message: 'No se pudo obtener el ranking.' });
  }
};

export const buscarEnRanking = async (req: Request, res: Response) => {
  try {
    const nombre = String(req.query.nombre || '').trim();
    if (!nombre) {
      return res.status(400).json({ success: false, message: 'Debes indicar un nombre para buscar.' });
    }
    if (nombre.length < 2) {
      return res.status(400).json({ success: false, message: 'Escribe al menos 2 caracteres.' });
    }

    const resultados = await buscarPosicionPorNombre(nombre);
    return res.status(200).json({ success: true, data: { resultados } });
  } catch (error) {
    console.error('Error buscando en ranking:', error);
    return res.status(500).json({ success: false, message: 'No se pudo realizar la búsqueda.' });
  }
};

