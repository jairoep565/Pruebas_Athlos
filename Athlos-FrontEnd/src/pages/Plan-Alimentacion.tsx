import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  obtenerPlanAlimenticio,
  generarPlanAlimenticio,
  eliminarPlanAlimenticio,
  type PlanAlimenticio,
  type DiaPlan,
} from "../data/planAlimenticioLocal";

const pasosGeneracion = [
  "Analizando tu perfil físico",
  "Calculando tus macronutrientes",
  "Diseñando comidas balanceadas",
  "Preparando tu plan semanal",
];

const PlanAlimentacion = () => {
  const navigate = useNavigate();

  // ── Estado principal ──
  const [plan, setPlan] = useState<PlanAlimenticio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Estado de generación ──
  const [generando, setGenerando] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [retryAfter, setRetryAfter] = useState(0);

  // ── Estado de UI ──
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [comidaAbierta, setComidaAbierta] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoRegenerar, setConfirmandoRegenerar] = useState(false);

  // ── Timer de retry ──
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter > 0]);

  // ── Cargar plan existente al montar ──
  useEffect(() => {
    obtenerPlanAlimenticio()
      .then((data) => {
        setPlan(data);
        if (data && data.contenido.dias.length > 0) {
          setDiaAbierto(data.contenido.dias[0].dia);
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el plan."))
      .finally(() => setLoading(false));
  }, []);

  // ── Generar plan ──
  const handleGenerar = async () => {
    setGenerando(true);
    setError("");
    setRetryAfter(0);
    setPasoActual(0);

    const intervalo = window.setInterval(
      () => setPasoActual((actual) => Math.min(actual + 1, pasosGeneracion.length - 1)),
      1100
    );

    try {
      const nuevoPlan = await generarPlanAlimenticio();
      setPlan(nuevoPlan);
      if (nuevoPlan.contenido.dias.length > 0) {
        setDiaAbierto(nuevoPlan.contenido.dias[0].dia);
      }
    } catch (cause: any) {
      if (cause?.retryAfterSeconds) setRetryAfter(cause.retryAfterSeconds);
      setError(cause instanceof Error ? cause.message : "No se pudo generar el plan.");
    } finally {
      window.clearInterval(intervalo);
      setGenerando(false);
    }
  };

  // ── Eliminar plan ──
  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await eliminarPlanAlimenticio();
      setPlan(null);
      setConfirmandoEliminar(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el plan.");
      setConfirmandoEliminar(false);
    } finally {
      setEliminando(false);
    }
  };

  // ── Regenerar plan ──
  const handleRegenerar = () => {
    setConfirmandoRegenerar(false);
    setPlan(null);
    handleGenerar();
  };

  // ══════════════════════════════════════════════════════════
  //  Render: Cargando
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="page-container plan-page">
        <div className="glass-card plan-shell text-center text-muted-glass">
          Cargando plan alimenticio...
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  Render: Generando con IA
  // ══════════════════════════════════════════════════════════
  if (generando) {
    return (
      <div className="page-container plan-page">
        <div className="glass-card plan-shell text-center">
          <div className="plan-loader mx-auto mb-4" aria-label="Generando plan alimenticio" />
          <span className="plan-eyebrow">ATHLOS AI · NUTRICIÓN</span>
          <h2 className="fw-bold text-white mt-2">Creando tu plan alimenticio</h2>
          <p className="text-muted-glass mb-4">
            Estamos calculando tus necesidades nutricionales según tu peso y estatura.
          </p>
          <div className="plan-progress mb-3">
            <div
              className="plan-progress-bar"
              style={{ width: `${((pasoActual + 1) / pasosGeneracion.length) * 100}%` }}
            />
          </div>
          <p className="text-teal fw-semibold mb-0">{pasosGeneracion[pasoActual]}...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  Render: Sin plan — mostrar botón de generar
  // ══════════════════════════════════════════════════════════
  if (!plan) {
    return (
      <div className="page-container plan-page">
        <div className="plan-shell w-100">
          <div className="d-flex align-items-center gap-3 mb-4">
            <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
            <div>
              <span className="plan-eyebrow">NUTRICIÓN IA</span>
              <h2 className="fw-bold page-title mb-0">Plan de Alimentación</h2>
            </div>
          </div>

          <div className="glass-card text-center">
            <div className="nutricion-icon-big mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#74C3D2" viewBox="0 0 16 16">
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 3.5V14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3.5z"/>
                <path d="M8 7a.5.5 0 0 1 .5.5V9H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V10H6a.5.5 0 0 1 0-1h1.5V7.5A.5.5 0 0 1 8 7"/>
              </svg>
            </div>
            <h3 className="text-white mb-2">Genera tu plan personalizado</h3>
            <p className="text-muted-glass mb-4" style={{ fontSize: "0.88rem", maxWidth: "320px", margin: "0 auto 1rem" }}>
              Usaremos tu peso, estatura y edad para calcular tus necesidades de proteínas, carbohidratos y grasas.
            </p>

            {error && <div className="alert-glass-error mb-3">{error}</div>}

            <button
              className="btn glass-btn-primary w-100"
              disabled={retryAfter > 0}
              onClick={handleGenerar}
            >
              {retryAfter > 0 ? `Intenta en ${retryAfter}s` : "🍽️ Generar Plan Alimenticio"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  Render: Plan existente — mostrar contenido
  // ══════════════════════════════════════════════════════════
  const { resumen, dias } = plan.contenido;

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
          <div className="flex-grow-1">
            <span className="plan-eyebrow">NUTRICIÓN IA</span>
            <h2 className="fw-bold page-title mb-0">Plan de Alimentación</h2>
            <p className="text-muted-glass mb-0" style={{ fontSize: "0.78rem" }}>
              Generado el {new Date(plan.fechageneracion).toLocaleDateString("es-PE")}
            </p>
          </div>
        </div>

        {error && <div className="alert-glass-error mb-3">{error}</div>}

        {/* Resumen de macros */}
        <div className="nutricion-macros-grid mb-4">
          <div className="nutricion-macro-card nutricion-macro-calorias">
            <span className="nutricion-macro-value">{resumen.caloriasDiarias}</span>
            <span className="nutricion-macro-label">kcal/día</span>
          </div>
          <div className="nutricion-macro-card nutricion-macro-proteinas">
            <span className="nutricion-macro-value">{resumen.proteinasGramos}g</span>
            <span className="nutricion-macro-label">Proteínas</span>
          </div>
          <div className="nutricion-macro-card nutricion-macro-carbos">
            <span className="nutricion-macro-value">{resumen.carbohidratosGramos}g</span>
            <span className="nutricion-macro-label">Carbos</span>
          </div>
          <div className="nutricion-macro-card nutricion-macro-grasas">
            <span className="nutricion-macro-value">{resumen.grasasGramos}g</span>
            <span className="nutricion-macro-label">Grasas</span>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="d-flex flex-column gap-3">
          {dias.map((dia: DiaPlan) => {
            const abierto = diaAbierto === dia.dia;
            return (
              <div key={dia.dia} className="glass-card">
                <button
                  className="w-100 border-0 bg-transparent text-start p-0"
                  onClick={() => { setDiaAbierto(abierto ? null : dia.dia); setComidaAbierta(null); }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="text-white mb-1">{dia.dia}</h4>
                      <p className="text-muted-glass mb-0" style={{ fontSize: "0.82rem" }}>
                        {dia.comidas.length} comidas
                      </p>
                    </div>
                    <span className="exercise-toggle">{abierto ? "−" : "+"}</span>
                  </div>
                </button>

                {abierto && (
                  <div className="nutricion-comidas-grid mt-3">
                    {dia.comidas.map((comida, cIdx) => {
                      const comidaKey = `${dia.dia}-${cIdx}`;
                      const comidaVisible = comidaAbierta === comidaKey;
                      return (
                        <button
                          key={comidaKey}
                          className={`nutricion-comida-card ${comidaVisible ? "nutricion-comida-card-open" : ""}`}
                          onClick={() => setComidaAbierta(comidaVisible ? null : comidaKey)}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <span className="nutricion-comida-tipo">{comida.tipo}</span>
                              <h5 className="text-white mb-0 mt-1" style={{ fontSize: "0.95rem" }}>{comida.nombre}</h5>
                            </div>
                            <span className="exercise-toggle" style={{ fontSize: "1.3rem" }}>
                              {comidaVisible ? "−" : "+"}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mb-0">
                            <span className="badge badge-glass">{comida.calorias} kcal</span>
                            <span className="badge badge-glass nutricion-badge-prot">P: {comida.proteinas}g</span>
                            <span className="badge badge-glass nutricion-badge-carb">C: {comida.carbohidratos}g</span>
                            <span className="badge badge-glass nutricion-badge-gras">G: {comida.grasas}g</span>
                          </div>

                          {comidaVisible && (
                            <div className="nutricion-ingredientes mt-3 pt-3">
                              <p className="text-muted-glass mb-2" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                                INGREDIENTES
                              </p>
                              <ul className="nutricion-ingredientes-list">
                                {comida.ingredientes.map((ing, iIdx) => (
                                  <li key={iIdx}>{ing}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Acciones: Regenerar / Eliminar */}
        <div className="d-flex gap-2 mt-4">
          <button
            className="btn glass-btn-primary flex-fill"
            onClick={() => setConfirmandoRegenerar(true)}
          >
            🔄 Regenerar plan
          </button>
          <button
            className="btn plan-delete-button flex-fill"
            onClick={() => setConfirmandoEliminar(true)}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Modal confirmar eliminación */}
      {confirmandoEliminar && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="glass-card plan-delete-modal text-center">
            <h3 className="text-white">¿Eliminar tu plan alimenticio?</h3>
            <p className="text-muted-glass mb-4">
              Se eliminará tu plan de alimentación actual. Podrás generar uno nuevo en cualquier momento.
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-cancel flex-fill" disabled={eliminando} onClick={() => setConfirmandoEliminar(false)}>
                Cancelar
              </button>
              <button className="btn plan-delete-confirm flex-fill" disabled={eliminando} onClick={handleEliminar}>
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar regeneración */}
      {confirmandoRegenerar && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="glass-card plan-delete-modal text-center">
            <h3 className="text-white">¿Regenerar tu plan alimenticio?</h3>
            <p className="text-muted-glass mb-4">
              Se reemplazará tu plan actual con uno nuevo generado por IA.
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-cancel flex-fill" onClick={() => setConfirmandoRegenerar(false)}>
                Cancelar
              </button>
              <button className="btn glass-btn-primary flex-fill" onClick={handleRegenerar}>
                Sí, regenerar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanAlimentacion;
