"use client";

import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { downloadBytes, isPdf } from "@/lib/pdfUtils";

export default function EditPage() {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>("edited.pdf");
  const [pageCount, setPageCount] = useState(0);
  const [insertPosition, setInsertPosition] = useState(1);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbStatus, setThumbStatus] = useState("");

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount],
  );

  const loadPdf = (input: ArrayBuffer | Uint8Array) =>
    PDFDocument.load(input, { ignoreEncryption: true });

  useEffect(() => {
    let cancelled = false;

    const generateThumbnails = async () => {
      if (!pdfBytes) {
        setThumbnails([]);
        setThumbStatus("");
        return;
      }

      try {
        setThumbStatus("Generating page thumbnails...");
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (pdfjs.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
        }
        const loadingTask = pdfjs.getDocument({ data: pdfBytes });
        const loadedPdf = await loadingTask.promise;
        const nextThumbs: string[] = [];

        for (let pageNumber = 1; pageNumber <= loadedPdf.numPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await loadedPdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) continue;

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
          nextThumbs.push(canvas.toDataURL("image/jpeg", 0.72));

          if (pageNumber % 8 === 0 || pageNumber === loadedPdf.numPages) {
            setThumbnails([...nextThumbs]);
            setThumbStatus(`Generated ${pageNumber}/${loadedPdf.numPages} thumbnails...`);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
        }

        if (!cancelled) {
          setThumbnails(nextThumbs);
          setThumbStatus("Thumbnails ready.");
        }
      } catch {
        if (!cancelled) {
          setThumbnails([]);
          setThumbStatus("Could not generate thumbnails for this PDF.");
        }
      }
    };

    generateThumbnails();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  const loadEditorPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected || !isPdf(selected)) {
      setStatus("Please select a valid PDF file.");
      return;
    }

    try {
      setIsWorking(true);
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const doc = await loadPdf(bytes);

      setPdfBytes(bytes);
      setPageCount(doc.getPageCount());
      setFileName(selected.name.replace(/\.pdf$/i, "") + "-edited.pdf");
      setInsertPosition(1);
      setStatus("PDF loaded. You can now insert or remove pages.");
    } catch {
      setStatus("Could not open this PDF. It may be invalid or unsupported.");
    } finally {
      setIsWorking(false);
      event.target.value = "";
    }
  };

  const refreshPdfState = async (doc: PDFDocument) => {
    const nextBytes = await doc.save();
    setPdfBytes(nextBytes);
    const nextCount = doc.getPageCount();
    setPageCount(nextCount);
    setInsertPosition((prev) => Math.min(Math.max(1, prev), nextCount + 1));
  };

  const removePage = async (pageToRemove: number) => {
    if (!pdfBytes || pageCount <= 1) {
      setStatus("A PDF must keep at least one page.");
      return;
    }

    try {
      setIsWorking(true);
      const doc = await loadPdf(pdfBytes);
      doc.removePage(pageToRemove - 1);
      await refreshPdfState(doc);
      setStatus(`Removed page ${pageToRemove}.`);
    } catch {
      setStatus("Unable to remove page.");
    } finally {
      setIsWorking(false);
    }
  };

  const insertPdfAtPosition = async (event: ChangeEvent<HTMLInputElement>) => {
    const insertFile = event.target.files?.[0];
    if (!insertFile || !isPdf(insertFile)) {
      setStatus("Please select a valid PDF to insert.");
      return;
    }
    if (!pdfBytes) {
      setStatus("Load a base PDF first.");
      return;
    }

    try {
      setIsWorking(true);
      const baseDoc = await loadPdf(pdfBytes);
      const insertDoc = await loadPdf(await insertFile.arrayBuffer());

      const copiedPages = await baseDoc.copyPages(insertDoc, insertDoc.getPageIndices());
      let currentIndex = insertPosition - 1;
      copiedPages.forEach((page) => {
        baseDoc.insertPage(currentIndex, page);
        currentIndex += 1;
      });

      await refreshPdfState(baseDoc);
      setStatus(
        `Inserted ${copiedPages.length} page(s) at position ${insertPosition}.`,
      );
    } catch {
      setStatus("Unable to insert pages from this file.");
    } finally {
      setIsWorking(false);
      event.target.value = "";
    }
  };

  const downloadEditedPdf = () => {
    if (!pdfBytes) return;
    downloadBytes(pdfBytes, fileName);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6 sm:p-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title text-3xl tracking-tight sm:text-4xl">Edit PDF Pages</h1>
        <Link className="btn-secondary" href="/">
          Back Home
        </Link>
      </div>

      <section className="panel mt-6 p-6">
        <p className="text-slate-700">
          Upload a PDF, insert pages between existing pages, remove pages, then
          download the updated file.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="btn-primary cursor-pointer">
            Upload Base PDF
            <input
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={loadEditorPdf}
              disabled={isWorking}
            />
          </label>

          <button
            className="btn-primary"
            onClick={downloadEditedPdf}
            disabled={!pdfBytes || isWorking}
          >
            Download Edited PDF
          </button>
        </div>

        {status ? <p className="status-ok mt-4 text-sm">{status}</p> : null}
        <p className="mt-2 font-mono text-sm text-slate-600">Page count: {pageCount}</p>
        {thumbStatus ? <p className="mt-1 font-mono text-xs text-slate-600">{thumbStatus}</p> : null}
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="text-xl font-semibold">Insert Pages</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700" htmlFor="insert-position">
            Insert before page
          </label>
          <select
            id="insert-position"
            className="btn-secondary"
            disabled={!pdfBytes || isWorking}
            value={insertPosition}
            onChange={(event) => setInsertPosition(Number(event.target.value))}
          >
            {Array.from({ length: Math.max(1, pageCount + 1) }, (_, idx) => idx + 1).map(
              (position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ),
            )}
          </select>

          <label className="btn-secondary cursor-pointer">
            Choose PDF to Insert
            <input
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={insertPdfAtPosition}
              disabled={!pdfBytes || isWorking}
            />
          </label>
        </div>
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="text-xl font-semibold">Remove Pages</h2>
        {pageCount === 0 ? (
          <p className="mt-3 text-slate-600">Load a PDF to edit pages.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pageNumbers.map((page) => (
              <article className="rounded-xl border border-outline bg-white p-2" key={page}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-outline bg-slate-50">
                  {thumbnails[page - 1] ? (
                    <Image
                      alt={`Preview of page ${page}`}
                      src={thumbnails[page - 1]}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 20vw, 14vw"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Page {page}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-mono text-slate-700">Page {page}</p>
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    onClick={() => removePage(page)}
                    disabled={isWorking || pageCount <= 1}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
