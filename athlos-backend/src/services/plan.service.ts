import db from '../config/db';
import { getExerciseCatalogForPlan, IExerciseCatalogForPlan } from '../models/Exercise.model';
import { getUserProfileById, UserProfile } from '../models/Chat.model';

export class GeminiQuotaError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('La cuota gratuita de Gemini se agotó temporalmente.');
    this.name = 'GeminiQuotaError';
  }
}

// ══════════════════════════════════════════════════════════════════════
//  Interfaces: Respuesta de Gemini (lo que la IA devuelve)
// ══════════════════════════════════════════════════════════════════════

export interface GeminiExercise {
  id: string;          // idejercicio del catálogo, como string
  nombre: string;
  tipo: string;
  series: number;
  repeticiones: number;
  descansoSegundos: number;
  instrucciones: string;
}

export interface GeminiRutina {
  nombre: string;
  duracion: number;    // duración en minutos
  ejercicios: GeminiExercise[];
}

export interface GeminiPlan {
  nombre: string;
  descripcion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  rutinas: GeminiRutina[];
}

// ══════════════════════════════════════════════════════════════════════
//  Interfaces: Respuesta al Frontend (enriquecida con IDs de la BD)
// ══════════════════════════════════════════════════════════════════════

export interface SavedExercise {
  idejercicio: number;
  nombre: string;
  tipo: string;
  series: number;
  repeticiones: number;
  descansoSegundos: number;
  instrucciones: string;
}

export interface SavedRutina {
  idrutina: number;
  nombre: string;
  duracion: number;
  estado: string;
  ejercicios: SavedExercise[];
}

export interface SavedPlan {
  idplan: number;
  idusuario: number;
  nombreplan: string;
  descripcion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  rutinas: SavedRutina[];
}

export interface StoredPlanSummary {
  idplan: number;
  nombre: string;
  fechaCreacion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  totalEjercicios: number;
}

export interface StoredPlanDetail extends StoredPlanSummary {
  rutinas: Array<{
    idrutina: number;
    nombre: string;
    duracion: number;
    estado: string;
    ejercicios: Array<{
      idejercicio: number;
      nombre: string;
      descripcion: string;
      series: number;
      repeticiones: number;
    }>;
  }>;
}

export const getPlansByUserId = async (userId: number): Promise<StoredPlanSummary[]> => {
  const result = await db.query(
    `SELECT
       p.idplan,
       p.nombreplan AS nombre,
       p.fechageneracion AS "fechaCreacion",
       COALESCE(NULLIF(regexp_replace(p.duracion, '[^0-9]', '', 'g'), ''), '0')::int AS "duracionSemanas",
       COUNT(DISTINCT r.idrutina)::int AS "diasPorSemana",
       COUNT(re.idejercicio)::int AS "totalEjercicios"
     FROM plan p
     LEFT JOIN rutina r ON r.idplan = p.idplan
     LEFT JOIN rutinaejercicio re ON re.idrutina = r.idrutina
     WHERE p.idusuario = $1
     GROUP BY p.idplan, p.nombreplan, p.fechageneracion, p.duracion
     ORDER BY p.fechageneracion DESC, p.idplan DESC`,
    [userId]
  );
  return result.rows;
};

