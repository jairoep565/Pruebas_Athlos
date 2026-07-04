import db from '../config/db';

const ESTADO_PENDIENTE = 'En Progreso';
const ESTADO_COMPLETADO = 'Completado';
const ESTADO_ABANDONO = 'Abandono';

const DIAS_PLAZO = 7;
const CAMBIOS_POR_DIA = 3;
const PUNTOS_FACIL = 5;
const PUNTOS_DIFICIL = 15;

export interface Challenge {
  iddesafio: number;   // = reto.idreto
  nombre: string;
  descripcion: string;
  puntos: number;
  fechaFin: string;
  completado: boolean;
}

type Nuevo = { nombre: string; descripcion: string; puntos: number };

// ─── Consultas base ─────────────────────────────────────────────

const getActiveChallenges = async (userId: number): Promise<Challenge[]> => {
  const result = await db.query(
    `SELECT r.idreto AS "iddesafio", r.nombre, r.descripcion, r.puntos::int,
            r.fechafin AS "fechaFin",
            (ur.estado = $2::estado_reto_enum) AS completado
     FROM usuarioreto ur
     JOIN reto r ON r.idreto = ur.idreto
     WHERE ur.idusuario = $1
       AND ur.estado <> $3::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     ORDER BY r.puntos DESC, r.idreto`,
    [userId, ESTADO_COMPLETADO, ESTADO_ABANDONO]
  );
  return result.rows;
};

export const getUserPoints = async (userId: number): Promise<number> => {
  const result = await db.query(
    'SELECT COALESCE(puntos, 0)::int AS puntos FROM usuario WHERE idusuario = $1',
    [userId]
  );
  return result.rows[0]?.puntos ?? 0;
};

