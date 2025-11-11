import Link from "next/link";
import { getUser } from "@lib/auth/getUser";

export default async function Home() {
	const user = await getUser();
	return (
		<main>
			{JSON.stringify(user)}
			<h1 className="text-3xl font-bold underline">Hello, World!</h1>
			<Link href="/auth/sign-up">Register</Link>
		</main>
	);
}
