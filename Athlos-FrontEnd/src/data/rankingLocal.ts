export interface Rango {
  rangoid: number;
  rango: string;
  experienciarango: number;
}

export interface ProgresoRango {
  experiencia: number;
  rango: Rango;
  subioDeRango: boolean;
  siguienteRango: Rango | null;
  xpParaSiguiente: number | null;
  porcentajeAlSiguiente: number;
}

export interface RankingEntry {
  idusuario: number;
  nombre: string;
  experiencia: number;
  rango: string;
  posicion: number;
}

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("athlos_token") || ""}`,
});

const readResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Error consultando el ranking.");
  return data.data as T;
};

export const obtenerMiRango = async (): Promise<ProgresoRango> => {
  const response = await fetch(`${URL_BACKEND}/api/ranking/me`, { headers: authHeaders() });
  return readResponse<ProgresoRango>(response);
};

export const obtenerTablaGeneral = async (): Promise<{ top: RankingEntry[]; miPosicion: number | null }> => {
  const response = await fetch(`${URL_BACKEND}/api/ranking/top`, { headers: authHeaders() });
  return readResponse(response);
};

export const buscarEnRanking = async (nombre: string): Promise<RankingEntry[]> => {
  const response = await fetch(
    `${URL_BACKEND}/api/ranking/buscar?nombre=${encodeURIComponent(nombre)}`,
    { headers: authHeaders() }
  );
  const data = await readResponse<{ resultados: RankingEntry[] }>(response);
  return data.resultados;
};