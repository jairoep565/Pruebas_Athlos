export interface EjercicioPlan {
  id: string;
  nombre: string;
  tipo: string;
  series: number;
  repeticiones: number;
  descansoSegundos: number;
  instrucciones: string;
}

export interface PlanEntrenamiento {
  id: string;
  nombre: string;
  descripcion: string;
  fechaCreacion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  ejercicios: EjercicioPlan[];
}

const STORAGE_KEY = "athlos_planes_locales";

export const obtenerPlanes = (): PlanEntrenamiento[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as PlanEntrenamiento[];
  } catch {
    return [];
  }
};

export const obtenerPlan = (id: string): PlanEntrenamiento | undefined =>
  obtenerPlanes().find((plan) => plan.id === id);

export const guardarPlan = (generated: Omit<PlanEntrenamiento, "id" | "fechaCreacion">): PlanEntrenamiento => {
  const planes = obtenerPlanes();
  const plan: PlanEntrenamiento = {
    ...generated,
    id: `plan-${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    ejercicios: generated.ejercicios.map((ejercicio, index) => ({
      ...ejercicio,
      id: `${ejercicio.id || 'ejercicio'}-${Date.now()}-${index}`,
    })),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify([plan, ...planes]));
  return plan;
};
