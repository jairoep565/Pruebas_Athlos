import { Request, Response } from 'express';
import db from '../config/db';
import { sendRewardCode } from '../services/email.service';
import crypto from 'crypto';

export const getCatalog = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await db.query('SELECT * FROM recompensa WHERE activo = TRUE ORDER BY costopuntos ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching catalog:', error);
        res.status(500).json({ error: 'Error al obtener el catálogo de recompensas.' });
    }
};

export const redeemReward = async (req: Request, res: Response): Promise<void> => {
    const { idrecompensa } = req.body;
    const idusuario = (req as any).user?.id;
    
    if (!idusuario || !idrecompensa) {
        res.status(400).json({ error: 'Faltan datos requeridos (idusuario, idrecompensa).' });
        return;
    }

    try {
        await db.transaction(async (client) => {
            // Obtener usuario y recompensas
            const userRes = await client.query('SELECT puntos, email FROM usuario WHERE idusuario = $1 FOR UPDATE', [idusuario]);
            const rewardRes = await client.query('SELECT nombre, costopuntos, terminos, limite_canjes FROM recompensa WHERE idrecompensa = $1', [idrecompensa]);

            if (userRes.rows.length === 0) {
                res.status(404).json({ error: 'Usuario no encontrado.' });
                return;
            }
            if (rewardRes.rows.length === 0) {
                res.status(404).json({ error: 'Recompensa no encontrada.' });
                return;
            }

            const userPoints = parseInt(userRes.rows[0].puntos) || 0;
            const rewardCost = parseInt(rewardRes.rows[0].costopuntos);
            const userEmail = userRes.rows[0].email;
            const rewardName = rewardRes.rows[0].nombre;
            const rewardTerminos = rewardRes.rows[0].terminos || '';
            const limitCanjes = parseInt(rewardRes.rows[0].limite_canjes) || 1;

            // Validar límite de canjes
            const countRes = await client.query('SELECT COUNT(*) FROM usuariorecompensa WHERE idusuario = $1 AND idrecompensa = $2', [idusuario, idrecompensa]);
            const vecesCanjeado = parseInt(countRes.rows[0].count) || 0;

            if (vecesCanjeado >= limitCanjes) {
                res.status(400).json({ error: 'Has alcanzado el límite de canjes permitido para esta recompensa.' });
                return;
            }

            // Validar puntos (US16)
            if (userPoints < rewardCost) {
                res.status(400).json({ error: 'Puntos insuficientes para realizar este canje.' });
                return;
            }

            // Descontar puntos
            await client.query('UPDATE usuario SET puntos = puntos - $1 WHERE idusuario = $2', [rewardCost, idusuario]);

            // Generar código único y guardar registro
            const uniqueCode = crypto.randomBytes(4).toString('hex').toUpperCase();
            await client.query(
                'INSERT INTO usuariorecompensa (idusuario, idrecompensa, codigocanje) VALUES ($1, $2, $3)',
                [idusuario, idrecompensa, uniqueCode]
            );

            // Enviar email (no bloqueamos la transacción por el email, aunque está dentro aquí)
            try {
                await sendRewardCode(userEmail, rewardName, uniqueCode, rewardTerminos);
            } catch (emailError) {
                console.error('Error enviando el correo:', emailError);
            }

            res.status(200).json({ message: 'Canje exitoso, revisa tu correo.', code: uniqueCode });
        });
    } catch (error: any) {
        // Ignorar si la respuesta ya fue enviada
        if (!res.headersSent) {
            console.error('Error redeeming reward:', error);
            res.status(500).json({ error: 'Error al procesar el canje de recompensa.' });
        }
    }
};

export const getRedeemedHistory = async (req: Request, res: Response): Promise<void> => {
    const idusuario = (req as any).user?.id;
    if (!idusuario) {
        res.status(400).json({ error: 'Usuario no identificado.' });
        return;
    }
    try {
        const queryText = `
            SELECT ur.idusuariorecompensa, ur.codigocanje, ur.fecha, r.idrecompensa, r.nombre, r.descripcion, r.costopuntos, r.tipo, r.imagen_url, r.terminos
            FROM usuariorecompensa ur
            JOIN recompensa r ON ur.idrecompensa = r.idrecompensa
            WHERE ur.idusuario = $1
            ORDER BY ur.fecha DESC
        `;
        const result = await db.query(queryText, [idusuario]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching redeemed history:', error);
        res.status(500).json({ error: 'Error al obtener el historial de canjes.' });
    }
};
