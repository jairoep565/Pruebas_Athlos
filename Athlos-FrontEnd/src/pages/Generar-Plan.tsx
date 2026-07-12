import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const pasos = ["Analizando tu perfil", "Seleccionando ejercicios", "Organizando series y repeticiones", "Preparando tu plan"];

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const GenerarPlan = () => {
  const navigate = useNavigate();
  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [retryAfter, setRetryAfter] = useState(0);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => setRetryAfter((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter > 0]);

  useEffect(() => {
    if (!generando) return;
    let activo = true;
    const intervalo = window.setInterval(() => setPasoActual((actual) => Math.min(actual + 1, pasos.length - 1)), 1100);

    const generar = async () => {
      try {
        setError("");
        setRetryAfter(0);
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
                entorno: user.identorno === 3 ? "gimnasio" : user.identorno === 2 ? "aire libre" : "casa",
              };
            }
          } catch {
            perfil = {};
          }
        }

        const response = await fetch(`${URL_BACKEND}/api/plans/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ perfil, diasEntrenamiento: diasSeleccionados }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          if (response.status === 429) setRetryAfter(Number(data.retryAfterSeconds) || 60);
          throw new Error(data.message || "No se pudo generar el plan.");
        }
        if (!activo) return;

        navigate(`/MisPlanes/${data.data.plan.idplan}`, { replace: true });
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
  }, [navigate, intento, generando]);

  const alternarDia = (dia: string) => {
    setDiasSeleccionados((actuales) =>
      actuales.includes(dia) ? actuales.filter((item) => item !== dia) : [...actuales, dia]
    );
  };

  if (!generando) {
    return (
      <div className="page-container plan-page">
        <div className="glass-card plan-shell text-center">
          <span className="plan-eyebrow">PLAN PERSONALIZADO</span>
          <h2 className="fw-bold text-white mt-2">¿Qué días vas a entrenar?</h2>
          <p className="text-muted-glass mb-4">Selecciona los días de la semana que formarán parte de tu plan.</p>
          <div className="training-days-grid mb-4">
            {diasSemana.map((dia) => {
              const seleccionado = diasSeleccionados.includes(dia);
              return (
                <button
                  type="button"
                  key={dia}
                  className={`training-day-button ${seleccionado ? "training-day-button-selected" : ""}`}
                  aria-pressed={seleccionado}
                  onClick={() => alternarDia(dia)}
                >
                  {dia}
                </button>
              );
            })}
          </div>
          <button
            className="btn glass-btn-primary w-100"
            disabled={diasSeleccionados.length === 0}
            onClick={() => setGenerando(true)}
          >
            Generar plan ({diasSeleccionados.length} {diasSeleccionados.length === 1 ? "día" : "días"})
          </button>
          <button className="btn btn-link text-muted-glass mt-2" onClick={() => navigate("/Menu")}>Volver al menú</button>
        </div>
      </div>
    );
  }

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
            <button
              className="btn glass-btn-primary w-100"
              disabled={retryAfter > 0}
              onClick={() => { setPasoActual(0); setIntento((value) => value + 1); }}
            >
              {retryAfter > 0 ? `Intenta nuevamente en ${retryAfter}s` : "Intentar nuevamente"}
            </button>
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
