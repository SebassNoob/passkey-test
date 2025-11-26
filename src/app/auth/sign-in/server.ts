"use server";
import { prisma } from "@db/client";
import {
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import {
	JWT_EXPIRATION_TIME,
	ORIGIN,
	RP_ID,
	RP_NAME,
	SESSION_COOKIE_NAME,
} from "@/app/auth/constants";

export async function getSignInOptions(username: string) {
	const user = await prisma.user.findUnique({
		where: { username },
		include: {
			credentials: {
				include: { transports: true },
			},
		},
	});

	if (!user || user.credentials.length === 0) {
		return { error: "User not found or has no credentials" };
	}

	const options = await generateAuthenticationOptions({
		rpID: RP_ID,
		userVerification: "preferred",
		/*
    allowCredentials: user.credentials.map((cred) => ({
      id: cred.id,
      type: "public-key",
      // Include transports to help the browser know how to access the authenticator
      // e.g., "usb", "nfc", "ble", "internal", "hybrid"
      transports: cred.transports.map((t) => t.transport) as AuthenticatorTransportFuture[],
    })),
    */
	});

	// Store the challenge that the library generated
	const token = sign({ challenge: options.challenge, username }, process.env.JWT_SECRET!, {
		expiresIn: JWT_EXPIRATION_TIME,
	});

	return { options, token };
}

export async function authenticateCredential(
	credential: AuthenticationResponseJSON,
	token: string,
) {
	// we validate the jwt has not been tampered with and get the challenge and username from it
	const payload = verify(token, process.env.JWT_SECRET!) as { challenge: string; username: string };

	const user = await prisma.user.findUnique({
		where: { username: payload.username },
		include: { credentials: true },
	});

	if (!user) {
		return { success: false, error: "User not found" };
	}
	// Find the credential record that matches the credential ID from the client
	console.log("Credential ID from client:", credential.id);
	console.log("User credentials in DB:", user.credentials);
	const credentialRecord = user.credentials.find((cred) => cred.id === credential.id);
	if (!credentialRecord) {
		return { success: false, error: "Credential not found for user" };
	}
	// verify the authentication response with the challenge from the jwt
	const verification = await verifyAuthenticationResponse({
		response: credential,
		expectedChallenge: payload.challenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID,
		credential: {
			id: credentialRecord.id,
			publicKey: new Uint8Array(Buffer.from(credentialRecord.publicKey, "base64url")),
			counter: credentialRecord.signCount,
		},
	});

	if (!verification.verified) {
		return { success: false, error: "Could not verify authentication response" };
	}

	// update the signCount in the database to prevent replay attacks
	await prisma.credential.update({
		where: { id: credentialRecord.id },
		data: { signCount: verification.authenticationInfo!.newCounter },
	});

	// issue a new session token
	const sessionToken = sign(user, process.env.JWT_SECRET!, {
		expiresIn: JWT_EXPIRATION_TIME,
	});
	const cookieJar = await cookies();
	cookieJar.set(SESSION_COOKIE_NAME, sessionToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
	});

	return { success: true };
}
