export interface PlanResumen {
  idplan: number;
  nombre: string;
  fechaCreacion: string;
  duracionSemanas: number;
  diasPorSemana: number;
  totalEjercicios: number;
}

export interface EjercicioPlan {
  idejercicio: number;
  nombre: string;
  descripcion: string;
  series: number;
  repeticiones: number;
}

export interface RutinaPlan {
  idrutina: number;
  nombre: string;
  duracion: number;
  estado: string;
  ejercicios: EjercicioPlan[];
}

export interface PlanEntrenamiento extends PlanResumen {
  rutinas: RutinaPlan[];
}

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("athlos_token") || ""}`,
});

const readResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Error consultando los planes.");
  return data.data as T;
};

export const obtenerPlanes = async (): Promise<PlanResumen[]> => {
  const response = await fetch(`${URL_BACKEND}/api/plans`, { headers: authHeaders() });
  const data = await readResponse<{ plans: PlanResumen[] }>(response);
  return data.plans;
};

export const obtenerPlan = async (id: string): Promise<PlanEntrenamiento> => {
  const response = await fetch(`${URL_BACKEND}/api/plans/${id}`, { headers: authHeaders() });
  const data = await readResponse<{ plan: PlanEntrenamiento }>(response);
  return data.plan;
};

export const eliminarPlanes = async (planIds: number[]): Promise<number[]> => {
  const response = await fetch(`${URL_BACKEND}/api/plans`, {
    method: "DELETE",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ planIds }),
  });
  const data = await readResponse<{ deletedPlanIds: number[] }>(response);
  return data.deletedPlanIds;
};
