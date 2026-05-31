import { Request, Response } from "express";
import db from "../config/db";
import {
    hashPassword,
    comparePassword,
    generateToken,
    generateVerificationCode,
} from "../services/auth.service";
import { sendVerificationCode } from "../services/email.service";

// Códigos temporales en memoria
const verificationCodes = new Map<string, string>();

// POST /api/auth/register  ←  lo llama Registro-Usuario.tsx
export const register = async (req: Request, res: Response) => {
    try {
        const { nombre, email, password } = req.body;

        // Verificar si el correo ya existe
        const existe = await db.query(
            `SELECT idusuario FROM usuario WHERE email = $1`,
            [email]
        );
        if (existe.rowCount && existe.rowCount > 0) {
            return res.status(400).json({ success: false, message: "El correo ya está registrado." });
        }

        // Hashear contraseña y guardar usuario
        const hash = await hashPassword(password);
        const result = await db.query(
            `INSERT INTO usuario (nombre, email, "contraseñahash", puntos)
             VALUES ($1, $2, $3, 0)
             RETURNING idusuario`,
            [nombre, email, hash]
        );

        // Generar código de verificación
        const codigo = generateVerificationCode();
        verificationCodes.set(email, codigo);

        await sendVerificationCode(email, codigo);

        return res.status(201).json({
        success: true,
        message: "Usuario creado correctamente. Revisa tu correo para verificar tu cuenta.",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
};

// POST /api/auth/verify-email  ←  lo llama Registro-Usuario.tsx (paso 2)
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, codigo } = req.body;

        const codigoEsperado = verificationCodes.get(email);
        if (!codigoEsperado || codigoEsperado !== codigo) {
            return res.status(400).json({ success: false, message: "Código incorrecto." });
        }

        // Obtener el usuario y generar token
        const result = await db.query(
            `SELECT idusuario, nombre, email FROM usuario WHERE email = $1`,
            [email]
        );
        const user = result.rows[0];
        verificationCodes.delete(email);

        const token = generateToken(user.idusuario);

        return res.status(200).json({
            success: true,
            data: { token, user: { id: user.idusuario, nombre: user.nombre, email: user.email } }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
};

// POST /api/auth/login  ←  lo llama inicio-sesion.tsx
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const result = await db.query(
            `SELECT idusuario, nombre, email, "contraseñahash" FROM usuario WHERE email = $1`,
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas." });
        }

        const user = result.rows[0];
        const passwordValida = await comparePassword(password, user.contraseñahash);
        if (!passwordValida) {
            return res.status(401).json({ success: false, message: "Credenciales incorrectas." });
        }

        const token = generateToken(user.idusuario);

        return res.status(200).json({
            success: true,
            data: { token, user: { id: user.idusuario, nombre: user.nombre, email: user.email } }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
};
