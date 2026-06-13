import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerPlanes, type PlanEntrenamiento } from "../data/planesLocal";

const MisPlanes = () => {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState<PlanEntrenamiento[]>([]);

  useEffect(() => setPlanes(obtenerPlanes()), []);

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
          <div>
            <h2 className="fw-bold page-title mb-0">Mis Planes</h2>
            <p className="text-muted-glass mb-0">Tus entrenamientos generados</p>
          </div>
        </div>

        {planes.length === 0 ? (
          <div className="glass-card text-center">
            <h4 className="text-white">Todavía no tienes planes</h4>
            <p className="text-muted-glass">Genera tu primer entrenamiento personalizado.</p>
            <button className="btn glass-btn-primary" onClick={() => navigate("/GenerarPlan")}>Generar Plan</button>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {planes.map((plan) => (
              <button key={plan.id} className="plan-list-card" onClick={() => navigate(`/MisPlanes/${plan.id}`)}>
                <div className="d-flex justify-content-between gap-3">
                  <div>
                    <span className="plan-eyebrow">{new Date(plan.fechaCreacion).toLocaleDateString("es-PE")}</span>
                    <h4 className="text-white mt-2 mb-1">{plan.nombre}</h4>
                    <p className="text-muted-glass mb-3">{plan.descripcion}</p>
                    <div className="d-flex flex-wrap gap-2">
                      <span className="badge badge-glass">{plan.duracionSemanas} semanas</span>
                      <span className="badge badge-glass">{plan.diasPorSemana} días/semana</span>
                      <span className="badge badge-glass">{plan.ejercicios.length} ejercicios</span>
                    </div>
                  </div>
                  <span className="plan-arrow">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisPlanes;
