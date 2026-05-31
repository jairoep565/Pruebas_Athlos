import { useState } from "react";
import { useNavigate } from "react-router-dom";

const URL_BACKEND = import.meta.env.VITE_URL_BACKEND || "http://localhost:3000"

const LoginPage = () => {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate("/nueva-contraseña");
    };

    const loginHandler = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!usuario || !password) {
            setError("Por favor, ingrese todos los campos requeridos.");
            return;
        }

        try {
            const response = await fetch(`${URL_BACKEND}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: usuario, password })
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.message);
                return;
            }

            localStorage.setItem("athlos_token", data.data.token);
            navigate("/Menu");
        } catch (err) {
            setError("No se pudo conectar con el servidor.");
        }
    };

    const handleUsuarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsuario(e.currentTarget.value);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.currentTarget.value);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="logo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                        <path d="M96 176C96 149.5 117.5 128 144 128C170.5 128 192 149.5 192 176L192 288L448 288L448 176C448 149.5 469.5 128 496 128C522.5 128 544 149.5 544 176L544 192L560 192C586.5 192 608 213.5 608 240L608 288C625.7 288 640 302.3 640 320C640 337.7 625.7 352 608 352L608 400C608 426.5 586.5 448 560 448L544 448L544 464C544 490.5 522.5 512 496 512C469.5 512 448 490.5 448 464L448 352L192 352L192 464C192 490.5 170.5 512 144 512C117.5 512 96 490.5 96 464L96 448L80 448C53.5 448 32 426.5 32 400L32 352C14.3 352 0 337.7 0 320C0 302.3 14.3 288 32 288L32 240C32 213.5 53.5 192 80 192L96 192L96 176z" />
                    </svg>
                </div>
                <h2 className="fw-bold page-title">Athlos</h2>
                <p className="page-subtitle">Entrenador Personal con Inteligencia Artificial</p>
            </div>

            <div className="glass-card">
                <h4 className="fw-bold mb-1 text-start card-title">Iniciar Sesión</h4>
                <p className="text-start mb-4 card-subtitle">
                    Ingrese sus credenciales para acceder a su perfil de entrenamiento.
                </p>

                <form onSubmit={loginHandler}>
                    <div className="mb-3 text-start">
                        <label className="form-label fw-semibold text-label">
                            Correo Electrónico
                        </label>
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
                                value={usuario}
                                onChange={handleUsuarioChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="mb-3 text-start">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label fw-semibold mb-0 text-label">
                                Contraseña
                            </label>
                            <a href="#" onClick={handleForgotPassword} className="link-teal" style={{ fontSize: "0.8rem" }}>
                                Olvidé mi contraseña
                            </a>
                        </div>
                        <div className="input-group">
                            <span className="input-group-text glass-input-group-text">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1" />
                                </svg>
                            </span>
                            <input
                                className="form-control glass-input"
                                type="password"
                                placeholder="Ingrese su contraseña"
                                value={password}
                                onChange={handlePasswordChange}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="alert-glass-error mb-3 text-start">
                            {error}
                        </div>
                    )}

                    <div className="d-grid mb-3 mt-4">
                        <button className="btn glass-btn-accent py-2" type="submit">
                            Iniciar Sesión
                        </button>
                    </div>

                    <div className="text-center mt-3">
                        <p className="mb-0 text-muted-glass">
                            ¿No tiene una cuenta?{" "}
                            <a
                                href="#"
                                className="link-teal"
                                onClick={(e) => { e.preventDefault(); navigate("/RegistroUsuario"); }}
                            >
                                Regístrese aquí
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
