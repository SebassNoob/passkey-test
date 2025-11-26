import { z } from "zod";

export const signInSchema = z.object({
	username: z.string(),
});

export type SignInSchema = z.infer<typeof signInSchema>;
