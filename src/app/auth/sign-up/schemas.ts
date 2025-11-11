import { z } from "zod";

export const signUpSchema = z.object({
	username: z.string().min(3, "Username must be at least 3 characters long"),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
