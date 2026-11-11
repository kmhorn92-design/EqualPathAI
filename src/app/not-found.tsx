import Link from "next/link";
export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-8 text-center"><div><p className="gradient-text font-display text-7xl font-bold">404</p><p className="mt-3 text-slate-400">This path doesn&apos;t exist — but yours does.</p><Link href="/" className="btn-primary mt-6">Back home</Link></div></main>;
}
