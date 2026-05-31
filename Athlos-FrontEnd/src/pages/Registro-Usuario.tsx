import { useState } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000";

const RegistroUsuario = () => {
    const navigate = useNavigate();
    const [nombre, setNombre] = useState<string>("");
    const [correo, setCorreo] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [aceptoTerminos, setAceptoTerminos] = useState<boolean>(false);

    const [error, setError] = useState<string>("");
    const [registroExitoso, setRegistroExitoso] = useState<boolean>(false);
    const [mostrarModalTerminos, setMostrarModalTerminos] = useState<boolean>(false);
    const [codigoIngresado, setCodigoIngresado] = useState<string>("");
    const [errorVerificacion, setErrorVerificacion] = useState<string>("");
    const [codigoSimulado, setCodigoSimulado] = useState<string>("");

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.currentTarget.value);
    const handleCorreoChange = (e: React.ChangeEvent<HTMLInputElement>) => setCorreo(e.currentTarget.value);
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value);
    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.currentTarget.value);
    const handleAceptarTerminosChange = (e: React.ChangeEvent<HTMLInputElement>) => setAceptoTerminos(e.currentTarget.checked);

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!nombre || !correo || !password || !confirmPassword) {
            setError("Todos los campos del formulario son obligatorios.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas ingresadas no coinciden.");
            return;
        }
        if (!aceptoTerminos) {
            setError("Debe aceptar los Términos y la Política de Privacidad para continuar.");
            return;
        }

        try {
            const response = await fetch(`${URL_BACKEND}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email: correo, password })
            });
            const data = await response.json();
            if (!data.success) {
                setError(data.message);
                return;
            }
            setCodigoSimulado(data.codigoSimulado);
            setRegistroExitoso(true);
        } catch (err) {
            setError("No se pudo conectar con el servidor.");
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorVerificacion("");

        try {
            const response = await fetch(`${URL_BACKEND}/api/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: correo, codigo: codigoIngresado })
            });
            const data = await response.json();
            if (!data.success) {
                setErrorVerificacion(data.message);
                return;
            }
            localStorage.setItem("athlos_token", data.data.token);
            navigate("/DatosUsuario");
        } catch (err) {
            setErrorVerificacion("No se pudo conectar con el servidor.");
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
                <h2 className="fw-bold page-title">Crear cuenta</h2>
                <p className="page-subtitle">Únase a Athlos para iniciar su planificación inteligente.</p>
            </div>

            <div className="glass-card">
                {!registroExitoso ? (
                    <>
                        <h4 className="fw-bold mb-1 text-start card-title">Registro</h4>
                        <p className="text-start mb-4 card-subtitle">
                            Complete la información solicitada para activar su perfil.
                        </p>

                        <form onSubmit={handleRegisterSubmit}>
                            <div className="mb-3 text-start">
                                <label className="form-label fw-semibold text-label">Nombre Completo</label>
                                <div className="input-group">
                                    <span className="input-group-text glass-input-group-text">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
                                        </svg>
                                    </span>
                                    <input
                                        className="form-control glass-input"
                                        type="text"
                                        placeholder="Ingrese su nombre"
                                        value={nombre}
                                        onChange={handleNombreChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3 text-start">
                                <label className="form-label fw-semibold text-label">Correo Electrónico</label>
                                <div className="input-group">
                                    <span className="input-group-text glass-input-group-text">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z" />
                                        </svg>
                                    </span>
                                    <input
                                        className="form-control glass-input"
                                        type="email"
                                        placeholder="nombre@correo.com"
                                        value={correo}
                                        onChange={handleCorreoChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3 text-start">
                                <label className="form-label fw-semibold text-label">Contraseña</label>
                                <div className="input-group">
                                    <span className="input-group-text glass-input-group-text">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1" />
                                        </svg>
                                    </span>
                                    <input
                                        className="form-control glass-input"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3 text-start">
                                <label className="form-label fw-semibold text-label">Confirmar Contraseña</label>
                                <div className="input-group">
                                    <span className="input-group-text glass-input-group-text">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1" />
                                        </svg>
                                    </span>
                                    <input
                                        className="form-control glass-input"
                                        type="password"
                                        placeholder="Repita su contraseña"
                                        value={confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-check text-start mb-4 mt-3">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="terminosCheckbox"
                                    checked={aceptoTerminos}
                                    onChange={handleAceptarTerminosChange}
                                    style={{
                                        backgroundColor: aceptoTerminos ? "#74C3D2" : "transparent",
                                        borderColor: "rgba(255,255,255,0.25)"
                                    }}
                                />
                                <label className="form-check-label text-muted" htmlFor="terminosCheckbox" style={{ fontSize: "0.8rem", userSelect: "none" }}>
                                    Acepto los{" "}
                                    <a
                                        href="#"
                                        className="link-teal"
                                        onClick={(e) => { e.preventDefault(); setMostrarModalTerminos(true); }}
                                    >
                                        Términos y la Política de Privacidad
                                    </a>
                                </label>
                            </div>

                            {error && (
                                <div className="alert-glass-error mb-3 text-start">{error}</div>
                            )}

                            <div className="d-grid mb-3 mt-4">
                                <button className="btn glass-btn-accent py-2" type="submit">
                                    Registrar
                                </button>
                            </div>

                            <div className="text-center mt-3">
                                <p className="mb-0 text-muted-glass">
                                    ¿Ya tiene una cuenta?{" "}
                                    <a
                                        href="#"
                                        className="link-teal"
                                        onClick={(e) => { e.preventDefault(); navigate("/Entorno"); }}
                                    >
                                        Inicie sesión
                                    </a>
                                </p>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-start">
                        <div className="success-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#28A745" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                            </svg>
                        </div>
                        <h4 className="fw-bold mb-2 card-title">Cuenta creada</h4>
                        <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                            Cuenta creada. Revisa tu correo para verificarla.
                        </p>

                        <div className="alert-glass-info my-3">
                            <small className="d-block fw-semibold mb-1 text-teal">[Simulador de Correo Electrónico]</small>
                            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>
                                Hemos simulado el envío de un código de verificación a su bandeja:
                            </span>
                            <div className="mt-2 text-center py-2 rounded bg-black bg-opacity-20 font-monospace fw-bold" style={{ fontSize: "1.2rem", color: "#fcd385", letterSpacing: "2px" }}>
                                {codigoSimulado}
                            </div>
                        </div>

                        <form onSubmit={handleVerifySubmit} className="mt-4">
                            <div className="mb-3">
                                <label className="form-label fw-semibold text-label">
                                    Ingrese el código recibido
                                </label>
                                <input
                                    className="form-control glass-input text-center font-monospace"
                                    type="text"
                                    placeholder="######"
                                    maxLength={6}
                                    value={codigoIngresado}
                                    onChange={(e) => setCodigoIngresado(e.target.value)}
                                    required
                                    style={{ letterSpacing: "4px", fontSize: "1.1rem" }}
                                />
                            </div>

                            {errorVerificacion && (
                                <div className="alert-glass-error mb-3">{errorVerificacion}</div>
                            )}

                            <div className="d-grid mb-2">
                                <button className="btn glass-btn-primary py-2" type="submit">
                                    Verificar y Continuar
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Modal de Términos y Condiciones */}
            {mostrarModalTerminos && (
                <div className="modal-overlay">
                    <div
                        className="glass-card text-start overflow-hidden d-flex flex-column"
                        style={{ maxWidth: "400px", maxHeight: "80vh", boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}
                    >
                        <h4 className="fw-bold mb-3 pb-2 card-title divider-bottom">
                            Términos y Condiciones
                        </h4>

                        <div className="overflow-auto pe-2" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>
                            <p className="fw-bold text-white">1. Propósito de Athlos</p>
                            <p>
                                Athlos es un asistente de entrenamiento impulsado por algoritmos de Inteligencia Artificial. Los planes físicos y recomendaciones alimenticias sugeridos se generan a partir de la información física proporcionada por el usuario (peso, talla, complexión).
                            </p>
                            <p className="fw-bold text-white">2. Responsabilidad Física</p>
                            <p>
                                El usuario asume toda responsabilidad sobre la realización de las actividades físicas sugeridas. Athlos no sustituye la supervisión médica ni la asesoría presencial de un profesional certificado de salud física. Si experimenta dolor o molestias, detenga la actividad de inmediato.
                            </p>
                            <p className="fw-bold text-white">3. Tratamiento de Datos Personales</p>
                            <p>
                                De acuerdo con los estándares de privacidad, sus medidas corporales e información de perfil se tratarán de forma estrictamente confidencial y se utilizarán de manera automatizada única y exclusivamente para recalcular y optimizar su Índice de Masa Corporal (IMC) y diseñar su plan de entrenamiento individualizado.
                            </p>
                            <p className="fw-bold text-white">4. Aceptación del Servicio</p>
                            <p>
                                Al marcar la casilla de aceptación, usted declara estar en óptimas condiciones de salud para emprender entrenamientos físicos y liberar a la aplicación Athlos de toda reclamación por lesiones corporales derivadas del uso autónomo de los catálogos proporcionados.
                            </p>
                        </div>

                        <div className="d-grid mt-4 pt-2 divider-top">
                            <button
                                className="btn glass-btn-primary py-2"
                                onClick={() => { setAceptoTerminos(true); setMostrarModalTerminos(false); }}
                            >
                                Aceptar y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistroUsuario;
