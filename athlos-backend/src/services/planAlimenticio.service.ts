import db from '../config/db';
import { getUserProfileById, UserProfile } from '../models/Chat.model';
import { GeminiQuotaError } from './plan.service';

// ══════════════════════════════════════════════════════════════════════
//  Interfaces: Respuesta de Gemini (lo que la IA devuelve)
// ══════════════════════════════════════════════════════════════════════

export interface ComidaPlan {
  tipo: string;
  nombre: string;
  ingredientes: string[];
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface DiaPlan {
  dia: string;
  comidas: ComidaPlan[];
}

export interface ResumenMacros {
  caloriasDiarias: number;
  proteinasGramos: number;
  carbohidratosGramos: number;
  grasasGramos: number;
}

export interface PlanAlimenticioContent {
  resumen: ResumenMacros;
  dias: DiaPlan[];
}

export interface PlanAlimenticioStored {
  idplanalimenticio: number;
  idusuario: number;
  contenido: PlanAlimenticioContent;
  fechageneracion: string;
}

// ══════════════════════════════════════════════════════════════════════
//  Consultas a la BD
// ══════════════════════════════════════════════════════════════════════

export const getPlanAlimenticioByUserId = async (
  userId: number
): Promise<PlanAlimenticioStored | null> => {
  const result = await db.query(
    `SELECT idplanalimenticio, idusuario, contenido, fechageneracion
     FROM planalimenticio
     WHERE idusuario = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    idplanalimenticio: row.idplanalimenticio,
    idusuario: row.idusuario,
    contenido: typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido,
    fechageneracion: row.fechageneracion,
  };
};

export const deletePlanAlimenticioByUserId = async (
  userId: number
): Promise<boolean> => {
  const result = await db.query(
    `DELETE FROM planalimenticio WHERE idusuario = $1`,
    [userId]
  );
  return (result.rowCount ?? 0) > 0;
};

// ══════════════════════════════════════════════════════════════════════
//  Schema de Gemini para plan alimenticio
// ══════════════════════════════════════════════════════════════════════

const GEMINI_MODEL_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const planAlimenticioSchema = {
  type: 'OBJECT',
  required: ['resumen', 'dias'],
  properties: {
    resumen: {
      type: 'OBJECT',
      required: ['caloriasDiarias', 'proteinasGramos', 'carbohidratosGramos', 'grasasGramos'],
      properties: {
        caloriasDiarias: { type: 'INTEGER' },
        proteinasGramos: { type: 'INTEGER' },
        carbohidratosGramos: { type: 'INTEGER' },
        grasasGramos: { type: 'INTEGER' },
      },
    },
    dias: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['dia', 'comidas'],
        properties: {
          dia: { type: 'STRING' },
          comidas: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['tipo', 'nombre', 'ingredientes', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
              properties: {
                tipo: { type: 'STRING' },
                nombre: { type: 'STRING' },
                ingredientes: { type: 'ARRAY', items: { type: 'STRING' } },
                calorias: { type: 'INTEGER' },
                proteinas: { type: 'INTEGER' },
                carbohidratos: { type: 'INTEGER' },
                grasas: { type: 'INTEGER' },
              },
            },
          },
        },
      },
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
//  Sanitizador de respuesta de Gemini
// ══════════════════════════════════════════════════════════════════════

const parseGeminiResponse = (rawText: string): unknown => {
  try {
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('[Gemini Alimentación] Respuesta cruda que causó el error:', rawText);
    throw new Error('El JSON devuelto por la IA está corrupto o incompleto. Intenta nuevamente.');
  }
};

// ══════════════════════════════════════════════════════════════════════
//  Helpers de validación
// ══════════════════════════════════════════════════════════════════════

const toNumber = (value: unknown, min: number, max: number, fieldName: string): number => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Gemini devolvió un valor numérico inválido para "${fieldName}": ${value} (debe estar entre ${min} y ${max})`);
  }
  return Math.round(number);
};

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Gemini no devolvió ${field}`);
  }
  return value.trim();
};

const validatePlanAlimenticio = (value: unknown): PlanAlimenticioContent => {
  if (!value || typeof value !== 'object') throw new Error('Gemini no devolvió un plan alimenticio válido');
  const plan = value as Record<string, any>;

  // Validar resumen
  const resumenRaw = plan.resumen;
  if (!resumenRaw || typeof resumenRaw !== 'object') throw new Error('Gemini no devolvió el resumen de macronutrientes');

  const resumen: ResumenMacros = {
    caloriasDiarias: toNumber(resumenRaw.caloriasDiarias, 800, 5000, 'caloriasDiarias'),
    proteinasGramos: toNumber(resumenRaw.proteinasGramos, 20, 400, 'proteinasGramos'),
    carbohidratosGramos: toNumber(resumenRaw.carbohidratosGramos, 50, 800, 'carbohidratosGramos'),
    grasasGramos: toNumber(resumenRaw.grasasGramos, 15, 250, 'grasasGramos'),
  };

  // Validar días
  const diasRaw = plan.dias;
  if (!Array.isArray(diasRaw) || diasRaw.length < 7) {
    throw new Error('Gemini no devolvió los 7 días de la semana');
  }

  const dias: DiaPlan[] = diasRaw.slice(0, 7).map((diaRaw: any, dIdx: number) => {
    if (!diaRaw || typeof diaRaw !== 'object') {
      throw new Error(`Gemini devolvió un día inválido en posición ${dIdx + 1}`);
    }

    const dia = text(diaRaw.dia, `nombre del día ${dIdx + 1}`);
    const comidasRaw = diaRaw.comidas;

    if (!Array.isArray(comidasRaw) || comidasRaw.length < 3) {
      throw new Error(`El día "${dia}" tiene menos de 3 comidas`);
    }

    const comidas: ComidaPlan[] = comidasRaw.map((comidaRaw: any, cIdx: number) => {
      if (!comidaRaw || typeof comidaRaw !== 'object') {
        throw new Error(`Gemini devolvió una comida inválida en el día "${dia}"`);
      }

      const ingredientes = Array.isArray(comidaRaw.ingredientes)
        ? comidaRaw.ingredientes.filter((i: unknown) => typeof i === 'string' && i.trim()).map((i: string) => i.trim())
        : [];

      return {
        tipo: text(comidaRaw.tipo, `tipo de comida ${cIdx + 1} del ${dia}`),
        nombre: text(comidaRaw.nombre, `nombre de comida ${cIdx + 1} del ${dia}`),
        ingredientes,
        calorias: toNumber(comidaRaw.calorias, 0, 2000, `calorías de comida ${cIdx + 1} del ${dia}`),
        proteinas: toNumber(comidaRaw.proteinas, 0, 200, `proteínas de comida ${cIdx + 1} del ${dia}`),
        carbohidratos: toNumber(comidaRaw.carbohidratos, 0, 400, `carbohidratos de comida ${cIdx + 1} del ${dia}`),
        grasas: toNumber(comidaRaw.grasas, 0, 150, `grasas de comida ${cIdx + 1} del ${dia}`),
      };
    });

    return { dia, comidas };
  });

  return { resumen, dias };
};

// ══════════════════════════════════════════════════════════════════════
//  Prompt para Gemini
// ══════════════════════════════════════════════════════════════════════

const buildAlimentacionPrompt = (user: UserProfile): string => {
  return `Eres un nutricionista deportivo experto. Tu tarea es crear un plan de alimentación semanal personalizado para un usuario con los siguientes datos:
