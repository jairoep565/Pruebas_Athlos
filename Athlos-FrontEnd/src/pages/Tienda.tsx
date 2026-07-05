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
}

const Tienda = () => {
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState<number>(0);
  const [catalogo, setCatalogo] = useState<Recompensa[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "success" | "error" } | null>(null);
  const [canjeando, setCanjeando] = useState(false);
  const [selectedRecompensa, setSelectedRecompensa] = useState<Recompensa | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

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
    } catch (err) {
      setMensaje({ texto: "Error al cargar la tienda", tipo: "error" });
    }
    setLoading(false);
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
        setMensaje({ texto: data.message, tipo: "success" });
        setPuntos(prev => prev - costo); // Descontar localmente
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

        {mensaje && (
          <div className={`alert tienda-alert tienda-alert-${mensaje.tipo} text-center`} role="alert">
            {mensaje.texto}
          </div>
        )}

        {/* Catálogo */}
        <h5 className="text-white mb-3 px-1">Recompensas Disponibles</h5>
        
        {loading ? (
          <div className="text-center mt-4 text-muted-glass">Cargando catálogo...</div>
        ) : catalogo.length === 0 ? (
          <div className="text-center mt-4 text-muted-glass">No hay recompensas disponibles.</div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {catalogo.map((item) => (
              <div 
                key={item.idrecompensa} 
                className="menu-item-card d-flex flex-column gap-2 tienda-card"
                onClick={() => setSelectedRecompensa(item)}
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
                  <span className="text-athlos" style={{ fontSize: "0.8rem", fontWeight: "bold" }}>Ver más &gt;</span>
                </div>
              </div>
            ))}
          </div>
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

            {puntos < selectedRecompensa.costopuntos ? (
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
            {puntos < selectedRecompensa.costopuntos && (
              <p className="text-center mt-2 mb-0 text-danger" style={{ fontSize: "0.8rem" }}>
                Te faltan {selectedRecompensa.costopuntos - puntos} puntos para este canje. Ve a tus desafíos.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Tienda;
