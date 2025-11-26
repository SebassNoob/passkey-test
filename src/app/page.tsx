import Link from "next/link";
import { getUser } from "@lib/auth";
import { LogOutButton } from "./_components/LogOutButton";

export default async function Home() {
	const userResult = await getUser();
	return (
		<main className="flex flex-col gap-4">
			{JSON.stringify(userResult)}
			<h1 className="text-3xl font-bold underline">Hello, World!</h1>
			<Link href="/auth/sign-up">Register</Link>
			<Link href="/auth/sign-in">Sign In</Link>
			{userResult.user && <LogOutButton />}
		</main>
	);
}
