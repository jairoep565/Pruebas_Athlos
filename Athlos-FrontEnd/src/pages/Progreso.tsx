import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  obtenerMiRango,
  obtenerTablaGeneral,
  buscarEnRanking,
  type ProgresoRango,
  type RankingEntry,
} from "../data/rankingLocal";

const getMedalla = (posicion: number): string | null => {
  if (posicion === 1) return "🥇";
  if (posicion === 2) return "🥈";
  if (posicion === 3) return "🥉";
  return null;
};

const getClasePodio = (posicion: number): string => {
  if (posicion === 1) return "ranking-item--gold";
  if (posicion === 2) return "ranking-item--silver";
  if (posicion === 3) return "ranking-item--bronze";
  return "";
};

const RankingRow = ({ entry }: { entry: RankingEntry }) => {
  const medalla = getMedalla(entry.posicion);
  return (
    <div className={`ranking-item ${getClasePodio(entry.posicion)}`}>
      <div className="d-flex align-items-center gap-3">
        {medalla ? (
          <span className="ranking-medal-icon">{medalla}</span>
        ) : (
          <span className="ranking-posicion">#{entry.posicion}</span>
        )}
        <div className="text-start">
          <p className="ranking-nombre mb-0">{entry.nombre}</p>
          <span className="ranking-rango-label">{entry.rango}</span>
        </div>
      </div>
      <span className="ranking-xp">{entry.experiencia} XP</span>
    </div>
  );
};

const Progreso = () => {
  const navigate = useNavigate();

  // ── Estado principal ──
  const [progreso, setProgreso] = useState<ProgresoRango | null>(null);
  const [top, setTop] = useState<RankingEntry[]>([]);
  const [miPosicion, setMiPosicion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Estado de búsqueda ──
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<RankingEntry[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");

  useEffect(() => {
    Promise.all([obtenerMiRango(), obtenerTablaGeneral()])
      .then(([mio, tabla]) => {
        setProgreso(mio);
        setTop(tabla.top);
        setMiPosicion(tabla.miPosicion);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el progreso."))
      .finally(() => setLoading(false));
  }, []);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBusqueda("");

    const nombre = busqueda.trim();
    if (nombre.length < 2) {
      setErrorBusqueda("Escribe al menos 2 caracteres.");
      return;
    }

    setBuscando(true);
    try {
      const resultados = await buscarEnRanking(nombre);
      setResultadosBusqueda(resultados);
      if (resultados.length === 0) setErrorBusqueda("No se encontró ningún usuario con ese nombre.");
    } catch (cause) {
      setErrorBusqueda(cause instanceof Error ? cause.message : "No se pudo realizar la búsqueda.");
      setResultadosBusqueda(null);
    } finally {
      setBuscando(false);
    }
  };

  const handleLimpiarBusqueda = () => {
    setBusqueda("");
    setResultadosBusqueda(null);
    setErrorBusqueda("");
  };

  return (
    <div className="page-container plan-page">
      <div className="plan-shell w-100">
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al menú">←</button>
          <div>
            <span className="plan-eyebrow">PROGRESO</span>
            <h2 className="fw-bold page-title mb-0">Mi Rango</h2>
          </div>
        </div>

        {loading && <div className="glass-card text-center text-muted-glass">Cargando progreso...</div>}
        {error && <div className="alert-glass-error mb-4">{error}</div>}

        {/* Card de rango actual */}
        {progreso && (
          <div className="glass-card mb-4 text-center">
            <span className="plan-eyebrow">{progreso.rango.rango}</span>
            <h1 className="fw-bold text-white mt-2 mb-1">{progreso.experiencia} XP</h1>

            {progreso.siguienteRango ? (
              <>
                <p className="text-muted-glass mb-3">
                  {progreso.xpParaSiguiente} XP para llegar a {progreso.siguienteRango.rango}
                </p>
                <div className="plan-progress mb-2">
                  <div
                    className="plan-progress-bar"
                    style={{ width: `${progreso.porcentajeAlSiguiente}%` }}
                  />
                </div>
                <p className="text-muted-glass mb-0" style={{ fontSize: "0.75rem" }}>
                  {progreso.porcentajeAlSiguiente}% completado
                </p>
              </>
            ) : (
              <p className="text-teal fw-semibold mb-0">¡Rango máximo alcanzado! 🏆</p>
            )}
          </div>
        )}

        {/* Buscador */}
        {!loading && !error && (
          <div className="glass-card mb-4">
            <label className="form-label fw-semibold text-label mb-2 d-block text-start">
              Buscar en el ranking
            </label>
            <form onSubmit={handleBuscar} className="d-flex gap-2">
              <input
                type="text"
                className="form-control glass-input flex-grow-1"
                placeholder="Escribe un nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button type="submit" className="btn glass-btn-primary" disabled={buscando}>
                {buscando ? "..." : "Buscar"}
              </button>
              {resultadosBusqueda !== null && (
                <button type="button" className="btn btn-cancel" onClick={handleLimpiarBusqueda}>
                  ✕
                </button>
              )}
            </form>

            {errorBusqueda && (
              <div className="alert-glass-error mt-3">{errorBusqueda}</div>
            )}

            {resultadosBusqueda && resultadosBusqueda.length > 0 && (
              <div className="d-flex flex-column gap-2 mt-3">
                {resultadosBusqueda.map((entry) => (
                  <RankingRow key={entry.idusuario} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center mb-3 px-1">
        <h5 className="text-white mb-0">Top 10</h5>
        {miPosicion && (
            <span className="text-muted-glass" style={{ fontSize: "0.82rem" }}>
            {miPosicion <= 10 ? `Estás en el top 10 · Puesto #${miPosicion}` : `Tu puesto: #${miPosicion} · Búscate abajo`}
            </span>
        )}
        </div>
        {/* Tabla general / Leaderboard */}
        {!loading && !error && resultadosBusqueda === null && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3 px-1">
              <h5 className="text-white mb-0">Tabla General</h5>
              {miPosicion && (
                <span className="text-muted-glass" style={{ fontSize: "0.82rem" }}>
                  Tu puesto: #{miPosicion}
                </span>
              )}
            </div>

            {top.length === 0 ? (
              <div className="glass-card text-center text-muted-glass">
                Aún no hay usuarios en el ranking.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {top.map((entry) => (
                  <RankingRow key={entry.idusuario} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Progreso;