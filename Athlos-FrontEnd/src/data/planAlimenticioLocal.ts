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

export interface PlanAlimenticio {
  idplanalimenticio: number;
  idusuario: number;
  contenido: PlanAlimenticioContent;
  fechageneracion: string;
}

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("athlos_token") || ""}`,
});

const readResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Error consultando el plan alimenticio.");
  return data.data as T;
};

export const obtenerPlanAlimenticio = async (): Promise<PlanAlimenticio | null> => {
  const response = await fetch(`${URL_BACKEND}/api/plan-alimenticio`, { headers: authHeaders() });
  const data = await readResponse<{ plan: PlanAlimenticio | null }>(response);
  return data.plan;
};

export const generarPlanAlimenticio = async (): Promise<PlanAlimenticio> => {
  const token = localStorage.getItem("athlos_token");
  const response = await fetch(`${URL_BACKEND}/api/plan-alimenticio/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const error: any = new Error(data.message || "No se pudo generar el plan alimenticio.");
    if (response.status === 429) error.retryAfterSeconds = Number(data.retryAfterSeconds) || 60;
    throw error;
  }
  return data.data.plan;
};

export const eliminarPlanAlimenticio = async (): Promise<void> => {
  const response = await fetch(`${URL_BACKEND}/api/plan-alimenticio`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "No se pudo eliminar el plan alimenticio.");
};
