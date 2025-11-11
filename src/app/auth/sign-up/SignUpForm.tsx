"use client";
import { useForm } from "react-hook-form";
import { signUpSchema, type SignUpSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSignUpOptions, registerCredential } from "./server";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export function SignUpForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignUpSchema>({
		resolver: zodResolver(signUpSchema),
	});
	const router = useRouter();

	const onSubmit = async (data: SignUpSchema) => {
		// user wants to register an account with username data.username
		try {
			// request for registration options
			// server will respond with a challenge (options) and jwt token
			// jwt is non-tamperable proof from server. after registration, it will be checked against the challenge (options)
			// this is to ensure the challenge was not tampered with on the client side
			const { options, token } = await getSignUpOptions(data.username);

			// use WebAuthn to create a new credential
			// will prompt the user to use their hardware authenticator
			// the device will sign the challenge with their private key
			const credential = await startRegistration({ optionsJSON: options });

			// pass the signed credential and jwt to the server to verify the credential
			// if the token is not tampered with, the server will store the credential and register the user
			const result = await registerCredential(credential, token);

			if (result.success) {
				router.push("/");
			} else {
				console.error("Registration failed:", result.error);
			}
		} catch (error) {
			console.error("Registration failed:", error);
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
