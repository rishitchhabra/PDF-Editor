"use client";

import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { ChangeEvent, useMemo, useState } from "react";
import { downloadBytes, isPdf } from "@/lib/pdfUtils";

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [mergeProgress, setMergeProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const canMerge = files.length > 0 && !isMerging;

  const totalSizeMb = useMemo(
    () => (files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2),
    [files],
  );

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).filter(isPdf);
    if (selected.length === 0) {
      setStatus("Please select valid PDF files.");
      return;
    }

    setFiles((prev) => [...prev, ...selected]);
    setStatus("");
    event.target.value = "";
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;

    const next = [...files];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setFiles(next);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setFiles((prev) => {
      if (toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const clearAll = () => {
    setFiles([]);
    setStatus("");
    setMergeProgress(0);
  };

  const mergePdfs = async () => {
    if (files.length === 0) return;

    try {
      setIsMerging(true);
      setMergeProgress(0);
      setStatus("Reading files...");

      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i += 1) {
        setStatus(`Merging file ${i + 1} of ${files.length}...`);
        const bytes = await files[i].arrayBuffer();
        const sourcePdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        setMergeProgress(Math.round(((i + 1) / files.length) * 100));

        // Yield to the browser periodically to keep progress updates smooth.
        if ((i + 1) % 10 === 0) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      }

      setStatus("Generating final PDF...");
      const mergedBytes = await mergedPdf.save();
      downloadBytes(mergedBytes, "merged.pdf");
      setMergeProgress(100);
      setStatus("Done. Your merged PDF was downloaded.");
    } catch {
      setStatus(
        "Unable to merge one or more files. Ensure PDFs are not encrypted or corrupted.",
      );
    } finally {
      setIsMerging(false);
      setDraggedIndex(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6 sm:p-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title text-3xl tracking-tight sm:text-4xl">Merge PDFs</h1>
        <Link className="btn-secondary" href="/">
          Back Home
        </Link>
      </div>

      <section className="panel mt-6 p-6">
        <p className="text-slate-700">
          Add unlimited PDFs. No hard file-count cap is enforced in the app.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="btn-primary cursor-pointer">
            Select PDFs
            <input
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={onFilesSelected}
              disabled={isMerging}
            />
          </label>
          <button className="btn-secondary" onClick={clearAll} disabled={isMerging || files.length === 0}>
            Clear All
          </button>
          <button className="btn-primary" onClick={mergePdfs} disabled={!canMerge}>
            {isMerging ? "Merging..." : "Merge and Download"}
          </button>
        </div>

        <p className="mt-3 font-mono text-sm text-slate-600">
          {files.length} file(s) selected • {totalSizeMb} MB total
        </p>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full border border-outline bg-white">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
            style={{ width: `${mergeProgress}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-600">Progress: {mergeProgress}%</p>

        {status ? <p className="status-ok mt-4 text-sm">{status}</p> : null}
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="text-xl font-semibold">Merge Order</h2>
        {files.length === 0 ? (
          <p className="mt-2 text-slate-600">No files added yet.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {files.map((file, index) => (
              <li
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline bg-white p-3 transition ${
                  draggedIndex === index ? "opacity-50" : "opacity-100"
                }`}
                key={`${file.name}-${index}-${file.lastModified}`}
                draggable={!isMerging}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedIndex === null) return;
                  reorderFile(draggedIndex, index);
                  setDraggedIndex(null);
                }}
                onDragEnd={() => setDraggedIndex(null)}
              >
                <div>
                  <p className="font-medium text-slate-900">{index + 1}. {file.name}</p>
                  <p className="text-sm text-slate-600">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => moveFile(index, -1)}
                    disabled={isMerging || index === 0}
                  >
                    Up
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => moveFile(index, 1)}
                    disabled={isMerging || index === files.length - 1}
                  >
                    Down
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => removeFile(index)}
                    disabled={isMerging}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
