import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../services/plan.service", () => {
  class GeminiQuotaError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
      super("Cuota excedida");
    }
  }

  return {
    deletePlansByUserId: vi.fn(),
    generateTrainingPlan: vi.fn(),
    getPlanByIdForUser: vi.fn(),
    getPlansByUserId: vi.fn(),
    GeminiQuotaError,
  };
});

import { generatePlan } from "../plan.controller";
import {
  GeminiQuotaError,
  generateTrainingPlan,
} from "../../services/plan.service";

const crearRespuesta = () => {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
};

describe("generatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("responde 401 cuando no existe un usuario autenticado", async () => {
    const request = {
      user: undefined,
      body: {},
    } as any;

    const response = crearRespuesta();

    await generatePlan(request, response as any);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(generateTrainingPlan).not.toHaveBeenCalled();
  });

  test("responde 400 cuando no se seleccionan días", async () => {
    const request = {
      user: { id: 10 },
      body: { diasEntrenamiento: [] },
    } as any;

    const response = crearRespuesta();

    await generatePlan(request, response as any);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(generateTrainingPlan).not.toHaveBeenCalled();
  });

  test("responde 400 cuando existen días repetidos", async () => {
    const request = {
      user: { id: 10 },
      body: {
        diasEntrenamiento: ["Lunes", "Lunes"],
      },
    } as any;

    const response = crearRespuesta();

    await generatePlan(request, response as any);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(generateTrainingPlan).not.toHaveBeenCalled();
  });

  test("ordena los días y genera correctamente el plan", async () => {
    const planGenerado = {
      idplan: 25,
      nombreplan: "Plan de prueba",
    };

    vi.mocked(generateTrainingPlan).mockResolvedValue(
      planGenerado as any
    );

    const request = {
      user: { id: 10 },
      body: {
        diasEntrenamiento: ["Viernes", "Lunes"],
      },
    } as any;

    const response = crearRespuesta();

    await generatePlan(request, response as any);

    expect(generateTrainingPlan).toHaveBeenCalledWith(
      "10",
      ["Lunes", "Viernes"]
    );

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: { plan: planGenerado },
    });
  });

  test("responde 429 cuando Gemini supera su cuota", async () => {
    vi.mocked(generateTrainingPlan).mockRejectedValue(
      new GeminiQuotaError(45)
    );

    const request = {
      user: { id: 10 },
      body: {
        diasEntrenamiento: ["Lunes"],
      },
    } as any;

    const response = crearRespuesta();

    await generatePlan(request, response as any);

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "GEMINI_QUOTA_EXCEEDED",
        retryAfterSeconds: 45,
      })
    );
  });
});