export const getPlanByIdForUser = async (
  planId: number,
  userId: number
): Promise<StoredPlanDetail | null> => {
  const planResult = await db.query(
    `SELECT
       p.idplan,
       p.nombreplan AS nombre,
       p.fechageneracion AS "fechaCreacion",
       COALESCE(NULLIF(regexp_replace(p.duracion, '[^0-9]', '', 'g'), ''), '0')::int AS "duracionSemanas"
     FROM plan p
     WHERE p.idplan = $1 AND p.idusuario = $2`,
    [planId, userId]
  );
  if (planResult.rowCount === 0) return null;

  const rows = await db.query(
    `SELECT
       r.idrutina,
       r.nombre AS "rutinaNombre",
       r.duracion AS "rutinaDuracion",
       r.estado::text AS estado,
       e.idejercicio,
       e.nombre AS "ejercicioNombre",
       COALESCE(e.descripcion, '') AS descripcion,
       re.series,
       re.repeticiones
     FROM rutina r
     LEFT JOIN rutinaejercicio re ON re.idrutina = r.idrutina
     LEFT JOIN ejercicio e ON e.idejercicio = re.idejercicio
     WHERE r.idplan = $1
     ORDER BY r.idrutina, e.idejercicio`,
    [planId]
  );

  const routines = new Map<number, StoredPlanDetail['rutinas'][number]>();
  for (const row of rows.rows) {
    if (!routines.has(row.idrutina)) {
      routines.set(row.idrutina, {
        idrutina: row.idrutina,
        nombre: row.rutinaNombre,
        duracion: row.rutinaDuracion || 0,
        estado: row.estado,
        ejercicios: [],
      });
    }
    if (row.idejercicio) {
      routines.get(row.idrutina)!.ejercicios.push({
        idejercicio: row.idejercicio,
        nombre: row.ejercicioNombre,
        descripcion: row.descripcion,
        series: row.series,
        repeticiones: row.repeticiones,
      });
    }
  }

  const plan = planResult.rows[0];
  const rutinas = Array.from(routines.values());
  return {
    ...plan,
    diasPorSemana: rutinas.length,
    totalEjercicios: rutinas.reduce((total, rutina) => total + rutina.ejercicios.length, 0),
    rutinas,
  };
};

export const deletePlansByUserId = async (
  planIds: number[],
  userId: number
): Promise<number[]> => {
  return db.transaction(async (client) => {
    const ownedPlans = await client.query<{ idplan: number }>(
      `SELECT idplan
       FROM plan
       WHERE idusuario = $1 AND idplan = ANY($2::int[])
       ORDER BY idplan`,
      [userId, planIds]
    );

    if (ownedPlans.rowCount !== planIds.length) {
      throw new Error('PLAN_NOT_FOUND');
    }

    await client.query(
      `DELETE FROM rutinaejercicio
       WHERE idrutina IN (
         SELECT idrutina FROM rutina WHERE idplan = ANY($1::int[])
       )`,
      [planIds]
    );
    await client.query('DELETE FROM rutina WHERE idplan = ANY($1::int[])', [planIds]);
    const deleted = await client.query<{ idplan: number }>(
      `DELETE FROM plan
       WHERE idusuario = $1 AND idplan = ANY($2::int[])
       RETURNING idplan`,
      [userId, planIds]
    );

    return deleted.rows.map((plan) => plan.idplan);
  });
};

// ══════════════════════════════════════════════════════════════════════
//  Schema de Gemini (con rutinas → ejercicios)
// ══════════════════════════════════════════════════════════════════════

