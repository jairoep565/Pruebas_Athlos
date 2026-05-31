
export interface IUsuario {
    idusuario: number;
    identorno: number | null;
    nombre: string;
    email: string;
    contraseñahash: string;
    puntos: number;
    peso: number | null;
    talla: number | null;
    edad: number | null;
}

export type UsuarioPublico = Omit<IUsuario, "contraseñahash">;

export interface UpdateProfileBody {
    peso: number;
    talla: number;
    edad: number;
}

export interface UpdateEnvironmentBody {
    identorno: number;
}
