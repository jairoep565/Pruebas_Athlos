import { useState } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

type Ambiente = "casa" | "gimnasio" | "aire_libre";

const ENTORNO_ID: Record<Ambiente, number> = {
    casa: 1,
    gimnasio: 2,
    aire_libre: 3,
};

const ENTORNOS: { value: Ambiente; label: string; icono: string }[] = [
    {
        value: "casa",
        label: "Casa",
        icono: "M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z",
    },
    {
        value: "gimnasio",
        label: "Gimnasio",
        icono: "M3 0a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3v-3.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V16h3a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm1 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm.5 2.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5M7 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm.5 2.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5M10 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm.5 2.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5",
    },
    {
        value: "aire_libre",
        label: "Aire libre",
        icono: "M8.416.223a.5.5 0 0 0-.832 0l-3 4.5A.5.5 0 0 0 5 5.5h.098L3.076 8.735A.5.5 0 0 0 3.5 9.5h.191l-1.638 3.276a.5.5 0 0 0 .447.724H7V16h2v-2.5h4.5a.5.5 0 0 0 .447-.724L12.31 9.5h.191a.5.5 0 0 0 .424-.765L10.902 5.5H11a.5.5 0 0 0 .416-.777z",
    },
];

const EntornoEntrenamiento = () => {
    const navigate = useNavigate();
    const [entorno, setEntorno] = useState<Ambiente>("casa");
    const [error, setError] = useState<string>("");

    const handleContinuar = async () => {
        try {
            const response = await fetch(`${URL_BACKEND}/api/user/environment`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("athlos_token")}`
                },
                body: JSON.stringify({ identorno: ENTORNO_ID[entorno] })
            });

            const data = await response.json();
            if (!data.success) {
                setError(data.message);
                return;
            }

            navigate("/Menu");
        } catch (err) {
            setError("No se pudo conectar con el servidor.");
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="logo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z" />
                    </svg>
                </div>
                <h2 className="fw-bold page-title">Entorno</h2>
                <p className="page-subtitle">Configure el entorno donde llevará a cabo su rutina física.</p>
            </div>

            <div className="glass-card">
                <label className="form-label fw-semibold text-start d-block mb-3 text-label">
                    ¿Dónde planea entrenar?
                </label>

                <div className="d-flex gap-2 mb-4">
                    {ENTORNOS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEntorno(opt.value)}
                            className={`btn flex-fill d-flex flex-column align-items-center gap-2 py-3 px-1 btn-option btn-option-env${entorno === opt.value ? " active" : ""}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                                <path d={opt.icono} />
                            </svg>
                            <span style={{ fontSize: "0.8rem" }}>{opt.label}</span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="alert-glass-error mb-3 text-start">{error}</div>
                )}

                <div className="d-grid mt-4">
                    <button onClick={handleContinuar} className="btn glass-btn-accent py-2" type="button">
                        Completar Configuración
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntornoEntrenamiento;
