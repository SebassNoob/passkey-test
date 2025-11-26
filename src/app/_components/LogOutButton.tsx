"use client";
import { logOut } from "@lib/auth";

export function LogOutButton() {
	return <button onClick={async () => await logOut()}>Log Out</button>;
}
