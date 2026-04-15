import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6 sm:p-10">
      <main className="flex flex-1 flex-col justify-center">
        <p className="eyebrow">
          Browser-Only PDF Toolkit
        </p>
        <h1 className="page-title mt-2 max-w-3xl text-4xl tracking-tight sm:text-6xl">
          Merge any number of PDFs and edit pages in seconds.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
          Choose a tool below. Files stay in your browser while processing.
        </p>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="panel tool-card merge p-6">
            <p className="eyebrow" style={{ letterSpacing: "0.22em" }}>
              Tool 01
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Merge PDFs</h2>
            <p className="mt-3 text-slate-700">
              Add as many files as you want, reorder them, and combine into one
              output PDF.
            </p>
            <Link className="btn-primary mt-6 inline-flex" href="/merge">
              Open Merge Tool
            </Link>
          </article>

          <article className="panel tool-card edit p-6">
            <p className="eyebrow" style={{ letterSpacing: "0.22em" }}>
              Tool 02
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Edit Pages</h2>
            <p className="mt-3 text-slate-700">
              Insert pages in between and remove unwanted pages from an existing
              PDF.
            </p>
            <Link className="btn-primary mt-6 inline-flex" href="/edit">
              Open Edit Tool
            </Link>
          </article>
        </section>
      </main>
    </div>
  );
}
