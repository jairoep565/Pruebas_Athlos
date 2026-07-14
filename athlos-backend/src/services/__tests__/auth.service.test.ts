import { afterEach, describe, expect, test, vi } from "vitest";
import jwt from "jsonwebtoken";
import {
  comparePassword,
  generateToken,
  generateVerificationCode,
  hashPassword,
} from "../auth.service";

describe("generateVerificationCode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("genera un código de seis dígitos", () => {
    const code = generateVerificationCode();

    expect(code).toHaveLength(6);
    expect(Number(code)).toBeGreaterThanOrEqual(100000);
    expect(Number(code)).toBeLessThanOrEqual(999999);
  });

  test("genera 100000 cuando Math.random devuelve cero", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateVerificationCode()).toBe("100000");
  });

  test("genera el límite superior esperado", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);

    expect(generateVerificationCode()).toBe("999999");
  });
});

describe("contraseñas", () => {
  test("cifra una contraseña y permite validarla", async () => {
    const password = "Athlos123";
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(await comparePassword(password, hashed)).toBe(true);
  });

  test("rechaza una contraseña incorrecta", async () => {
    const hashed = await hashPassword("Athlos123");

    expect(await comparePassword("Incorrecta", hashed)).toBe(false);
  });
});

describe("generateToken", () => {
  test("genera un token con el ID del usuario", () => {
    const token = generateToken(25);
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "athlos_secret"
    ) as jwt.JwtPayload;

    expect(payload.id).toBe(25);
  });
});