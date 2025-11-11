"use server";
import { prisma } from "@db/client";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import {
	JWT_EXPIRATION_TIME,
	ORIGIN,
	RP_ID,
	RP_NAME,
	SESSION_COOKIE_NAME,
} from "@/app/auth/constants";

export async function getSignUpOptions(username: string) {
	const options = await generateRegistrationOptions({
		rpName: RP_NAME,
		rpID: RP_ID,
		userName: username,
		attestationType: "none",
		authenticatorSelection: {
			residentKey: "preferred",
			userVerification: "required",
		},
	});

	// Store the challenge that the library generated
	const token = sign({ challenge: options.challenge, username }, process.env.JWT_SECRET!, {
		expiresIn: JWT_EXPIRATION_TIME,
	});

	return { options, token };
}

export async function registerCredential(credential: RegistrationResponseJSON, token: string) {
	const payload = verify(token, process.env.JWT_SECRET!) as { challenge: string; username: string };

	const verification = await verifyRegistrationResponse({
		response: credential,
		expectedChallenge: payload.challenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID,
	});

	if (!verification.verified) {
		throw new Error("Registration verification failed");
	}

	const { registrationInfo } = verification;
	if (!registrationInfo) {
		throw new Error("Registration info not found");
	}

	// Store the credential in the database
	const user = await prisma.user.create({
		data: {
			username: payload.username,
			email: `${payload.username}@placeholder.com`,
		},
	});

	// Convert public key to base64 for storage
	const publicKeyBase64 = Buffer.from(registrationInfo.credential.publicKey).toString("base64");

	const newCredential = await prisma.credential.create({
		data: {
			userId: user.id,
			publicKey: publicKeyBase64,
			signCount: registrationInfo.credential.counter,
		},
	});

	// Store transports separately if provided
	if (credential.response.transports) {
		await prisma.credentialTransport.createMany({
			data: credential.response.transports.map((transport) => ({
				credentialId: newCredential.id,
				transport,
			})),
		});
	}
	// set session cookie
	const sessionToken = sign({ userId: user.id }, process.env.JWT_SECRET!, {
		expiresIn: JWT_EXPIRATION_TIME,
	});
	const cookieJar = await cookies();
	cookieJar.set(SESSION_COOKIE_NAME, sessionToken, { httpOnly: true, path: "/" });
	return { success: true };
}
