import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import LogIn from "./pages/inicio-sesion";
import RegistroUsuario from "./pages/Registro-Usuario";
import DatosUsuario from "./pages/Datos-Usuario";
import EntornoEntrenamiento from "./pages/Entorno-Entrenamiento";
import RecuperarContrasena from "./pages/recuperar-contrasena";
import PerfilUsuario from "./pages/Perfil";
import Menu from "./pages/Menu";
import Chat from "./pages/Chat";
import GenerarPlan from "./pages/Generar-Plan";
import MisPlanes from "./pages/Mis-Planes";
import DetallePlan from "./pages/Detalle-Plan";
import PlanAlimentacion from "./pages/Plan-Alimentacion";
import Desafios from "./pages/Desafios";
import Tienda from "./pages/Tienda";
import Progreso from "./pages/Progreso";


createRoot(document.getElementById("root")!).render(
  <Router>
    <div className="bg-glow-container">
      <div className="bg-glow-orb-1"></div>
      <div className="bg-glow-orb-2"></div>
      <div className="bg-glass-line-1"></div>
      <div className="bg-glass-line-2"></div>
    </div>

    <Routes>
      <Route path="/" element={<LogIn />} />
      <Route path="/RegistroUsuario" element={<RegistroUsuario />} />
      <Route path="/DatosUsuario" element={<DatosUsuario />} />
      <Route path="/Entorno" element={<EntornoEntrenamiento />} />
      <Route path="/nueva-contraseña" element={<RecuperarContrasena />} />
      <Route path="/Perfil" element={<PerfilUsuario />} />
      <Route path="/Menu" element={<Menu />} />
      <Route path="/Chat" element={<Chat />} />
      <Route path="/GenerarPlan" element={<GenerarPlan />} />
      <Route path="/MisPlanes" element={<MisPlanes />} />
      <Route path="/MisPlanes/:planId" element={<DetallePlan />} />
      <Route path="/PlanAlimentacion" element={<PlanAlimentacion />} />
      <Route path="/Desafios" element={<Desafios />} />
      <Route path="/Tienda" element={<Tienda />} />
      <Route path="/Progreso" element={<Progreso />} />

    </Routes>
  </Router>
);
