"use server";
import { SESSION_COOKIE_NAME } from "@/app/auth/constants";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUser() {
	const cookieJar = await cookies();
	const sessionToken = cookieJar.get(SESSION_COOKIE_NAME)?.value;
	if (!sessionToken) {
		return { valid: false, error: "No session token found" };
	}

	try {
		const payload = verify(sessionToken, process.env.JWT_SECRET!) as { userId: number };
		return { valid: true, userId: payload.userId };
	} catch (error) {
		return { valid: false, error: "Invalid session token" };
	}
}