- Nombre: ${user.nombre || 'No especificado'}
- Edad: ${user.edad || 'No especificada'} años
- Peso: ${user.peso || 'No especificado'} kg
- Talla/Estatura: ${user.talla || 'No especificada'} cm

INSTRUCCIONES:
1. Calcula la Tasa Metabólica Basal (TMB) usando la fórmula de Harris-Benedict basándote en el peso, talla y edad del usuario.
2. Estima las calorías diarias necesarias para una persona con actividad física moderada.
3. Distribuye los macronutrientes:
   - Proteínas: 1.6 a 2.0 gramos por kg de peso corporal
   - Grasas: 25-30% de las calorías totales
   - Carbohidratos: el resto de las calorías
4. Crea un plan de 7 días (Lunes a Domingo) con 4 comidas por día:
   - Desayuno
   - Almuerzo
   - Snack/Merienda
   - Cena
5. Cada comida debe incluir: tipo, nombre descriptivo, lista de ingredientes con cantidades, calorías, proteínas, carbohidratos y grasas.
6. Incluye un resumen con las calorías diarias objetivo y los gramos diarios de proteínas, carbohidratos y grasas.
7. Las comidas deben ser variadas, balanceadas, accesibles y realistas.
8. Escribe todo en español.
9. Los ingredientes deben incluir las cantidades (ej: "100g pechuga de pollo", "1 taza de arroz").
10. SÉ EXTRAORDINARIAMENTE CONCISO: Usa nombres de comida muy cortos (ej: "Pollo con arroz") y limita los ingredientes a un máximo de 3 o 4 por comida. Esto es crítico para evitar que el JSON de respuesta se corte por límite de longitud.

