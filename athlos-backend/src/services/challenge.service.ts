import {
  buscarPuntosUsuario,
  buscarRetosActivos,
  buscarRutinasDelUsuario,
  Challenge,
  contarCambiosDeHoy,
  contarPendientes,
  crearRetoParaUsuario,
  marcarAbandonado,
  marcarCompletado,
  sumarPuntosAlUsuario,
  vencerRetosDelUsuario,
} from '../models/Reto.model';

const DIAS_PLAZO = 7;
const CAMBIOS_POR_DIA = 3;
const PUNTOS_FACIL = 5;
const PUNTOS_DIFICIL = 15;

export { Challenge };

interface RetoNuevo {
  nombre: string;
  descripcion: string;
  puntos: number;
}

const armarListasDeRetos = (rutinas: any[]) => {
  const primerPlan = rutinas[0];

  let totalEjercicios = 0;
  for (const r of rutinas) {
    totalEjercicios = totalEjercicios + r.ejercicios;
  }
  if (totalEjercicios > 15) {
    totalEjercicios = 15;
  }

  let diasPorSemana = 0;
  for (const r of rutinas) {
    if (r.idplan === primerPlan.idplan) {
      diasPorSemana = diasPorSemana + 1;
    }
  }

  // retos fáciles 
  const faciles: RetoNuevo[] = [];
  for (let i = 0; i < rutinas.length && i < 4; i++) {
    const r = rutinas[i];
    faciles.push({
      nombre: 'Completa "' + r.rutina + '"',
      descripcion: 'Termina una vez la rutina "' + r.rutina + '" (' + r.ejercicios + ' ejercicios) del plan "' + r.nombreplan + '".',
      puntos: PUNTOS_FACIL,
    });
  }
  faciles.push({ nombre: 'Racha corta', descripcion: 'Entrena 2 días consecutivos esta semana.', puntos: PUNTOS_FACIL });
  faciles.push({ nombre: 'Calentamiento pro', descripcion: 'Calienta 10 minutos antes de cada rutina esta semana.', puntos: PUNTOS_FACIL });
  faciles.push({ nombre: 'Estiramiento', descripcion: 'Estira 10 minutos después de cada entrenamiento.', puntos: PUNTOS_FACIL });
  faciles.push({ nombre: 'Arranque ligero', descripcion: 'Completa 5 ejercicios de tus planes esta semana.', puntos: PUNTOS_FACIL });

  // retos difíciles
  const dificiles: RetoNuevo[] = [];
  dificiles.push({ nombre: 'Semana activa', descripcion: 'Realiza ' + totalEjercicios + ' ejercicios de tus planes durante esta semana.', puntos: PUNTOS_DIFICIL });
  dificiles.push({ nombre: 'Constancia total', descripcion: 'Entrena ' + diasPorSemana + ' días esta semana según "' + primerPlan.nombreplan + '".', puntos: PUNTOS_DIFICIL });
  dificiles.push({ nombre: 'Plan completo', descripcion: 'Completa todas las rutinas del plan "' + primerPlan.nombreplan + '" en la semana.', puntos: PUNTOS_DIFICIL });
  dificiles.push({ nombre: 'Doble sesión', descripcion: 'Completa 2 rutinas en un mismo día.', puntos: PUNTOS_DIFICIL });

  return { faciles: faciles, dificiles: dificiles };
};

// reto random
const sacarRetoAlAzar = (lista: RetoNuevo[]): RetoNuevo => {
  const posicion = Math.floor(Math.random() * lista.length);
  const elegido = lista[posicion];
  lista.splice(posicion, 1);
  return elegido;
};

// Genera 5 retos
const generarCincoRetos = async (idUsuario: number): Promise<Challenge[]> => {
  const rutinas = await buscarRutinasDelUsuario(idUsuario);

  
  if (rutinas.length === 0) {
    return [];
  }

  const listas = armarListasDeRetos(rutinas);

  for (let i = 0; i < 3; i++) {
    const reto = sacarRetoAlAzar(listas.faciles);
    await crearRetoParaUsuario(idUsuario, reto.nombre, reto.descripcion, reto.puntos, DIAS_PLAZO);
  }
  for (let i = 0; i < 2; i++) {
    const reto = sacarRetoAlAzar(listas.dificiles);
    await crearRetoParaUsuario(idUsuario, reto.nombre, reto.descripcion, reto.puntos, DIAS_PLAZO);
  }

  return buscarRetosActivos(idUsuario);
};


export const getUserPoints = async (idUsuario: number): Promise<number> => {
  return buscarPuntosUsuario(idUsuario);
};

export const getSwapsRestantes = async (idUsuario: number): Promise<number> => {
  const usados = await contarCambiosDeHoy(idUsuario);
  const restantes = CAMBIOS_POR_DIA - usados;
  if (restantes < 0) {
    return 0;
  }
  return restantes;
};

export const getChallengesByUserId = async (idUsuario: number): Promise<Challenge[]> => {
  const activos = await buscarRetosActivos(idUsuario);
  if (activos.length > 0) {
    return activos;
  }
  return generarCincoRetos(idUsuario);
};

//completa un reto y suma los puntos
export const completeChallenge = async (idReto: number, idUsuario: number): Promise<Challenge[] | null> => {
  const puntosGanados = await marcarCompletado(idReto, idUsuario);
  if (puntosGanados === null) {
    return null; 
  }

  await sumarPuntosAlUsuario(idUsuario, puntosGanados);

  //generar 5 nuevos retos sino se acabaron
  const pendientes = await contarPendientes(idUsuario);
  if (pendientes === 0) {
    await vencerRetosDelUsuario(idUsuario);
    return generarCincoRetos(idUsuario);
  }

  return buscarRetosActivos(idUsuario);
};

//cambia un reto por otro de la misma dificultad
export const swapChallenge = async (idReto: number, idUsuario: number): Promise<Challenge[] | null> => {
  const puntosDelReto = await marcarAbandonado(idReto, idUsuario);
  if (puntosDelReto === null) {
    return null;
  }

  const rutinas = await buscarRutinasDelUsuario(idUsuario);
  const listas = armarListasDeRetos(rutinas);

  let lista: RetoNuevo[];
  if (puntosDelReto >= PUNTOS_DIFICIL) {
    lista = listas.dificiles;
  } else {
    lista = listas.faciles;
  }

  const activos = await buscarRetosActivos(idUsuario);
  const sinRepetidos: RetoNuevo[] = [];
  for (const candidato of lista) {
    let yaLoTiene = false;
    for (const activo of activos) {
      if (activo.nombre === candidato.nombre) {
        yaLoTiene = true;
      }
    }
    if (!yaLoTiene) {
      sinRepetidos.push(candidato);
    }
  }

  let nuevo: RetoNuevo;
  if (sinRepetidos.length > 0) {
    nuevo = sacarRetoAlAzar(sinRepetidos);
  } else {
    nuevo = sacarRetoAlAzar(lista);
  }

  await crearRetoParaUsuario(idUsuario, nuevo.nombre, nuevo.descripcion, nuevo.puntos, DIAS_PLAZO);
  return buscarRetosActivos(idUsuario);
};