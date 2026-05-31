import { Request, Response } from 'express';
import {getAllExercise, getRutinaById} from '../models/Exercise.model';

export const getAll = async(_req: Request, res: Response): Promise<void> => {
    try{
        const getAll = await getAllExercise();
        res.status(200).json({
            success: true,
            data: getAll
        })
    }
    catch(error){
        console.error('Error en getAll',error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        })
    }
}

export const getRutina = async(req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    
    try{
        const rutina = await getRutinaById(id);
        if(!rutina){
            res.status(404).json({
                success: false,
                message: 'Rutina no encontrada'
            })
            return;
        }
        res.status(200).json({
            success: true,
            data: rutina
        })
    }
    catch(error){
        console.error('Error en getRutina',error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}