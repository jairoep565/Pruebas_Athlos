import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obtenerPlan } from "../data/planesLocal";

const DetallePlan = () => {
  const navigate = useNavigate();
  const { planId = "" } = useParams();
  const plan = obtenerPlan(planId);
  const [ejercicioAbierto, setEjercicioAbierto] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="page-container plan-page">
        <div className="glass-card plan-shell text-center">
          <h3 className="text-white">Plan no encontrado</h3>
          <button className="btn glass-btn-primary mt-3" onClick={() => navigate("/MisPlanes")}>Volver a Mis Planes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/MisPlanes")} title="Volver a Mis Planes">←</button>
          <div>
            <span className="plan-eyebrow">PLAN PERSONALIZADO</span>
            <h2 className="fw-bold page-title mb-0">{plan.nombre}</h2>
          </div>
        </div>

        <div className="glass-card mb-4">
          <p className="text-muted-glass">{plan.descripcion}</p>
          <div className="d-flex flex-wrap gap-2">
            <span className="badge badge-glass">{plan.duracionSemanas} semanas</span>
            <span className="badge badge-glass">{plan.diasPorSemana} días por semana</span>
            <span className="badge badge-glass">{plan.ejercicios.length} ejercicios</span>
          </div>
        </div>

        <h5 className="text-white fw-bold mb-3">Ejercicios del plan</h5>
        <div className="plan-exercise-grid">
          {plan.ejercicios.map((ejercicio) => {
            const abierto = ejercicioAbierto === ejercicio.id;
            return (
              <button key={ejercicio.id} className={`exercise-card ${abierto ? "exercise-card-open" : ""}`} onClick={() => setEjercicioAbierto(abierto ? null : ejercicio.id)}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="text-start">
                    <span className="plan-eyebrow">{ejercicio.tipo}</span>
                    <h5 className="text-white mt-2 mb-2">{ejercicio.nombre}</h5>
                  </div>
                  <span className="exercise-toggle">{abierto ? "−" : "+"}</span>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <span className="badge badge-glass">{ejercicio.series} series</span>
                  <span className="badge badge-glass">{ejercicio.repeticiones} repeticiones</span>
                </div>
                {abierto && (
                  <div className="exercise-details text-start mt-3 pt-3">
                    <p className="mb-2"><strong>Descanso:</strong> {ejercicio.descansoSegundos} segundos</p>
                    <p className="mb-0"><strong>Indicaciones:</strong> {ejercicio.instrucciones}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DetallePlan;