export const getSwapsRestantes = async (userId: number): Promise<number> => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS usados FROM usuarioreto
     WHERE idusuario = $1 AND estado = $2::estado_reto_enum AND fechaabandono = CURRENT_DATE`,
    [userId, ESTADO_ABANDONO]
  );
  return Math.max(0, CAMBIOS_POR_DIA - result.rows[0].usados);
};

// ─── Generación de retos desde los planes ───────────────────────

const obtenerRutinas = async (userId: number) => {
  const result = await db.query(
    `SELECT p.idplan, p.nombreplan, r.nombre AS rutina,
            COUNT(re.idejercicio)::int AS ejercicios
     FROM plan p
     JOIN rutina r ON r.idplan = p.idplan
     LEFT JOIN rutinaejercicio re ON re.idrutina = r.idrutina
     WHERE p.idusuario = $1
     GROUP BY p.idplan, p.nombreplan, p.fechageneracion, r.idrutina, r.nombre
     ORDER BY p.fechageneracion DESC, r.idrutina`,
    [userId]
  );
  return result.rows;
};

const construirPool = (rutinas: any[]): { faciles: Nuevo[]; dificiles: Nuevo[] } => {
  const primero = rutinas[0];
  const totalEjercicios = Math.min(rutinas.reduce((s, r) => s + r.ejercicios, 0), 15);
  const diasPorSemana = rutinas.filter((r) => r.idplan === primero.idplan).length;

  const faciles: Nuevo[] = [
    ...rutinas.slice(0, 4).map((r) => ({
      nombre: `Completa "${r.rutina}"`,
      descripcion: `Termina una vez la rutina "${r.rutina}" (${r.ejercicios} ejercicios) del plan "${r.nombreplan}".`,
      puntos: PUNTOS_FACIL,
    })),
    { nombre: 'Racha corta', descripcion: 'Entrena 2 días consecutivos esta semana.', puntos: PUNTOS_FACIL },
    { nombre: 'Calentamiento pro', descripcion: 'Calienta 10 minutos antes de cada rutina esta semana.', puntos: PUNTOS_FACIL },
    { nombre: 'Estiramiento', descripcion: 'Estira 10 minutos después de cada entrenamiento.', puntos: PUNTOS_FACIL },
    { nombre: 'Arranque ligero', descripcion: 'Completa 5 ejercicios de tus planes esta semana.', puntos: PUNTOS_FACIL },
  ];

  const dificiles: Nuevo[] = [
    { nombre: 'Semana activa', descripcion: `Realiza ${totalEjercicios} ejercicios de tus planes durante esta semana.`, puntos: PUNTOS_DIFICIL },
    { nombre: 'Constancia total', descripcion: `Entrena ${diasPorSemana} días esta semana según "${primero.nombreplan}".`, puntos: PUNTOS_DIFICIL },
    { nombre: 'Plan completo', descripcion: `Completa todas las rutinas del plan "${primero.nombreplan}" en la semana.`, puntos: PUNTOS_DIFICIL },
    { nombre: 'Doble sesión', descripcion: 'Completa 2 rutinas en un mismo día.', puntos: PUNTOS_DIFICIL },
  ];

  return { faciles, dificiles };
};

const barajar = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const insertarReto = async (userId: number, n: Nuevo): Promise<void> => {
  const reto = await db.query(
    `INSERT INTO reto (nombre, descripcion, fechafin, puntos)
     VALUES ($1, $2, CURRENT_DATE + ${DIAS_PLAZO}, $3)
     RETURNING idreto`,
    [n.nombre, n.descripcion, n.puntos]
  );
  await db.query(
    `INSERT INTO usuarioreto (idusuario, idreto, progresoactual, fechainscripcion, estado)
     VALUES ($1, $2, 0, CURRENT_DATE, $3::estado_reto_enum)`,
    [userId, reto.rows[0].idreto, ESTADO_PENDIENTE]
  );
};

// Genera un lote de 5: 3 fáciles + 2 difíciles
const generarLote = async (userId: number): Promise<Challenge[]> => {
  const rutinas = await obtenerRutinas(userId);
  if (rutinas.length === 0) return []; // sin planes no hay retos

  const { faciles, dificiles } = construirPool(rutinas);
  const seleccion = [...barajar(faciles).slice(0, 3), ...barajar(dificiles).slice(0, 2)];
  for (const n of seleccion) await insertarReto(userId, n);
  return getActiveChallenges(userId);
};

// ─── API del servicio ───────────────────────────────────────────

export const getChallengesByUserId = async (userId: number): Promise<Challenge[]> => {
  const activos = await getActiveChallenges(userId);
  if (activos.length > 0) return activos;
  return generarLote(userId); // primera vez o venció la semana
};

// Completa un reto, suma puntos; si eran los 5, genera lote nuevo
export const completeChallenge = async (challengeId: number, userId: number): Promise<Challenge[] | null> => {
  const result = await db.query(
    `UPDATE usuarioreto ur
     SET estado = $3::estado_reto_enum, progresoactual = 100
     FROM reto r
     WHERE r.idreto = ur.idreto
       AND ur.idreto = $1 AND ur.idusuario = $2
       AND ur.estado = $4::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     RETURNING r.puntos`,
    [challengeId, userId, ESTADO_COMPLETADO, ESTADO_PENDIENTE]
  );
  if (result.rowCount === 0) return null;

  await db.query(
    'UPDATE usuario SET puntos = COALESCE(puntos, 0) + $1 WHERE idusuario = $2',
    [result.rows[0].puntos, userId]
  );

  // ¿Quedan retos pendientes? Si no, cerrar el lote y generar 5 nuevos
  const pendientes = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM usuarioreto ur JOIN reto r ON r.idreto = ur.idreto
     WHERE ur.idusuario = $1 AND ur.estado = $2::estado_reto_enum AND r.fechafin >= CURRENT_DATE`,
    [userId, ESTADO_PENDIENTE]
  );
  if (pendientes.rows[0].n === 0) {
    await db.query(
      `UPDATE reto SET fechafin = CURRENT_DATE - 1
       WHERE fechafin >= CURRENT_DATE
         AND idreto IN (SELECT idreto FROM usuarioreto WHERE idusuario = $1)`,
      [userId]
    );
    return generarLote(userId);
  }
  return getActiveChallenges(userId);
};

// Cambia un reto pendiente por otro de la misma dificultad (máx. 3 al día)
export const swapChallenge = async (
  challengeId: number,
  userId: number
): Promise<Challenge[] | 'LIMIT' | null> => {
  if ((await getSwapsRestantes(userId)) === 0) return 'LIMIT';

  // Marcar como abandonado (solo si está pendiente y vigente)
  const abandonado = await db.query(
    `UPDATE usuarioreto ur
     SET estado = $3::estado_reto_enum, fechaabandono = CURRENT_DATE
     FROM reto r
     WHERE r.idreto = ur.idreto
       AND ur.idreto = $1 AND ur.idusuario = $2
       AND ur.estado = $4::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     RETURNING r.puntos`,
    [challengeId, userId, ESTADO_ABANDONO, ESTADO_PENDIENTE]
  );
  if (abandonado.rowCount === 0) return null;

  // Reemplazo de la misma dificultad, evitando repetir nombres activos
  const dificultad = abandonado.rows[0].puntos;
  const rutinas = await obtenerRutinas(userId);
  const { faciles, dificiles } = construirPool(rutinas);
  const pool = dificultad >= PUNTOS_DIFICIL ? dificiles : faciles;

  const activos = await getActiveChallenges(userId);
  const nombresActivos = new Set(activos.map((c) => c.nombre));
  const candidatos = pool.filter((n) => !nombresActivos.has(n.nombre));
  const nuevo = barajar(candidatos.length > 0 ? candidatos : pool)[0];

  await insertarReto(userId, nuevo);
  return getActiveChallenges(userId);
};