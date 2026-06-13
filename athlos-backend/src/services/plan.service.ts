export interface PlanProfile {
  nombre?: string;
  peso?: number;
  talla?: number;
  edad?: number;
  entorno?: string;
}

export interface GeneratedExercise {
  id: string;
  nombre: string;
  tipo: string;
  series: number;
  repeticiones: number;
  descansoSegundos: number;
  instrucciones: string;
}

export interface GeneratedPlan {
  nombre: string;
  descripcion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  ejercicios: GeneratedExercise[];
}

const GEMINI_MODEL_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const planSchema = {
  type: 'OBJECT',
  required: ['nombre', 'descripcion', 'duracionSemanas', 'diasPorSemana', 'ejercicios'],
  properties: {
    nombre: { type: 'STRING' },
    descripcion: { type: 'STRING' },
    duracionSemanas: { type: 'INTEGER' },
    diasPorSemana: { type: 'INTEGER' },
    ejercicios: {
      type: 'ARRAY',
      minItems: 4,
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
};

const toNumber = (value: unknown, min: number, max: number): number => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error('Gemini devolvio un valor numerico invalido');
  }
  return Math.round(number);
};

const text = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Gemini no devolvio ${field}`);
  }
  return value.trim();
};

const validatePlan = (value: unknown): GeneratedPlan => {
  if (!value || typeof value !== 'object') throw new Error('Gemini no devolvio un plan valido');
  const plan = value as Record<string, unknown>;
  if (!Array.isArray(plan.ejercicios) || plan.ejercicios.length < 4 || plan.ejercicios.length > 8) {
    throw new Error('Gemini devolvio una cantidad de ejercicios invalida');
  }

  return {
    nombre: text(plan.nombre, 'el nombre del plan'),
    descripcion: text(plan.descripcion, 'la descripcion del plan'),
    duracionSemanas: toNumber(plan.duracionSemanas, 1, 12),
    diasPorSemana: toNumber(plan.diasPorSemana, 1, 7),
    ejercicios: plan.ejercicios.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('Gemini devolvio un ejercicio invalido');
      const exercise = item as Record<string, unknown>;
      return {
        id: text(exercise.id, `el id del ejercicio ${index + 1}`),
        nombre: text(exercise.nombre, `el nombre del ejercicio ${index + 1}`),
        tipo: text(exercise.tipo, `el tipo del ejercicio ${index + 1}`),
        series: toNumber(exercise.series, 1, 10),
        repeticiones: toNumber(exercise.repeticiones, 1, 100),
        descansoSegundos: toNumber(exercise.descansoSegundos, 10, 300),
        instrucciones: text(exercise.instrucciones, `las instrucciones del ejercicio ${index + 1}`),
      };
    }),
  };
};

export const generateTrainingPlan = async (profile: PlanProfile): Promise<GeneratedPlan> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'TU_API_KEY_AQUI') throw new Error('GEMINI_API_KEY no esta configurada');

  const prompt = `Genera un plan de entrenamiento personalizado y seguro para este usuario:
- Nombre: ${profile.nombre || 'No especificado'}
- Edad: ${profile.edad || 'No especificada'}
- Peso: ${profile.peso || 'No especificado'} kg
- Talla: ${profile.talla || 'No especificada'} cm
- Entorno de entrenamiento: ${profile.entorno || 'casa'}

El plan debe ser realista para un principiante o nivel general. Usa ejercicios que puedan realizarse en el entorno indicado. La propiedad repeticiones siempre debe ser numerica; para ejercicios por tiempo usa la cantidad de segundos como repeticiones. Escribe todo en espanol y no incluyas texto fuera del JSON.`;

  const response = await fetch(`${GEMINI_MODEL_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: planSchema,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini respondio ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini no devolvio contenido');
  return validatePlan(JSON.parse(raw));
};