IMPORTANTE: Devuelve estrictamente el JSON sin texto adicional, sin saludos y sin bloques de código Markdown.`;
};

// ══════════════════════════════════════════════════════════════════════
//  Persistencia en PostgreSQL (UPSERT: relación 1:1)
// ══════════════════════════════════════════════════════════════════════

const savePlanAlimenticioToDatabase = async (
  userId: number,
  plan: PlanAlimenticioContent
): Promise<PlanAlimenticioStored> => {
  const contenidoJSON = JSON.stringify(plan);

  // UPSERT: si ya existe un plan para el usuario, lo reemplaza
  const result = await db.query(
    `INSERT INTO planalimenticio (idusuario, contenido, fechageneracion)
     VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (idusuario)
     DO UPDATE SET contenido = $2, fechageneracion = CURRENT_DATE
     RETURNING idplanalimenticio, idusuario, contenido, fechageneracion`,
    [userId, contenidoJSON]
  );

  const row = result.rows[0];
  return {
    idplanalimenticio: row.idplanalimenticio,
    idusuario: row.idusuario,
    contenido: plan,
    fechageneracion: row.fechageneracion,
  };
};

// ══════════════════════════════════════════════════════════════════════
//  Función principal: generatePlanAlimenticio (RAG + Persistencia)
// ══════════════════════════════════════════════════════════════════════

export const generatePlanAlimenticio = async (
  userId: string
): Promise<PlanAlimenticioStored> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'TU_API_KEY_AQUI') throw new Error('GEMINI_API_KEY no está configurada');

  // ── FASE 1: Retrieval — consultar perfil del usuario ──
  const user = await getUserProfileById(userId);

  console.log(`[RAG Alimentación] Usuario: ${user.nombre || userId} | Peso: ${user.peso}kg | Talla: ${user.talla}cm`);

  // ── FASE 2: Augmented — construir prompt con contexto ──
  const prompt = buildAlimentacionPrompt(user);

  // ── FASE 3: Generation — llamar a Gemini ──
  let responseText = '';
  try {
    const response = await fetch(`${GEMINI_MODEL_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: planAlimenticioSchema,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Gemini API Error - Alimentación] Status:', response.status, 'Body:', body);
      if (response.status === 429) {
        let retryAfterSeconds = 60;
        try {
          const parsed = JSON.parse(body) as {
            error?: { details?: Array<{ retryDelay?: string }> };
          };
          const retryDelay = parsed.error?.details?.find((detail) => detail.retryDelay)?.retryDelay;
          const seconds = Number.parseFloat(retryDelay || '');
          if (Number.isFinite(seconds) && seconds > 0) retryAfterSeconds = Math.ceil(seconds);
        } catch {
          const match = body.match(/retry in\s+([0-9.]+)s/i);
          if (match) retryAfterSeconds = Math.ceil(Number(match[1]));
        }
        throw new GeminiQuotaError(retryAfterSeconds);
      }
      throw new Error(`Gemini respondió ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) throw new Error('Gemini no devolvió contenido');
    console.log('[Gemini Alimentación] Texto crudo obtenido con éxito.');
  } catch (error) {
    console.error('--- ERROR DURANTE LA GENERACIÓN DE PLAN ALIMENTICIO CON GEMINI ---');
    console.error(error);
    throw error;
  }

  // ── Sanitizar y parsear respuesta ──
  let parsed: unknown;
  try {
    parsed = parseGeminiResponse(responseText);
  } catch (error) {
    console.error('--- ERROR PARSEANDO LA RESPUESTA DE GEMINI (ALIMENTACIÓN) ---');
    console.error('Texto crudo:', responseText);
    console.error(error);
    throw error;
  }

  // ── Validación post-generación ──
  let validatedPlan: PlanAlimenticioContent;
  try {
    validatedPlan = validatePlanAlimenticio(parsed);
    console.log(`[RAG Alimentación] Plan validado: ${validatedPlan.resumen.caloriasDiarias} kcal/día, ${validatedPlan.dias.length} días`);
  } catch (error) {
    console.error('--- ERROR DE VALIDACIÓN DEL PLAN ALIMENTICIO GENERADO ---');
    console.error('Objeto parseado:', JSON.stringify(parsed, null, 2));
    console.error(error);
    throw error;
  }

  // ── FASE 4: Persistencia (UPSERT) ──
  try {
    const savedPlan = await savePlanAlimenticioToDatabase(Number(userId), validatedPlan);
    return savedPlan;
  } catch (error) {
    console.error('--- ERROR PERSISTIENDO EL PLAN ALIMENTICIO EN LA BASE DE DATOS ---');
    console.error(error);
    throw error;
  }
};
