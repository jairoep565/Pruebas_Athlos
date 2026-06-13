import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { guardarPlan, type PlanEntrenamiento } from "../data/planesLocal";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const pasos = ["Analizando tu perfil", "Seleccionando ejercicios", "Organizando series y repeticiones", "Preparando tu plan"];

const GenerarPlan = () => {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const intervalo = window.setInterval(() => setPasoActual((actual) => Math.min(actual + 1, pasos.length - 1)), 1100);

    const generar = async () => {
      try {
        setError("");
        const token = localStorage.getItem("athlos_token");
        let perfil = {};

        if (token) {
          try {
            const profileResponse = await fetch(`${URL_BACKEND}/api/user/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileResponse.json();
            if (profileData.success) {
              const user = profileData.data;
              perfil = {
                nombre: user.nombre,
                peso: Number(user.peso) || undefined,
                talla: Number(user.talla) || undefined,
                edad: Number(user.edad) || undefined,
                entorno: user.identorno === 2 ? "gimnasio" : user.identorno === 3 ? "aire libre" : "casa",
              };
            }
          } catch {
            perfil = {};
          }
        }

        const response = await fetch(`${URL_BACKEND}/api/plans/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perfil }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "No se pudo generar el plan.");
        if (!activo) return;

        const plan = guardarPlan(data.data.plan as Omit<PlanEntrenamiento, "id" | "fechaCreacion">);
        navigate(`/MisPlanes/${plan.id}`, { replace: true });
      } catch (cause) {
        if (activo) setError(cause instanceof Error ? cause.message : "No se pudo generar el plan.");
      } finally {
        window.clearInterval(intervalo);
      }
    };

    generar();

    return () => {
      window.clearInterval(intervalo);
      activo = false;
    };
  }, [navigate, intento]);

  return (
    <div className="page-container plan-page">
      <div className="glass-card plan-shell text-center">
        {!error && <div className="plan-loader mx-auto mb-4" aria-label="Generando plan" />}
        <span className="plan-eyebrow">ATHLOS AI</span>
        <h2 className="fw-bold text-white mt-2">{error ? "No pudimos generar el plan" : "Creando tu plan"}</h2>
        <p className="text-muted-glass mb-4">Estamos usando tus datos para preparar un entrenamiento personalizado.</p>
        {error ? (
          <>
            <div className="alert-glass-error mb-3">{error}</div>
            <button className="btn glass-btn-primary w-100" onClick={() => { setPasoActual(0); setIntento((value) => value + 1); }}>Intentar nuevamente</button>
            <button className="btn btn-link text-muted-glass mt-2" onClick={() => navigate("/Menu")}>Volver al menú</button>
          </>
        ) : (
          <>
            <div className="plan-progress mb-3">
              <div className="plan-progress-bar" style={{ width: `${((pasoActual + 1) / pasos.length) * 100}%` }} />
            </div>
            <p className="text-teal fw-semibold mb-0">{pasos[pasoActual]}...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GenerarPlan;
