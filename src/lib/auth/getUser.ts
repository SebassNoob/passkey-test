"use server";
import { SESSION_COOKIE_NAME } from "@/app/auth/constants";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";

export async function getUser() {
	const cookieJar = await cookies();
	const sessionToken = cookieJar.get(SESSION_COOKIE_NAME)?.value;
	if (!sessionToken) {
		return { valid: false, error: "No session token found" };
	}

	try {
		// verify the session token
		// if expired or tampered with, will throw an error
		const payload = verify(sessionToken, process.env.JWT_SECRET!) as User;

		return { valid: true, user: payload };
	} catch (error) {
		console.log(error);
		return { valid: false, error: "Invalid session token" };
	}
}
