"use client";
import { useForm } from "react-hook-form";
import { signInSchema, type SignInSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSignInOptions, authenticateCredential } from "./server";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

export function SignInForm() {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignInSchema>({
		resolver: zodResolver(signInSchema),
	});
	const router = useRouter();

	const onSubmit = async (data: SignInSchema) => {
		// user wants to sign in with username data.username
		try {
			// request for authentication options
			// server will respond with a challenge (options) and jwt token
			// jwt is non-tamperable proof from server. after authentication, it will be checked against the challenge (options)
			// this is to ensure the challenge was not tampered with on the client side
			const { options, token, error } = await getSignInOptions(data.username);

			if (error || !options || !token) {
				console.error("Sign-in options retrieval failed:", error);
				alert(`Sign-in failed: ${error || "Unable to get authentication options"}`);
				return;
			}

			console.log(options);
			// use WebAuthn to authenticate with existing credential
			// will prompt the user to use their hardware authenticator
			// the device will sign the challenge with their private key
			const credential = await startAuthentication({ optionsJSON: options });

			// pass the signed credential and jwt to the server to verify the credential
			// if the token is not tampered with, the server will authenticate the user
			const result = await authenticateCredential(credential, token);

			if (result.success) {
				router.push("/");
			} else {
				console.error("Authentication failed:", result.error);
				alert(`Authentication failed: ${result.error || "Unknown error"}`);
			}
		} catch (error) {
			console.error("Authentication failed:", error);
			alert(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	};

	return (
		<section>
			<h1>Sign In</h1>
			<form onSubmit={handleSubmit(onSubmit)}>
				<input type="text" placeholder="Username" required {...register("username")} />
				<button type="submit">Sign In</button>
				{errors.username && <p>{errors.username.message}</p>}
			</form>
		</section>
	);
}
