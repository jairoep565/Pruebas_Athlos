import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

interface Mensaje {
    id: string;
    sender: "user" | "athlos" | "system";
    text: string;
    timestamp: Date;
}

const Chat: React.FC = () => {
    const navigate = useNavigate();

    const [datosFisicos, setDatosFisicos] = useState({
        nombre: "", peso: "", talla: "", edad: "", entorno: "",
    });

    const [error, setError] = useState("");
    

    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [notifExiting, setNotifExiting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mostrarEntorno: Record<string, string> = {
        casa: "Casa",
        gimnasio: "Gimnasio",
        aire_libre: "Aire libre",
    };

    const cargarPerfil = async () => {
      try {
        const response = await fetch(`${URL_BACKEND}/api/user/profile`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("athlos_token")}`
          }
        });
        const data = await response.json();
        if (data.success) {
          const u = data.data;
          setDatosFisicos({
            nombre: u.nombre || "",
            peso: u.peso?.toString() || "",
            talla: u.talla?.toString() || "",
            edad: u.edad?.toString() || "",
            entorno: u.identorno === 1 ? "casa" : u.identorno === 2 ? "gimnasio" : "aire_libre",
          });
        }
      } catch (err) {
        setError("No se pudo cargar el perfil.");
        console.error("Error al cargar perfil:", error);
      }
    };
    
    useEffect(() => {
        // Solicitar permiso de notificaciones
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        cargarPerfil(); // Solo disparamos la carga

        return () => {
            if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        };
    }, []);    

    useEffect(() => {
        
        if (datosFisicos.nombre === "") return; 

        console.log("Variable datosFisicos:", datosFisicos);

        const cachedChat = localStorage.getItem("athlos_chat_history");
        if (cachedChat) {
            try {
                const parsedHistory = JSON.parse(cachedChat).map((msg: any) => ({ 
                    ...msg, 
                    timestamp: new Date(msg.timestamp) 
                }));
                setMensajes(parsedHistory);
            } catch (e) {
                inicializarMensajeBienvenida(datosFisicos.nombre);
            }
        } else {
            inicializarMensajeBienvenida(datosFisicos.nombre);
        }

    }, [datosFisicos]);

    useEffect(() => {
        if (mensajes.length > 0) localStorage.setItem("athlos_chat_history", JSON.stringify(mensajes));
    }, [mensajes]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensajes, loading]);

    const inicializarMensajeBienvenida = (nombre: string) => {
        setMensajes([{
            id: "welcome",
            sender: "athlos",
            text: `¡Hola ${nombre}! Soy **Athlos**, tu entrenadora personal con inteligencia artificial. 💪🏋️‍♀️\n\nEstoy lista para ayudarte a cumplir tus metas. ¿Qué parte del cuerpo te gustaría entrenar hoy o qué tipo de rutina prefieres?`,
            timestamp: new Date(),
        }]);
    };
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim() || loading) return;

        const userMessageText = inputMsg.trim();
        setInputMsg("");

        const userMsg: Mensaje = {
            id: `msg-${Date.now()}-u`,
            sender: "user",
            text: userMessageText,
            timestamp: new Date(),
        };

        setMensajes((prev) => [...prev, userMsg]);
        setLoading(true);

        try {
            const userId = localStorage.getItem("athlos_idusuario") || "1";
            const historial = mensajes
                .filter((msg) => msg.sender === "user" || msg.sender === "athlos")
                .map((msg) => ({
                    sender: msg.sender,
                    text: msg.text,
                    timestamp: msg.timestamp.toISOString(),
                }));

            const response = await fetch(`${URL_BACKEND}/api/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId,
                },
                body: JSON.stringify({ mensaje: userMessageText, historial }),
            });

            if (!response.ok) {
                throw new Error(`Error en backend: ${response.status}`);
            }

            const data = await response.json();
            const responseText =
                data.data?.respuesta ||
                "Lo siento, no he podido procesar esa consulta.";

            setMensajes((prev) => [...prev, {
                id: `msg-${Date.now()}-a`,
                sender: "athlos",
                text: responseText,
                timestamp: new Date(),
            }]);

            const lowerResp = responseText.toLowerCase();
            const esRutina = (
                (lowerResp.includes("rutina") || lowerResp.includes("plan") || lowerResp.includes("entrenamiento") || lowerResp.includes("ejercicio")) &&
                (lowerResp.includes("series") || lowerResp.includes("repeticiones") || lowerResp.includes("- ") || lowerResp.includes("* "))
            );

            if (esRutina) {
                scheduleTrainingNotification();
            }
        } catch (err) {
            console.error("Error al conectar con backend:", err);
            setMensajes((prev) => [...prev, {
                id: `msg-${Date.now()}-err`,
                sender: "athlos",
                text: `**Error de conexion**\n\nNo he podido conectarme con el backend de Athlos. Verifica que el servidor este encendido y que GEMINI_API_KEY este configurada en el backend.`,
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };
    const scheduleTrainingNotification = () => {
        // Limpiar timer previo si existe
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);

        notifTimerRef.current = setTimeout(() => {
            // Notificación nativa del navegador (funciona en background)
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("🏋️ Athlos - Entrenamiento Pendiente", {
                    body: "¡Tu plan de entrenamiento está listo! No olvides completar tu rutina de hoy. 💪",
                    icon: "/favicon.svg",
                    tag: "athlos-training",
                });
            }

            // Notificación in-app (siempre visible)
            setShowNotification(true);
            setNotifExiting(false);

            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                dismissNotification();
            }, 5000);
        }, 10000); // 10 segundos después de la respuesta
    };

    const dismissNotification = () => {
        setNotifExiting(true);
        setTimeout(() => {
            setShowNotification(false);
            setNotifExiting(false);
        }, 400); // duración de la animación de salida
    };

    const handleLimpiarChat = () => {
        if (window.confirm("¿Deseas borrar todo el historial de conversación con Athlos?")) {
            localStorage.removeItem("athlos_chat_history");
            inicializarMensajeBienvenida(datosFisicos.nombre);
        }
    };

    const formatMessageText = (text: string) => {
        return text.split("\n").map((line, idx) => {
            let cleanLine = line;
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(cleanLine)) !== null) {
                if (match.index > lastIndex) parts.push(cleanLine.substring(lastIndex, match.index));
                parts.push(<strong key={match.index} className="text-teal" style={{ fontWeight: "600" }}>{match[1]}</strong>);
                lastIndex = boldRegex.lastIndex;
            }
            if (lastIndex < cleanLine.length) parts.push(cleanLine.substring(lastIndex));

            const renderedLine = parts.length > 0 ? parts : cleanLine;

            if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
                const contentWithoutBullet = line.trim().substring(2);
                const bulletParts: React.ReactNode[] = [];
                let bulletLastIdx = 0;
                let bulletMatch;
                while ((bulletMatch = boldRegex.exec(contentWithoutBullet)) !== null) {
                    if (bulletMatch.index > bulletLastIdx) bulletParts.push(contentWithoutBullet.substring(bulletLastIdx, bulletMatch.index));
                    bulletParts.push(<strong key={bulletMatch.index} className="text-teal" style={{ fontWeight: "600" }}>{bulletMatch[1]}</strong>);
                    bulletLastIdx = boldRegex.lastIndex;
                }
                if (bulletLastIdx < contentWithoutBullet.length) bulletParts.push(contentWithoutBullet.substring(bulletLastIdx));

                return (
                    <li key={idx} className="mb-2" style={{ marginLeft: "16px", listStyleType: "disc", color: "#e8eaf0" }}>
                        {bulletParts.length > 0 ? bulletParts : contentWithoutBullet}
                    </li>
                );
            }

            return (
                <div key={idx} className={line.trim() === "" ? "py-1" : "mb-2"} style={{ lineHeight: "1.45" }}>
                    {renderedLine}
                </div>
            );
        });
    };

    return (
        <div className="page-container" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
            {/* PUSH NOTIFICATION TOAST */}
            {showNotification && (
                <div className="push-notification-overlay">
                    <div
                        className={`push-notification ${notifExiting ? "notif-exit" : ""}`}
                        onClick={dismissNotification}
                    >
                        <div className="push-notification-header">
                            <div className="push-notification-icon">🏋️</div>
                            <div>
                                <div className="push-notification-app">Athlos</div>
                            </div>
                            <div className="push-notification-time">ahora</div>
                        </div>
                        <div className="push-notification-title">
                            ¡Entrenamiento Pendiente!
                        </div>
                        <div className="push-notification-body">
                            Tu plan de entrenamiento está listo. ¡Es hora de ponerte en acción! 💪🔥
                        </div>
                        <div className="push-notification-progress"></div>
                    </div>
                </div>
            )}

            <div className="glass-card chat-container d-flex flex-column">
                {/* CABECERA */}
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 divider-bottom">
                    <button className="btn btn-icon-sm" onClick={() => navigate("/Menu")} title="Volver al Menú">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
                        </svg>
                    </button>

                    <div className="text-center flex-grow-1">
                        <h4 className="fw-bold mb-0 text-white" style={{ fontSize: "1.05rem", letterSpacing: "-0.2px" }}>
                            Athlos AI
                        </h4>
                        <span className="text-teal fw-bold" style={{ fontSize: "0.72rem" }}>● Entrenadora Personal</span>
                    </div>

                    <button className="btn btn-icon-sm" onClick={handleLimpiarChat} title="Limpiar conversación"
                        style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                        </svg>
                    </button>
                </div>

                {/* MÉTRICAS DEL PERFIL */}
                {datosFisicos.peso || datosFisicos.entorno ? (
                    <div className="d-flex flex-wrap gap-1 justify-content-center mb-3 p-2 rounded alert-glass-info" style={{ background: "rgba(116, 195, 210, 0.06)", border: "1px solid rgba(116, 195, 210, 0.15)" }}>
                        {datosFisicos.peso && (
                            <span className="badge badge-glass font-monospace">⚖️ {datosFisicos.peso} kg</span>
                        )}
                        {datosFisicos.talla && (
                            <span className="badge badge-glass font-monospace">📏 {datosFisicos.talla} cm</span>
                        )}
                        {datosFisicos.entorno && (
                            <span className="badge badge-glass">📍 {mostrarEntorno[datosFisicos.entorno] || datosFisicos.entorno}</span>
                        )}
                    </div>
                ) : (
                    <div className="alert-glass-warning text-center mb-3">
                        ⚠️ Perfil incompleto. Completa tus métricas en "Mi Perfil" para recomendaciones adaptadas a ti.
                    </div>
                )}

                {/* MENSAJES */}
                <div className="flex-grow-1 overflow-y-auto mb-3 pe-1" style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {mensajes.map((msg) => {
                        const isUser = msg.sender === "user";
                        return (
                            <div key={msg.id} className={`d-flex flex-column ${isUser ? "align-items-end" : "align-items-start"}`}>
                                <span className={isUser ? "chat-sender-user" : "chat-sender-bot"}>
                                    {isUser ? "Tú" : "Athlos"}
                                </span>
                                <div className={`rounded-3 px-3 py-2 ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}>
                                    {formatMessageText(msg.text)}
                                </div>
                            </div>
                        );
                    })}

                    {/* INDICADOR DE CARGA */}
                    {loading && (
                        <div className="d-flex flex-column align-items-start">
                            <span className="chat-sender-bot">Athlos</span>
                            <div className="rounded-3 px-3 py-2 d-flex align-items-center gap-1 chat-typing-bubble">
                                <span>Athlos está escribiendo</span>
                                <span className="typing-dot">.</span>
                                <span className="typing-dot">.</span>
                                <span className="typing-dot">.</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* FORMULARIO DE ENVÍO */}
                <form onSubmit={handleSend} className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control glass-input flex-grow-1"
                        placeholder="Pregúntale a Athlos..."
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        disabled={loading}
                        style={{ fontSize: "0.85rem" }}
                    />
                    <button
                        type="submit"
                        className="btn glass-btn-primary d-flex align-items-center justify-content-center"
                        disabled={loading || !inputMsg.trim()}
                        style={{ width: "42px", height: "42px", padding: "0", borderRadius: "10px", flexShrink: 0 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"
                            style={{ transform: "rotate(45deg)", marginLeft: "-2px", marginTop: "-2px" }}>
                            <path d="M15.854.146a.5.5 0 0 1 .11.525l-5.5 15a.5.5 0 0 1-.94-.315l-1.85-5.27-5.27-1.85a.5.5 0 0 1-.315-.94l15-5.5a.5.5 0 0 1 .525.11zM14.5 1.5l-12 4.4 3.7 1.3 1.3 3.7z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;