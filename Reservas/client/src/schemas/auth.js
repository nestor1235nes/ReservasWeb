import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un correo válido",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres",
  }),
});

export const registerSchema = z
  .object({
    username: z
      .string({
        required_error: "El nombre de usuario es obligatorio",
      })
      .min(3, {
        message: "El nombre de usuario debe tener al menos 3 caracteres",
      }),
    email: z.string().email({
      message: "Por favor ingresa un correo válido",
    }),
    password: z
      .string()
      .min(6, {
        message: "La contraseña debe tener al menos 6 caracteres",
      })
      .regex(/[A-Z]/, {
        message: "La contraseña debe tener al menos una mayúscula",
      })
      .regex(/[0-9]/, {
        message: "La contraseña debe tener al menos un número",
      })
      .regex(/[^A-Za-z0-9]/, {
        message: "La contraseña debe tener al menos un símbolo",
      }),
    confirmPassword: z.string().min(6, {
      message: "La confirmación debe tener al menos 6 caracteres",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
