import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eliminarPlanes, obtenerPlanes, type PlanResumen } from "../data/planesLocal";

const MisPlanes = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<PlanResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    obtenerPlanes()
      .then(setPlanes)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar los planes."))
      .finally(() => setLoading(false));
  }, []);

  const cancelarSeleccion = () => {
    setSeleccionando(false);
    setSeleccionados([]);
    setConfirmando(false);
  };

  const alternarPlan = (planId: number) => {
    setSeleccionados((actuales) =>
      actuales.includes(planId)
        ? actuales.filter((id) => id !== planId)
        : [...actuales, planId]
    );
  };

  const confirmarEliminacion = async () => {
    setEliminando(true);
    setError("");
    try {
      const eliminados = await eliminarPlanes(seleccionados);
      setPlanes((actuales) => actuales.filter((plan) => !eliminados.includes(plan.idplan)));
      cancelarSeleccion();
    } catch (cause) {
      setConfirmando(false);
      setError(cause instanceof Error ? cause.message : "No se pudieron eliminar los planes.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
          <div className="flex-grow-1">
            <h2 className="fw-bold page-title mb-0">Mis Planes</h2>
            <p className="text-muted-glass mb-0">
              {seleccionando ? `${seleccionados.length} seleccionados` : "Guardados en PostgreSQL"}
            </p>
          </div>
          {!loading && planes.length > 0 && !seleccionando && (
            <button className="btn plan-delete-button" onClick={() => setSeleccionando(true)}>Eliminar plan</button>
          )}
        </div>

        {seleccionando && (
          <div className="plan-selection-actions mb-3">
            <button className="btn btn-cancel" onClick={cancelarSeleccion}>Cancelar</button>
            <button
              className="btn plan-delete-button"
              disabled={seleccionados.length === 0}
              onClick={() => setConfirmando(true)}
            >
              Eliminar ({seleccionados.length})
            </button>
          </div>
        )}

        {loading && <div className="glass-card text-center text-muted-glass">Cargando planes...</div>}
        {error && <div className="alert-glass-error">{error}</div>}
        {!loading && !error && planes.length === 0 && (
          <div className="glass-card text-center">
            <h4 className="text-white">Todavía no tienes planes</h4>
            <button className="btn glass-btn-primary mt-2" onClick={() => navigate("/GenerarPlan")}>Generar Plan</button>
          </div>
        )}
        {!loading && planes.length > 0 && (
          <div className="d-flex flex-column gap-3">
            {planes.map((plan) => {
              const estaSeleccionado = seleccionados.includes(plan.idplan);
              return (
                <button
                  key={plan.idplan}
                  className={`plan-list-card ${estaSeleccionado ? "plan-list-card-selected" : ""}`}
                  onClick={() => seleccionando ? alternarPlan(plan.idplan) : navigate(`/MisPlanes/${plan.idplan}`)}
                  aria-pressed={seleccionando ? estaSeleccionado : undefined}
                >
                  <div className="d-flex justify-content-between gap-3">
                    <div>
                      <span className="plan-eyebrow">{new Date(plan.fechaCreacion).toLocaleDateString("es-PE")}</span>
                      <h4 className="text-white mt-2 mb-3">{plan.nombre}</h4>
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge badge-glass">{plan.duracionSemanas} semanas</span>
                        <span className="badge badge-glass">{plan.diasPorSemana} rutinas</span>
                        <span className="badge badge-glass">{plan.totalEjercicios} ejercicios</span>
                      </div>
                    </div>
                    {seleccionando ? (
                      <span className={`plan-selection-box ${estaSeleccionado ? "plan-selection-box-active" : ""}`} aria-hidden="true">
                        {estaSeleccionado ? "✓" : ""}
                      </span>
                    ) : <span className="plan-arrow">›</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {confirmando && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-plan-title">
          <div className="glass-card plan-delete-modal text-center">
            <h3 id="delete-plan-title" className="text-white">
              ¿Eliminar {seleccionados.length === 1 ? "este plan" : "estos planes"}?
            </h3>
            <p className="text-muted-glass mb-4">
              Se borrarán también sus rutinas y ejercicios guardados. Esta acción no se puede deshacer.
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-cancel flex-fill" disabled={eliminando} onClick={() => setConfirmando(false)}>Cancelar</button>
              <button className="btn plan-delete-confirm flex-fill" disabled={eliminando} onClick={confirmarEliminacion}>
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPlanes;
