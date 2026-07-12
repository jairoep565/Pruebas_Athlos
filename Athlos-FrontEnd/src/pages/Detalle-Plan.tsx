import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obtenerPlan, type EjercicioPlan, type PlanEntrenamiento } from "../data/planesLocal";

const obtenerUrlVideo = (link: string): string | null => {
  if (!link.trim()) return null;

  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      videoId = url.searchParams.get("v") || "";
      if (!videoId) {
        const partes = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(partes[0])) videoId = partes[1] || "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
      : null;
  } catch {
    return null;
  }
};

const DetallePlan = () => {
  const navigate = useNavigate();
  const { planId = "" } = useParams();
  const [plan, setPlan] = useState<PlanEntrenamiento | null>(null);
  const [rutinaAbierta, setRutinaAbierta] = useState<number | null>(null);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<EjercicioPlan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerPlan(planId)
      .then((data) => {
        setPlan(data);
        setRutinaAbierta(data.rutinas[0]?.idrutina || null);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el plan."));
  }, [planId]);

  useEffect(() => {
    if (!ejercicioSeleccionado) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEjercicioSeleccionado(null);
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [ejercicioSeleccionado]);

  if (error) {
    return <div className="page-container plan-page"><div className="glass-card plan-shell text-center"><h3 className="text-white">{error}</h3><button className="btn glass-btn-primary mt-3" onClick={() => navigate("/MisPlanes")}>Volver</button></div></div>;
  }
  if (!plan) {
    return <div className="page-container plan-page"><div className="glass-card plan-shell text-center text-muted-glass">Cargando plan...</div></div>;
  }

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/MisPlanes")}>←</button>
          <div><span className="plan-eyebrow">PLAN PERSONALIZADO</span><h2 className="fw-bold page-title mb-0">{plan.nombre}</h2></div>
        </div>
        <div className="glass-card mb-4">
          <div className="d-flex flex-wrap gap-2">
            <span className="badge badge-glass">{plan.duracionSemanas} semanas</span>
            <span className="badge badge-glass">{plan.diasPorSemana} rutinas</span>
            <span className="badge badge-glass">{plan.totalEjercicios} ejercicios</span>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {plan.rutinas.map((rutina) => {
            const abierta = rutinaAbierta === rutina.idrutina;
            return (
              <div key={rutina.idrutina} className="glass-card">
                <button className="w-100 border-0 bg-transparent text-start p-0" onClick={() => setRutinaAbierta(abierta ? null : rutina.idrutina)}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div><span className="plan-eyebrow">{rutina.estado}</span><h4 className="text-white mt-2 mb-1">{rutina.nombre}</h4><p className="text-muted-glass mb-0">{rutina.duracion} min · {rutina.ejercicios.length} ejercicios</p></div>
                    <span className="exercise-toggle">{abierta ? "−" : "+"}</span>
                  </div>
                </button>
                {abierta && (
                  <div className="plan-exercise-grid mt-3">
                    {rutina.ejercicios.map((ejercicio) => (
                      <button key={ejercicio.idejercicio} className="exercise-card" onClick={() => setEjercicioSeleccionado(ejercicio)}>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="text-white mb-2">{ejercicio.nombre}</h5>
                          <span className="exercise-video-icon" aria-hidden="true">▶</span>
                        </div>
                        <div className="d-flex gap-2"><span className="badge badge-glass">{ejercicio.series} series</span><span className="badge badge-glass">{ejercicio.repeticiones} repeticiones</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {ejercicioSeleccionado && (() => {
        const videoUrl = obtenerUrlVideo(ejercicioSeleccionado.link);
        return (
          <div className="modal-overlay exercise-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title" onClick={() => setEjercicioSeleccionado(null)}>
            <div className="glass-card exercise-video-modal" onClick={(event) => event.stopPropagation()}>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <span className="plan-eyebrow">GUÍA DEL EJERCICIO</span>
                  <h3 id="exercise-modal-title" className="text-white mt-2 mb-0">{ejercicioSeleccionado.nombre}</h3>
                </div>
                <button className="exercise-modal-close" type="button" aria-label="Cerrar" onClick={() => setEjercicioSeleccionado(null)}>×</button>
              </div>

              {videoUrl ? (
                <div className="exercise-video-frame mb-4">
                  <iframe
                    src={videoUrl}
                    title={`Video guía de ${ejercicioSeleccionado.nombre}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="exercise-video-unavailable mb-4">Este ejercicio todavía no tiene un video disponible.</div>
              )}

              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge badge-glass">{ejercicioSeleccionado.series} series</span>
                <span className="badge badge-glass">{ejercicioSeleccionado.repeticiones} repeticiones</span>
              </div>
              <p className="exercise-modal-description mb-0">{ejercicioSeleccionado.descripcion || "Sin descripción disponible."}</p>
              {ejercicioSeleccionado.link && (
                <a className="btn glass-btn-primary w-100 mt-4" href={ejercicioSeleccionado.link} target="_blank" rel="noreferrer">Ver en YouTube</a>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DetallePlan;
