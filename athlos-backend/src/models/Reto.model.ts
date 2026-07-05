import db from '../config/db';

export const ESTADO_PENDIENTE = 'En Progreso';
export const ESTADO_COMPLETADO = 'Completado';
export const ESTADO_ABANDONO = 'Abandono';

export interface Challenge {
  iddesafio: number;
  nombre: string;
  descripcion: string;
  puntos: number;
  fechaFin: string;
  completado: boolean;
}

export const buscarRetosActivos = async (idUsuario: number): Promise<Challenge[]> => {
  const resultado = await db.query(
    `SELECT r.idreto AS "iddesafio", r.nombre, r.descripcion, r.puntos::int,
            r.fechafin AS "fechaFin",
            (ur.estado = $2::estado_reto_enum) AS completado
     FROM usuarioreto ur
     JOIN reto r ON r.idreto = ur.idreto
     WHERE ur.idusuario = $1
       AND ur.estado <> $3::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     ORDER BY r.puntos DESC, r.idreto`,
    [idUsuario, ESTADO_COMPLETADO, ESTADO_ABANDONO]
  );
  return resultado.rows;
};

export const buscarPuntosUsuario = async (idUsuario: number): Promise<number> => {
  const resultado = await db.query(
    'SELECT COALESCE(puntos, 0)::int AS puntos FROM usuario WHERE idusuario = $1',
    [idUsuario]
  );
  if (resultado.rows.length === 0) {
    return 0;
  }
  return resultado.rows[0].puntos;
};

export const contarCambiosDeHoy = async (idUsuario: number): Promise<number> => {
  const resultado = await db.query(
    `SELECT COUNT(*)::int AS usados FROM usuarioreto
     WHERE idusuario = $1 AND estado = $2::estado_reto_enum AND fechaabandono = CURRENT_DATE`,
    [idUsuario, ESTADO_ABANDONO]
  );
  return resultado.rows[0].usados;
};

export const buscarRutinasDelUsuario = async (idUsuario: number) => {
  const resultado = await db.query(
    `SELECT p.idplan, p.nombreplan, r.nombre AS rutina,
            COUNT(re.idejercicio)::int AS ejercicios
     FROM plan p
     JOIN rutina r ON r.idplan = p.idplan
     LEFT JOIN rutinaejercicio re ON re.idrutina = r.idrutina
     WHERE p.idusuario = $1
     GROUP BY p.idplan, p.nombreplan, p.fechageneracion, r.idrutina, r.nombre
     ORDER BY p.fechageneracion DESC, r.idrutina`,
    [idUsuario]
  );
  return resultado.rows;
};

export const crearRetoParaUsuario = async (
  idUsuario: number,
  nombre: string,
  descripcion: string,
  puntos: number,
  diasPlazo: number
): Promise<void> => {
  const resultado = await db.query(
    `INSERT INTO reto (nombre, descripcion, fechafin, puntos)
     VALUES ($1, $2, CURRENT_DATE + $4::int, $3)
     RETURNING idreto`,
    [nombre, descripcion, puntos, diasPlazo]
  );
  const idReto = resultado.rows[0].idreto;

  await db.query(
    `INSERT INTO usuarioreto (idusuario, idreto, progresoactual, fechainscripcion, estado)
     VALUES ($1, $2, 0, CURRENT_DATE, $3::estado_reto_enum)`,
    [idUsuario, idReto, ESTADO_PENDIENTE]
  );
};

export const marcarCompletado = async (idReto: number, idUsuario: number): Promise<number | null> => {
  const resultado = await db.query(
    `UPDATE usuarioreto ur
     SET estado = $3::estado_reto_enum, progresoactual = 100
     FROM reto r
     WHERE r.idreto = ur.idreto
       AND ur.idreto = $1 AND ur.idusuario = $2
       AND ur.estado = $4::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     RETURNING r.puntos`,
    [idReto, idUsuario, ESTADO_COMPLETADO, ESTADO_PENDIENTE]
  );
  if (resultado.rows.length === 0) {
    return null;
  }
  return resultado.rows[0].puntos;
};

export const marcarAbandonado = async (idReto: number, idUsuario: number): Promise<number | null> => {
  const resultado = await db.query(
    `UPDATE usuarioreto ur
     SET estado = $3::estado_reto_enum, fechaabandono = CURRENT_DATE
     FROM reto r
     WHERE r.idreto = ur.idreto
       AND ur.idreto = $1 AND ur.idusuario = $2
       AND ur.estado = $4::estado_reto_enum
       AND r.fechafin >= CURRENT_DATE
     RETURNING r.puntos`,
    [idReto, idUsuario, ESTADO_ABANDONO, ESTADO_PENDIENTE]
  );
  if (resultado.rows.length === 0) {
    return null;
  }
  return resultado.rows[0].puntos;
};

export const sumarPuntosAlUsuario = async (idUsuario: number, puntos: number): Promise<void> => {
  await db.query(
    'UPDATE usuario SET puntos = COALESCE(puntos, 0) + $1 WHERE idusuario = $2',
    [puntos, idUsuario]
  );
};

export const contarPendientes = async (idUsuario: number): Promise<number> => {
  const resultado = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM usuarioreto ur JOIN reto r ON r.idreto = ur.idreto
     WHERE ur.idusuario = $1 AND ur.estado = $2::estado_reto_enum AND r.fechafin >= CURRENT_DATE`,
    [idUsuario, ESTADO_PENDIENTE]
  );
  return resultado.rows[0].n;
};

export const vencerRetosDelUsuario = async (idUsuario: number): Promise<void> => {
  await db.query(
    `UPDATE reto SET fechafin = CURRENT_DATE - 1
     WHERE fechafin >= CURRENT_DATE
       AND idreto IN (SELECT idreto FROM usuarioreto WHERE idusuario = $1)`,
    [idUsuario]
  );
};