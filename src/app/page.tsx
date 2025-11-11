import Link from "next/link";

export default async function Home() {
	return (
		<main>
			<h1 className="text-3xl font-bold underline">Hello, World!</h1>
			<Link href="/auth/sign-up">Register</Link>
		</main>
	);
}
