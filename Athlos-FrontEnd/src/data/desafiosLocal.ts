export interface Desafio {
  iddesafio: number;
  nombre: string;
  descripcion: string;
  puntos: number;
  fechaFin: string;
  completado: boolean;
}

export interface RespuestaDesafios {
  desafios: Desafio[];
  puntosTotales: number;
  cambiosRestantes: number;
}

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("athlos_token") || ""}`,
});

const readResponse = async (response: Response): Promise<RespuestaDesafios> => {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Error consultando los desafíos.");
  return {
    desafios: data.data.challenges,
    puntosTotales: data.data.puntosTotales,
    cambiosRestantes: data.data.cambiosRestantes,
  };
};

export const obtenerDesafios = async (): Promise<RespuestaDesafios> => {
  const response = await fetch(`${URL_BACKEND}/api/challenges`, { headers: authHeaders() });
  return readResponse(response);
};

export const completarDesafio = async (id: number): Promise<RespuestaDesafios> => {
  const response = await fetch(`${URL_BACKEND}/api/challenges/${id}/complete`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return readResponse(response);
};

export const cambiarDesafio = async (id: number): Promise<RespuestaDesafios> => {
  const response = await fetch(`${URL_BACKEND}/api/challenges/${id}/swap`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return readResponse(response);
};