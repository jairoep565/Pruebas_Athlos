import db from '../config/db';

export interface Rango {
  rangoID: number;
  rango: string;
  experienciaRango: number;
}

export interface ProgresoRango {
  experiencia: number;
  rango: Rango;
  subioDeRango: boolean;
  siguienteRango: Rango | null;
  xpParaSiguiente: number | null;
  porcentajeAlSiguiente: number; // 0-100, para la barra de progreso
}

// ══════════════════════════════════════════════════════════════════════
//  Consultas base
// ══════════════════════════════════════════════════════════════════════

export const getAllRangos = async (): Promise<Rango[]> => {
  const result = await db.query(
    `SELECT "rangoID", rango, "experienciaRango"
     FROM rangos
     ORDER BY "experienciaRango" ASC`
  );
  return result.rows;
};

// ══════════════════════════════════════════════════════════════════════
//  Helpers internos
// ══════════════════════════════════════════════════════════════════════

const calcularRango = (xp: number, rangos: Rango[]): Rango => {
  let actual = rangos[0];
  for (const r of rangos) {
    if (xp >= r.experienciaRango) actual = r;
    else break;
  }
  return actual;
};

const construirProgreso = (
  experiencia: number,
  rangoActual: Rango,
  rangos: Rango[],
  subioDeRango = false
): ProgresoRango => {
  const idx = rangos.findIndex((r) => r.rangoID === rangoActual.rangoID);
  const siguienteRango = idx >= 0 && idx < rangos.length - 1 ? rangos[idx + 1] : null;

  let porcentaje = 100;
  if (siguienteRango) {
    const rangoTotal = siguienteRango.experienciaRango - rangoActual.experienciaRango;
    const avance = experiencia - rangoActual.experienciaRango;
    porcentaje = rangoTotal > 0 ? Math.min(100, Math.max(0, Math.round((avance / rangoTotal) * 100))) : 100;
  }

  return {
    experiencia,
    rango: rangoActual,
    subioDeRango,
    siguienteRango,
    xpParaSiguiente: siguienteRango ? siguienteRango.experienciaRango - experiencia : null,
    porcentajeAlSiguiente: porcentaje,
  };
};

// ══════════════════════════════════════════════════════════════════════
//  Suma XP y actualiza el rango del usuario (transaccional)
// ══════════════════════════════════════════════════════════════════════

export const sumarExperienciaYActualizarRango = async (
  idUsuario: number,
  xpGanada: number
): Promise<ProgresoRango> => {
  return db.transaction(async (client) => {
    const userRes = await client.query(
      `SELECT "XP", "rangoID" FROM usuario WHERE idusuario = $1 FOR UPDATE`,
      [idUsuario]
    );

    if (userRes.rowCount === 0) {
      throw new Error('Usuario no encontrado al actualizar experiencia.');
    }

    const experienciaActual = Number(userRes.rows[0].XP) || 0;
    const rangoIdActual = Number(userRes.rows[0].rangoID);
    const nuevaExperiencia = experienciaActual + xpGanada;

    const rangosRes = await client.query(
      `SELECT "rangoID", rango, "experienciaRango" FROM rangos ORDER BY "experienciaRango" ASC`
    );
    const rangos: Rango[] = rangosRes.rows;
    const nuevoRango = calcularRango(nuevaExperiencia, rangos);

    await client.query(
      `UPDATE usuario SET "XP" = $1, "rangoID" = $2 WHERE idusuario = $3`,
      [nuevaExperiencia, nuevoRango.rangoID, idUsuario]
    );

    return construirProgreso(
      nuevaExperiencia,
      nuevoRango,
      rangos,
      nuevoRango.rangoID !== rangoIdActual
    );
  });
};

// ══════════════════════════════════════════════════════════════════════
//  Progreso del usuario autenticado
// ══════════════════════════════════════════════════════════════════════

export const getMiRango = async (idUsuario: number): Promise<ProgresoRango | null> => {
  const result = await db.query(
    `SELECT "XP", "rangoID" FROM usuario WHERE idusuario = $1`,
    [idUsuario]
  );
  if (result.rowCount === 0) return null;

  const experiencia = Number(result.rows[0].XP) || 0;
  const rangos = await getAllRangos();

  if (rangos.length === 0) {
    throw new Error('No hay rangos configurados en la base de datos.');
  }

  const rangoActual = calcularRango(experiencia, rangos);
  return construirProgreso(experiencia, rangoActual, rangos);
};

// ══════════════════════════════════════════════════════════════════════
//  Leaderboard global
// ══════════════════════════════════════════════════════════════════════

export interface RankingEntry {
  idusuario: number;
  nombre: string;
  experiencia: number;
  rango: string;
  posicion: number;
}

export const getRankingGlobal = async (
  limit = 10, // ← antes era 20
  idUsuarioActual?: number
): Promise<{ top: RankingEntry[]; miPosicion: number | null }> => {
  const result = await db.query(
    `SELECT
       u.idusuario,
       u.nombre,
       u."XP" AS experiencia,
       r.rango,
       RANK() OVER (ORDER BY u."XP" DESC)::int AS posicion
     FROM usuario u
     LEFT JOIN rangos r ON r."rangoID" = u."rangoID"
     ORDER BY u."XP" DESC, u.idusuario ASC
     LIMIT $1`,
    [limit]
  );

  let miPosicion: number | null = null;
  if (idUsuarioActual) {
    const miRes = await db.query(
      `SELECT posicion FROM (
         SELECT idusuario, RANK() OVER (ORDER BY "XP" DESC)::int AS posicion
         FROM usuario
       ) t WHERE idusuario = $1`,
      [idUsuarioActual]
    );
    miPosicion = miRes.rows[0]?.posicion ?? null;
  }

  return { top: result.rows, miPosicion };
};
// ══════════════════════════════════════════════════════════════════════
//  Búsqueda de posición por nombre
// ══════════════════════════════════════════════════════════════════════

export const buscarPosicionPorNombre = async (
  nombre: string,
  limit = 10
): Promise<RankingEntry[]> => {
  const result = await db.query(
    `SELECT idusuario, nombre, experiencia, rango, posicion
     FROM (
       SELECT
         u.idusuario,
         u.nombre,
         u."XP" AS experiencia,
         r.rango,
         RANK() OVER (ORDER BY u."XP" DESC)::int AS posicion
       FROM usuario u
       LEFT JOIN rangos r ON r."rangoID" = u."rangoID"
     ) ranking
     WHERE nombre ILIKE $1
     ORDER BY posicion ASC
     LIMIT $2`,
    [`%${nombre.trim()}%`, limit]
  );
  return result.rows;
};