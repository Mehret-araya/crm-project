import { z } from "zod";

export const registrationFormSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(12, "Password must be at least 12 characters").max(72).refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;
