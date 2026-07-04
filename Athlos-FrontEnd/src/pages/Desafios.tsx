import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  cambiarDesafio,
  completarDesafio,
  obtenerDesafios,
  type Desafio,
  type RespuestaDesafios,
} from "../data/desafiosLocal";

const Desafios = () => {
  const navigate = useNavigate();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [puntosTotales, setPuntosTotales] = useState(0);
  const [cambiosRestantes, setCambiosRestantes] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const aplicar = ({ desafios, puntosTotales, cambiosRestantes }: RespuestaDesafios) => {
    setDesafios(desafios);
    setPuntosTotales(puntosTotales);
    setCambiosRestantes(cambiosRestantes);
  };

  useEffect(() => {
    obtenerDesafios()
      .then(aplicar)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar los desafíos."))
      .finally(() => setLoading(false));
  }, []);

  const diasRestantes = (fechaFin: string) => {
    const dias = Math.ceil((new Date(fechaFin).getTime() - Date.now()) / 86400000);
    return dias > 0 ? `${dias} días restantes` : "Finalizado";
  };

  const manejarCompletar = async (id: number) => {
    setError("");
    try {
      aplicar(await completarDesafio(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar el desafío.");
    }
  };

  const manejarCambiar = async (id: number) => {
    setError("");
    try {
      aplicar(await cambiarDesafio(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el desafío.");
    }
  };

  return (
    <div className="page-container">
      <div className="w-100" style={{ maxWidth: "420px", padding: "0 12px" }}>
        <div className="d-flex align-items-center gap-3 mb-2">
          <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
          <div className="flex-grow-1">
            <h2 className="fw-bold page-title mb-0">Mis Desafíos</h2>
            <p className="text-muted-glass mb-0" style={{ fontSize: "0.82rem" }}>Retos y metas de entrenamiento</p>
          </div>
        </div>

        {/* Puntos + cambios disponibles */}
        <div className="glass-card d-flex justify-content-between align-items-center mb-4" style={{ padding: "14px 18px" }}>
          <span className="fw-bold" style={{ color: "#74C3D2", fontSize: "1.4rem" }}>
            Puntos: {puntosTotales}
          </span>
          <span className="text-muted-glass" style={{ fontSize: "0.78rem" }}>
            Cambios hoy: {cambiosRestantes}/3
          </span>
        </div>

        {loading && <div className="glass-card text-center text-muted-glass">Cargando desafíos...</div>}
        {error && <div className="alert-glass-error">{error}</div>}
        {!loading && !error && desafios.length === 0 && (
          <div className="glass-card text-center text-muted-glass">
            Aún no tienes retos. Genera un plan primero y aquí aparecerán tus 5 desafíos de la semana.
          </div>
        )}

        <div className="d-flex flex-column gap-3">
          {desafios.map((d) => (
            <div key={d.iddesafio} className="glass-card" style={{ padding: "16px 18px", opacity: d.completado ? 0.65 : 1 }}>
              <div className="d-flex justify-content-between align-items-start mb-1">
                <div className="d-flex align-items-center gap-2">
                  <p className="fw-bold mb-0" style={{ color: "#ffffff", fontSize: "1rem" }}>{d.nombre}</p>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: d.puntos >= 15 ? "rgba(217,124,124,0.2)" : "rgba(124,217,146,0.15)",
                      color: d.puntos >= 15 ? "#D97C7C" : "#7CD992",
                      flexShrink: 0,
                    }}
                  >
                    {d.puntos >= 15 ? "Difícil" : "Fácil"}
                  </span>
                </div>
                <span className="fw-bold" style={{ color: "#74C3D2", fontSize: "0.9rem", flexShrink: 0 }}>+{d.puntos} pts</span>
              </div>
              <p className="mb-2" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" }}>{d.descripcion}</p>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted-glass" style={{ fontSize: "0.75rem" }}>
                  Finaliza: {new Date(d.fechaFin).toLocaleDateString("es-PE")} · {diasRestantes(d.fechaFin)}
                </span>
                {d.completado ? (
                  <span style={{ color: "#7CD992", fontSize: "0.8rem", fontWeight: 600 }}>✓ Completado</span>
                ) : (
                  <div className="d-flex gap-2">
                    {cambiosRestantes > 0 && (
                      <button
                        className="btn btn-cancel"
                        style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                        onClick={() => manejarCambiar(d.iddesafio)}
                        title="Cambiar por otro reto"
                      >
                        Cambiar
                      </button>
                    )}
                    <button
                      className="btn glass-btn-accent"
                      style={{ fontSize: "0.78rem", padding: "4px 14px" }}
                      onClick={() => manejarCompletar(d.iddesafio)}
                    >
                      Completar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Desafios;