const GEMINI_MODEL_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const planSchema = {
  type: 'OBJECT',
  required: ['nombre', 'descripcion', 'duracionSemanas', 'diasPorSemana', 'rutinas'],
  properties: {
    nombre: { type: 'STRING' },
    descripcion: { type: 'STRING' },
    duracionSemanas: { type: 'INTEGER' },
    diasPorSemana: { type: 'INTEGER' },
    rutinas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['nombre', 'duracion', 'ejercicios'],
        properties: {
          nombre: { type: 'STRING' },
          duracion: { type: 'INTEGER' },
          ejercicios: {
            type: 'ARRAY',
            minItems: 3,
            maxItems: 8,
            items: {
              type: 'OBJECT',
              required: ['id', 'nombre', 'tipo', 'series', 'repeticiones', 'descansoSegundos', 'instrucciones'],
              properties: {
                id: { type: 'STRING' },
                nombre: { type: 'STRING' },
                tipo: { type: 'STRING' },
                series: { type: 'INTEGER' },
                repeticiones: { type: 'INTEGER' },
                descansoSegundos: { type: 'INTEGER' },
                instrucciones: { type: 'STRING' },
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
    // Eliminar posibles bloques de markdown ```json y ```
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('[Gemini] Respuesta cruda que causo el error:', rawText);
    throw new Error('El JSON devuelto por la IA esta corrupto o incompleto. Intenta nuevamente.');
  }
};

// ══════════════════════════════════════════════════════════════════════
//  Helpers de validación
// ══════════════════════════════════════════════════════════════════════

const toNumber = (value: unknown, min: number, max: number, fieldName: string): number => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Gemini devolvio un valor numerico invalido para "${fieldName}": ${value} (debe estar entre ${min} y ${max})`);
  }
  return Math.round(number);
};

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Gemini no devolvio ${field}`);
  }
  return value.trim();
};

const validatePlan = (
  value: unknown,
  catalogIds: Set<string>
): GeminiPlan => {
  if (!value || typeof value !== 'object') throw new Error('Gemini no devolvio un plan valido');
  const plan = value as Record<string, any>;

  const planNombre = plan.nombre ?? plan.nombrePlan ?? plan.nombre_plan ?? plan.title;
  const planDescripcion = plan.descripcion ?? plan.description ?? plan.desc;
  const planDuracionSemanas = plan.duracionSemanas ?? plan.duracion_semanas ?? plan.duracion ?? plan.weeks;
  const planDiasPorSemana = plan.diasPorSemana ?? plan.dias_por_semana ?? plan.dias ?? plan.days;
  const planRutinas = plan.rutinas ?? plan.routines ?? plan.rutina;

  if (!Array.isArray(planRutinas) || planRutinas.length === 0) {
    throw new Error('Gemini no devolvio rutinas validas o el listado de rutinas esta vacio');
  }

  const rutinas: GeminiRutina[] = planRutinas.map((rutinaRaw: any, rIdx: number) => {
    if (!rutinaRaw || typeof rutinaRaw !== 'object') {
      throw new Error(`Gemini devolvio una rutina invalida en posicion ${rIdx + 1}`);
    }

    const rutinaNombre = rutinaRaw.nombre ?? rutinaRaw.nombreRutina ?? rutinaRaw.nombre_rutina ?? rutinaRaw.name ?? rutinaRaw.title;
    const rutinaDuracion = rutinaRaw.duracion ?? rutinaRaw.duracionMinutos ?? rutinaRaw.duracion_minutos ?? rutinaRaw.duration;
    const rutinaEjercicios = rutinaRaw.ejercicios ?? rutinaRaw.exercises ?? rutinaRaw.ejercicio;

    if (!Array.isArray(rutinaEjercicios) || rutinaEjercicios.length < 3) {
      throw new Error(`La rutina "${rutinaNombre || rIdx + 1}" tiene menos de 3 ejercicios`);
    }

    const ejercicios: GeminiExercise[] = rutinaEjercicios.map((item: any, eIdx: number) => {
      if (!item || typeof item !== 'object') throw new Error('Gemini devolvio un ejercicio invalido');

      const rawId = item.id ?? item.idEjercicio ?? item.idejercicio ?? item.id_ejercicio;
      const id = text(rawId, `el id del ejercicio ${eIdx + 1} de la rutina "${rutinaNombre || rIdx + 1}"`);

      // ── Validación RAG: el ID debe existir en el catálogo real ──
      if (!catalogIds.has(id)) {
        throw new Error(
          `Gemini devolvio el ejercicio "${item.nombre || item.name || ''}" con ID ${id} que NO existe en el catalogo.`
        );
      }

      const rawNombre = item.nombre ?? item.nombreEjercicio ?? item.nombre_ejercicio ?? item.name;
      const rawTipo = item.tipo ?? item.type ?? item.categoria;
      const rawSeries = item.series ?? item.sets;
      const rawRepeticiones = item.repeticiones ?? item.reps;
      const rawDescanso = item.descansoSegundos ?? item.descanso_segundos ?? item.descanso ?? item.rest;
      const rawInstrucciones = item.instrucciones ?? item.instructions ?? item.instruccion ?? item.description ?? item.descripcion;

      return {
        id,
        nombre: text(rawNombre, `nombre del ejercicio ${eIdx + 1}`),
        tipo: text(rawTipo, `tipo del ejercicio ${eIdx + 1}`),
        series: toNumber(rawSeries, 1, 10, `series del ejercicio ${eIdx + 1} de la rutina "${rutinaNombre || rIdx + 1}"`),
        repeticiones: toNumber(rawRepeticiones, 1, 100, `repeticiones del ejercicio ${eIdx + 1} de la rutina "${rutinaNombre || rIdx + 1}"`),
        descansoSegundos: toNumber(rawDescanso, 0, 600, `descansoSegundos del ejercicio ${eIdx + 1} de la rutina "${rutinaNombre || rIdx + 1}"`),
        instrucciones: text(rawInstrucciones, `instrucciones del ejercicio ${eIdx + 1}`),
      };
    });

    return {
      nombre: text(rutinaNombre, `nombre de la rutina ${rIdx + 1}`),
      duracion: toNumber(rutinaDuracion, 10, 180, `duracion de la rutina ${rIdx + 1}`),
      ejercicios,
    };
  });

  return {
    nombre: text(planNombre, 'el nombre del plan'),
    descripcion: text(planDescripcion, 'la descripcion del plan'),
    duracionSemanas: toNumber(planDuracionSemanas, 1, 12, 'duracionSemanas del plan'),
    diasPorSemana: toNumber(planDiasPorSemana, 1, 7, 'diasPorSemana del plan'),
    rutinas,
  };
};

// ══════════════════════════════════════════════════════════════════════
//  Prompt RAG (fase Augmented)
// ══════════════════════════════════════════════════════════════════════

const buildRAGPrompt = (
  user: UserProfile,
  catalog: IExerciseCatalogForPlan[]
): string => {
  const catalogJSON = JSON.stringify(
    catalog.map((e) => ({
      idejercicio: e.idejercicio,
      nombre: e.nombre,
      descripcion: e.descripcion || 'Sin descripcion',
    }))
  );

  return `Eres un entrenador personal experto. Tu tarea es crear un plan de entrenamiento estructurado para un usuario con los siguientes datos:
- Nombre: ${user.nombre || 'No especificado'}
- Edad: ${user.edad || 'No especificada'}
- Peso: ${user.peso || 'No especificado'} kg
- Talla: ${user.talla || 'No especificada'} cm
- Entorno de entrenamiento: ${user.entorno || 'casa'}

Tienes ESTRICTAMENTE PROHIBIDO inventar ejercicios. DEBES seleccionar los ejercicios UNICAMENTE del siguiente catalogo JSON que te proporciono:
${catalogJSON}

Si un ejercicio no esta en esta lista, no lo uses.

ESTRUCTURA DE RESPUESTA:
Genera UNICAMENTE un microciclo semanal (maximo 5 rutinas). El usuario repetira esta semana durante la duracion total del plan.
Cada rutina representa un dia de entrenamiento.
La cantidad de rutinas debe coincidir con "diasPorSemana" (maximo 5).
Cada rutina tiene: "nombre" (ej: "Dia 1 - Tren Superior"), "duracion" (en minutos), y un array "ejercicios" con entre 3 y 6 ejercicios.

REGLAS PARA EJERCICIOS:
1. La propiedad "id" de cada ejercicio DEBE ser el "idejercicio" exacto del catalogo, convertido a string.
2. La propiedad "nombre" DEBE coincidir exactamente con el nombre del catalogo.
3. La propiedad "tipo" debe ser una categoria (ej: "fuerza", "cardio", "flexibilidad", "equilibrio").
4. La propiedad "repeticiones" siempre debe ser numerica; para ejercicios por tiempo usa la cantidad de segundos.
5. El plan debe ser realista para un principiante o nivel general.
6. Usa ejercicios que puedan realizarse en el entorno indicado.
7. Escribe todo en espanol.

IMPORTANTE: Devuelve estrictamente el JSON sin texto adicional, sin saludos y sin bloques de codigo Markdown.`;
};

// ══════════════════════════════════════════════════════════════════════
//  Persistencia transaccional en PostgreSQL
// ══════════════════════════════════════════════════════════════════════

const savePlanToDatabase = async (
  userId: number,
  plan: GeminiPlan
): Promise<SavedPlan> => {
  return db.transaction(async (client) => {
    // ── Paso 1: Insertar Plan ──
    const planResult = await client.query(
      `INSERT INTO plan (idusuario, nombreplan, duracion)
       VALUES ($1, $2, $3)
       RETURNING idplan`,
      [userId, plan.nombre, String(plan.duracionSemanas)]
    );
    const idplan: number = planResult.rows[0].idplan;
    console.log(`[TX] Plan insertado: idplan=${idplan}`);

    // ── Paso 2 y 3: Insertar Rutinas + RutinaEjercicio ──
    const rutinas: SavedRutina[] = [];

    for (const rutina of plan.rutinas) {
      const rutinaResult = await client.query(
        `INSERT INTO rutina (idplan, nombre, duracion, estado)
         VALUES ($1, $2, $3, $4)
         RETURNING idrutina`,
        [idplan, rutina.nombre, rutina.duracion, 'Pendiente']
      );
      const idrutina: number = rutinaResult.rows[0].idrutina;
      console.log(`[TX]   Rutina insertada: idrutina=${idrutina} → "${rutina.nombre}"`);

      const ejercicios: SavedExercise[] = [];

      for (const ejercicio of rutina.ejercicios) {
        await client.query(
          `INSERT INTO rutinaejercicio (idrutina, idejercicio, series, repeticiones)
           VALUES ($1, $2, $3, $4)`,
          [idrutina, Number(ejercicio.id), ejercicio.series, ejercicio.repeticiones]
        );

        ejercicios.push({
          idejercicio: Number(ejercicio.id),
          nombre: ejercicio.nombre,
          tipo: ejercicio.tipo,
          series: ejercicio.series,
          repeticiones: ejercicio.repeticiones,
          descansoSegundos: ejercicio.descansoSegundos,
          instrucciones: ejercicio.instrucciones,
        });
      }

      rutinas.push({
        idrutina,
        nombre: rutina.nombre,
        duracion: rutina.duracion,
        estado: 'Pendiente',
        ejercicios,
      });
    }

    console.log(`[TX] Transacción completada: Plan ${idplan} con ${rutinas.length} rutinas`);

    // ── Paso 4: Estructurar respuesta con IDs de la BD ──
    return {
      idplan,
      idusuario: userId,
      nombreplan: plan.nombre,
      descripcion: plan.descripcion,
      duracionSemanas: plan.duracionSemanas,
      diasPorSemana: plan.diasPorSemana,
      rutinas,
    };
  });
};

// ══════════════════════════════════════════════════════════════════════
//  Función principal: generateTrainingPlan (RAG + Persistencia)
// ══════════════════════════════════════════════════════════════════════

export const generateTrainingPlan = async (userId: string): Promise<SavedPlan> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'TU_API_KEY_AQUI') throw new Error('GEMINI_API_KEY no esta configurada');

  // ── FASE 1: Retrieval — consultar BD ──
  const [user, catalog] = await Promise.all([
    getUserProfileById(userId),
    getExerciseCatalogForPlan(),
  ]);

  if (!catalog || catalog.length === 0) {
    throw new Error('El catálogo maestro de ejercicios está vacío en la base de datos. Ejecuta los INSERTS primero.');
  }

  console.log(`[RAG] Usuario: ${user.nombre || userId} | Ejercicios en catalogo: ${catalog.length}`);

  // ── FASE 2: Augmented — construir prompt con contexto ──
  const prompt = buildRAGPrompt(user, catalog);

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
          responseSchema: planSchema,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Gemini API Error] Status:', response.status, 'Body:', body);
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
      throw new Error(`Gemini respondio ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) throw new Error('Gemini no devolvio contenido');
    console.log('[Gemini Response] Texto crudo obtenido con exito.');
  } catch (error) {
    console.error('--- ERROR DURANTE LA GENERACIÓN CON GEMINI ---');
    console.error(error);
    throw error;
  }

  // ── Sanitizar y parsear respuesta ──
  let parsed: unknown;
  try {
    parsed = parseGeminiResponse(responseText);
  } catch (error) {
    console.error('--- ERROR PARSEANDO LA RESPUESTA DE GEMINI ---');
    console.error('Texto crudo:', responseText);
    console.error(error);
    throw error;
  }

  // ── Validación RAG post-generación ──
  let validatedPlan: GeminiPlan;
  try {
    const catalogIds = new Set(catalog.map((e) => String(e.idejercicio)));
    validatedPlan = validatePlan(parsed, catalogIds);
    console.log(`[RAG] Plan validado: "${validatedPlan.nombre}" con ${validatedPlan.rutinas.length} rutinas`);
  } catch (error) {
    console.error('--- ERROR DE VALIDACIÓN DEL PLAN GENERADO ---');
    console.error('Objeto parseado:', JSON.stringify(parsed, null, 2));
    console.error(error);
    throw error;
  }

  // ── FASE 4: Persistencia transaccional ──
  try {
    const savedPlan = await savePlanToDatabase(Number(userId), validatedPlan);
    return savedPlan;
  } catch (error) {
    console.error('--- ERROR PERSISTIENDO EL PLAN EN LA BASE DE DATOS ---');
    console.error(error);
    throw error;
  }
};
