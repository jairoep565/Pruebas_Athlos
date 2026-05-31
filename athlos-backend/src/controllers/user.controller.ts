import { Request, Response } from "express";
import db from "../config/db";

// GET /api/user/profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const result = await db.query(
            `SELECT idusuario, nombre, email, peso, talla, edad, puntos, identorno
             FROM usuario WHERE idusuario = $1`,
            [req.user.id]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado." });

        return res.status(200).json({ 
        success: true, 
        data: result.rows[0] });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ 
        success: false, 
        message: (error as any).message || "Error interno del servidor." });
    }
};

// PUT /api/user/profile  
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { nombre, email, peso, talla, edad } = req.body;

        let result;
        if (nombre && email) {
            result = await db.query(
                `UPDATE usuario SET nombre = $1, email = $2, peso = $3, talla = $4, edad = $5
                 WHERE idusuario = $6
                 RETURNING idusuario, nombre, email, peso, talla, edad, puntos, identorno`,
                [nombre, email, peso, talla, edad, req.user.id]
            );
        } else {
            result = await db.query(
                `UPDATE usuario SET peso = $1, talla = $2, edad = $3
                 WHERE idusuario = $4
                 RETURNING idusuario, nombre, email, peso, talla, edad, puntos, identorno`,
                [peso, talla, edad, req.user.id]
            );
        }

        if (result.rowCount === 0)
            return res.status(404).json({ 
            success: false, 
            message: "Usuario no encontrado." });

        return res.status(200).json({ 
            success: true, 
            data: result.rows[0] });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: (error as any).message || "Error interno del servidor." });
    }
};

// PUT /api/user/environment  
export const updateEnvironment = async (req: Request, res: Response) => {
    try {
        const { identorno } = req.body;

        const result = await db.query(
            `UPDATE usuario SET identorno = $1
             WHERE idusuario = $2
             RETURNING idusuario, nombre, email, peso, talla, edad, puntos, identorno`,
            [identorno, req.user.id]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado." });

        return res.status(200).json({ 
        success: true, 
        data: result.rows[0] });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ 
        success: false, 
        message: (error as any).message || "Error interno del servidor." });
    }
};
