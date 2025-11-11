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
import { randomBytes } from "node:crypto";

export async function getSignUpOptions(username: string) {
	// we generate a challenge for the user to sign up with
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
	// we validate the jwt has not been tampered with and get the challenge and username from it
	const payload = verify(token, process.env.JWT_SECRET!) as { challenge: string; username: string };

	// verify the registration response with the challenge from the jwt
	const verification = await verifyRegistrationResponse({
		response: credential,
		expectedChallenge: payload.challenge,
		expectedOrigin: ORIGIN,
		expectedRPID: RP_ID,
	});

	if (!verification.verified) {
		return { success: false, error: "Could not verify registration response" };
	}

	// Store the credential in the database
	let user;
	try {
		user = await prisma.user.create({
			data: {
				username: payload.username,
				email: `${payload.username}-${randomBytes(32).toString("base64")}@placeholder.com`,
			},
		});
	} catch (error) {
		return { success: false, error: "Username already exists" };
	}

	// extract the registration info
	const { registrationInfo } = verification;
	if (!registrationInfo) {
		return { success: false, error: "Registration info not found" };
	}

	// Convert public key to base64 for storage
	const publicKeyBase64 = Buffer.from(registrationInfo.credential.publicKey).toString("base64");

	// Store credential
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

	// issue a new session token
	const sessionToken = sign({ userId: user.id }, process.env.JWT_SECRET!, {
		expiresIn: JWT_EXPIRATION_TIME,
	});
	const cookieJar = await cookies();
	cookieJar.set(SESSION_COOKIE_NAME, sessionToken, { httpOnly: true, path: "/" });
	return { success: true };
}
