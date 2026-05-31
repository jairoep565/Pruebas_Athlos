import db from '../config/db';

export interface IExercise{
    idejercicio: number;
    nombre : string;
    descripcion: string;
}

export interface IRutinaEjercicio extends IExercise{
    idejercicio : number;
    series : number;
    repeticiones : number;
}

export interface IRutina extends IRutinaEjercicio{
    idplan : number;
    nombre : string;
    duracion : number;
    estado : number;
}

export const getAllExercise = async (): Promise<IExercise[]> => {
    const result = await db.query(`SELECT * FROM ejercicio`);
    return result.rows;
}

export const getRutinaById = async (id: number): Promise<IExercise> => {
    const result = await db.query(`SELECT 
                                    e.nombre      AS nombre, 
                                    a.series,
                                    a.repeticiones,
                                    r.duracion,
                                    r.nombre      AS rutina
                                FROM rutina r
                                JOIN rutinaejercicio a ON r.idrutina = a.idrutina
                                JOIN ejercicio e      ON a.idejercicio = e.idejercicio
                                WHERE r.idplan = $1;`, [id])
    return result.rows[0] || null;
}

    