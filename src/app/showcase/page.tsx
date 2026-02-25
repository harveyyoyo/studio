import Link from 'next/link';

export default function ShowcasePage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
            <div className="text-center space-y-6 px-6">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
                    levelUp EDU Showcase
                </h1>
                <p className="text-slate-400 max-w-xl mx-auto">
                    A richer marketing experience for levelUp EDU will live here soon.
                    For now, you can explore the main app experience from the home page.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-sm font-bold uppercase tracking-[0.2em] transition-colors"
                >
                    Back to app
                </Link>
            </div>
        </main>
    );
}
