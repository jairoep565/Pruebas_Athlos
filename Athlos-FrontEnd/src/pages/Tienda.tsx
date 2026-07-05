import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

interface Recompensa {
  idrecompensa: number;
  nombre: string;
  descripcion: string;
  costopuntos: number;
  tipo: string;
  imagen_url?: string;
  terminos?: string;
  limite_canjes: number;
}

interface HistorialCanje {
  idusuariorecompensa: number;
  codigocanje: string;
  fecha: string;
  idrecompensa: number;
  nombre: string;
  descripcion: string;
  costopuntos: number;
  tipo: string;
  imagen_url?: string;
  terminos?: string;
}

const Tienda = () => {
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState<number>(0);
  const [catalogo, setCatalogo] = useState<Recompensa[]>([]);
  const [history, setHistory] = useState<HistorialCanje[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);
  const [canjeando, setCanjeando] = useState(false);
  const [selectedRecompensa, setSelectedRecompensa] = useState<Recompensa | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "history">("catalog");
  const [successReward, setSuccessReward] = useState<{ nombre: string; code: string; costopuntos: number; terminos?: string } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      cargarHistorial();
    }
  }, [activeTab]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("athlos_token");
      
      // Obtener puntos
      const profileRes = await fetch(`${URL_BACKEND}/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      if (profileData.success) {
        setPuntos(profileData.data.puntos || 0);
      }

      // Obtener catálogo
      const catalogRes = await fetch(`${URL_BACKEND}/api/store/catalog`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (catalogRes.ok) {
        const catalogData = await catalogRes.json();
        setCatalogo(catalogData);
      }

      // Obtener historial de canjes para saber límites
      const historyRes = await fetch(`${URL_BACKEND}/api/store/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
    } catch (err) {
      setMensaje({ texto: "Error al cargar la tienda", tipo: "error" });
    }
    setLoading(false);
  };

  const cargarHistorial = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem("athlos_token");
      const res = await fetch(`${URL_BACKEND}/api/store/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const historyData = await res.json();
        setHistory(historyData);
      }
    } catch (err) {
      console.error("Error al cargar historial", err);
    }
    setLoadingHistory(false);
  };

  const handleCanjear = async (idrecompensa: number, costo: number) => {
    if (puntos < costo) {
      setMensaje({ texto: "Puntos insuficientes para realizar este canje.", tipo: "error" });
      setTimeout(() => setMensaje(null), 4000);
      setSelectedRecompensa(null);
      return;
    }

    setCanjeando(true);
    try {
      const token = localStorage.getItem("athlos_token");
      const idusuario = localStorage.getItem("athlos_idusuario");
      
      const res = await fetch(`${URL_BACKEND}/api/store/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ idusuario, idrecompensa })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessReward({
          nombre: selectedRecompensa?.nombre || "Recompensa",
          code: data.code,
          costopuntos: costo,
          terminos: selectedRecompensa?.terminos
        });
        setPuntos(prev => prev - costo); // Descontar localmente
        if (activeTab === "history") {
          cargarHistorial();
        }
      } else {
        setMensaje({ texto: data.error || "Error al canjear", tipo: "error" });
      }
    } catch (err) {
      setMensaje({ texto: "Error de conexión", tipo: "error" });
    }
    setCanjeando(false);
    setSelectedRecompensa(null);
    setTimeout(() => setMensaje(null), 5000);
  };

  return (
    <>
    <div className="page-container">
      {/* Header */}
      <div className="w-100 d-flex justify-content-between align-items-center mb-4 px-3 max-w-420">
        <div>
          <h2 className="fw-bold mb-0 page-title">Tienda Athlos</h2>
          <p className="mb-0 text-muted-glass" style={{ fontSize: "0.82rem" }}>Canjea tus recompensas</p>
        </div>
        <button className="btn-icon-circle" onClick={() => navigate("/Menu")} title="Volver">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#74C3D2" viewBox="0 0 16 16">
            <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
          </svg>
        </button>
      </div>

      <div className="d-flex flex-column w-100 max-w-420 px-3">
        
        {/* Puntos Saldo */}
        <div className="menu-item-card mb-4 text-center p-3 tienda-saldo-card">
          <p className="mb-1 text-muted-glass">Saldo actual</p>
          <h1 className="mb-0 fw-bold text-athlos">
            ⭐ {puntos} pts
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="d-flex gap-2 mb-4">
          <button 
            className={`btn flex-grow-1 ${activeTab === "catalog" ? "btn-athlos" : "btn-outline-athlos"}`}
            onClick={() => setActiveTab("catalog")}
          >
            Catálogo
          </button>
          <button 
            className={`btn flex-grow-1 ${activeTab === "history" ? "btn-athlos" : "btn-outline-athlos"}`}
            onClick={() => setActiveTab("history")}
          >
            Mis Canjes
          </button>
        </div>

        {mensaje && (
          <div className={`alert tienda-alert tienda-alert-${mensaje.tipo} text-center`} role="alert">
            {mensaje.texto}
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === "catalog" ? (
          <>
            <h5 className="text-white mb-3 px-1">Recompensas Disponibles</h5>
            
            {loading ? (
              <div className="text-center mt-4 text-muted-glass">Cargando catálogo...</div>
            ) : catalogo.length === 0 ? (
              <div className="text-center mt-4 text-muted-glass">No hay recompensas disponibles.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {catalogo.map((item) => {
                  const vecesCanjeado = history.filter(h => h.idrecompensa === item.idrecompensa).length;
                  const limiteAlcanzado = vecesCanjeado >= item.limite_canjes;
                  
                  return (
                    <div 
                      key={item.idrecompensa} 
                      className="menu-item-card d-flex flex-column gap-2 tienda-card"
                      onClick={() => setSelectedRecompensa(item)}
                      style={{ opacity: limiteAlcanzado ? 0.7 : 1 }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="fw-bold mb-0 text-white" style={{ fontSize: "1.05rem" }}>{item.nombre}</h6>
                        <span className="tienda-badge badge rounded-pill">
                          ⭐ {item.costopuntos}
                        </span>
                      </div>
                      
                      {item.imagen_url && (
                        <div className="tienda-img-wrapper-sm">
                          <img 
                            src={item.imagen_url} 
                            alt={item.nombre} 
                            className="tienda-img"
                          />
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <p className="tienda-desc-short text-truncate">
                          {item.descripcion}
                        </p>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge" style={{ background: limiteAlcanzado ? "rgba(220,53,69,0.2)" : "rgba(255,255,255,0.08)", color: limiteAlcanzado ? "#ff6b6b" : "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
                            Canjes: {vecesCanjeado}/{item.limite_canjes}
                          </span>
                          <span className="text-athlos" style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Ver más &gt;</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <h5 className="text-white mb-3 px-1">Tus Cupones Canjeados</h5>
            
            {loadingHistory ? (
              <div className="text-center mt-4 text-muted-glass">Cargando tu historial...</div>
            ) : history.length === 0 ? (
              <div className="text-center mt-4 text-muted-glass">Aún no has canjeado ninguna recompensa.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {history.map((item) => (
                  <div key={item.idusuariorecompensa} className="menu-item-card d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <h6 className="fw-bold mb-0 text-white" style={{ fontSize: "1.05rem" }}>{item.nombre}</h6>
                      <span className="badge rounded-pill text-muted-glass" style={{ border: "1px solid rgba(255,255,255,0.15)", fontSize: "0.8rem", padding: "4px 8px" }}>
                        {new Date(item.fecha).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {item.imagen_url && (
                      <div className="tienda-img-wrapper-sm" style={{ height: "80px" }}>
                        <img src={item.imagen_url} alt={item.nombre} className="tienda-img" />
                      </div>
                    )}
                    
                    <div className="p-2 text-center" style={{ background: "rgba(116, 195, 210, 0.08)", borderRadius: "8px", border: "1px dashed rgba(116, 195, 210, 0.3)" }}>
                      <p className="mb-0 text-muted-glass" style={{ fontSize: "0.75rem" }}>Código de canje:</p>
                      <span className="fw-bold text-athlos" style={{ fontSize: "1.1rem", letterSpacing: "1px" }}>{item.codigocanje}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>

    {/* Modal de Detalle */}
    {selectedRecompensa && (
      <div className="tienda-modal-overlay">
        <div className="menu-item-card w-100 tienda-modal-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-white mb-0">Detalle de Recompensa</h5>
            <button className="btn-close btn-close-white" onClick={() => setSelectedRecompensa(null)} aria-label="Close"></button>
          </div>
          
          {selectedRecompensa.imagen_url && (
            <div className="tienda-img-wrapper-lg">
              <img 
                src={selectedRecompensa.imagen_url} 
                alt={selectedRecompensa.nombre} 
                className="tienda-img"
              />
            </div>
          )}
          
          <h4 className="fw-bold text-athlos">{selectedRecompensa.nombre}</h4>
          <span className="tienda-badge badge rounded-pill mb-3">
            ⭐ {selectedRecompensa.costopuntos} puntos
          </span>
          
          <p className="tienda-desc-full">
            {selectedRecompensa.descripcion}
          </p>

          {selectedRecompensa.terminos && (
            <div className="mt-3 p-3" style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="mb-1" style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Términos y condiciones</p>
              <p className="mb-0" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                {selectedRecompensa.terminos}
              </p>
            </div>
          )}

          {(() => {
            const vecesCanjeado = history.filter(h => h.idrecompensa === selectedRecompensa.idrecompensa).length;
            const limiteAlcanzado = vecesCanjeado >= selectedRecompensa.limite_canjes;

            return (
              <>
                {limiteAlcanzado ? (
                  <button 
                    className="btn btn-athlos w-100 mt-3" 
                    disabled={true}
                  >
                    Límite alcanzado
                  </button>
                ) : puntos < selectedRecompensa.costopuntos ? (
                  <button 
                    className="btn btn-athlos w-100 mt-3" 
                    onClick={() => { setSelectedRecompensa(null); navigate("/Desafios"); }}
                  >
                    Obtén puntos
                  </button>
                ) : (
                  <button 
                    className="btn btn-athlos w-100 mt-3" 
                    onClick={() => handleCanjear(selectedRecompensa.idrecompensa, selectedRecompensa.costopuntos)}
                    disabled={canjeando}
                  >
                    {canjeando ? "Canjeando..." : "Canjear Recompensa"}
                  </button>
                )}
                
                {limiteAlcanzado ? (
                  <p className="text-center mt-2 mb-0 text-danger" style={{ fontSize: "0.8rem" }}>
                    Has alcanzado el límite máximo de canjes ({selectedRecompensa.limite_canjes}) para esta recompensa.
                  </p>
                ) : puntos < selectedRecompensa.costopuntos ? (
                  <p className="text-center mt-2 mb-0 text-danger" style={{ fontSize: "0.8rem" }}>
                    Te faltan {selectedRecompensa.costopuntos - puntos} puntos para este canje. Ve a tus desafíos.
                  </p>
                ) : (
                  <p className="text-center mt-2 mb-0 text-muted-glass" style={{ fontSize: "0.8rem" }}>
                    Has canjeado {vecesCanjeado} de {selectedRecompensa.limite_canjes} permitidos.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* Celebración / Pop-it de Éxito */}
    {successReward && (
      <div className="tienda-modal-overlay">
        <div className="menu-item-card w-100 tienda-modal-card text-center p-4">
          <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🎉</div>
          <h3 className="fw-bold text-athlos">¡Felicidades!</h3>
          <p className="text-white fw-bold mb-3" style={{ fontSize: "1.1rem" }}>
            Reclamaste con éxito:<br />
            <span className="text-info">{successReward.nombre}</span>
          </p>
          <p className="text-muted-glass mb-4" style={{ fontSize: "0.9rem" }}>
            Se ha enviado un correo electrónico con las instrucciones. Tu código único de canje es:
          </p>
          
          <div className="p-3 mb-4" style={{ background: "rgba(116, 195, 210, 0.15)", border: "2px dashed #74C3D2", borderRadius: "10px" }}>
            <h2 className="mb-0 fw-bold" style={{ color: "#74C3D2", letterSpacing: "2px" }}>
              {successReward.code}
            </h2>
          </div>

          {successReward.terminos && (
            <div className="text-start p-3 mb-4" style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="mb-1" style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Términos y condiciones</p>
              <p className="mb-0" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                {successReward.terminos}
              </p>
            </div>
          )}

          <button 
            className="btn btn-athlos w-100" 
            onClick={() => setSuccessReward(null)}
          >
            Entendido
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default Tienda;
