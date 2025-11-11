"use client";
import { useForm } from "react-hook-form";
import { signUpSchema, type SignUpSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSignUpOptions, registerCredential } from "./server";
import { startRegistration } from "@simplewebauthn/browser";

export function SignUpForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignUpSchema>({
		resolver: zodResolver(signUpSchema),
	});

	const onSubmit = async (data: SignUpSchema) => {
		try {
			// Step 1: Get registration options from server
			const { options, token } = await getSignUpOptions(data.username);

			// Step 2: Create credential with WebAuthn
			const credential = await startRegistration({ optionsJSON: options });

			// Step 3: Verify and store the credential
			const result = await registerCredential(credential, token);

			if (result.success) {
				console.log("Registration successful!");
				// TODO: Redirect to login or dashboard
			}
		} catch (error) {
			console.error("Registration failed:", error);
			// TODO: Show error to user
		}
	};

	return (
		<section>
			<h1>Sign Up</h1>
			<form onSubmit={handleSubmit(onSubmit)}>
				<input type="text" placeholder="Username" required {...register("username")} />
				<button type="submit">Register</button>
				{errors.username && <p>{errors.username.message}</p>}
			</form>
		</section>
	);
}
