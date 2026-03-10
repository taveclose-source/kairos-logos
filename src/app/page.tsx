import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      {/* Branding */}
      <div className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-3">
          Logos
        </h1>
        <p className="text-lg text-gray-500 tracking-wide">
          by Kai&apos;Ros
        </p>
        <p className="mt-4 text-sm text-gray-400 uppercase tracking-widest">
          The Word. Preserved.
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/bible"
          className="group block p-8 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all"
        >
          <div className="text-3xl mb-3">&#x1F4D6;</div>
          <h2 className="text-xl font-semibold mb-1 group-hover:text-gray-900">
            Bible
          </h2>
          <p className="text-sm text-gray-500">
            KJV &amp; Asante Twi parallel reader
          </p>
        </Link>

        <Link
          href="/ask"
          className="group block p-8 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all"
        >
          <div className="text-3xl mb-3">&#x2721;</div>
          <h2 className="text-xl font-semibold mb-1 group-hover:text-gray-900">
            Ask the Word
          </h2>
          <p className="text-sm text-gray-500">
            AI theological agent &middot; KJV
          </p>
        </Link>

        <Link
          href="/why-kjv"
          className="group block p-8 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all"
        >
          <div className="text-3xl mb-3">&#x1F4DC;</div>
          <h2 className="text-xl font-semibold mb-1 group-hover:text-gray-900">
            Why KJV?
          </h2>
          <p className="text-sm text-gray-500">
            The manuscript case for the preserved Word
          </p>
        </Link>

        <Link
          href="/learn"
          className="group block p-8 rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all"
        >
          <div className="text-3xl mb-3">&#x1F4AC;</div>
          <h2 className="text-xl font-semibold mb-1 group-hover:text-gray-900">
            Learn Twi
          </h2>
          <p className="text-sm text-gray-500">
            Flashcards &amp; vocabulary practice
          </p>
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-center text-xs text-gray-400">
        <p>Kai&apos;Ros International &middot; Summit Bible Center</p>
      </footer>
    </main>
  );
}
