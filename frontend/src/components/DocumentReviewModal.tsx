"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DocumentReviewModalProps {
  open: boolean;
  onClose: () => void;
  onReview: (file: File, clientRole: string, optionalPrompt: string) => Promise<void>;
}

export default function DocumentReviewModal({ open, onClose, onReview }: DocumentReviewModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientRole, setClientRole] = useState("");
  const [optionalPrompt, setOptionalPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setSelectedFile(null);
    setClientRole("");
    setOptionalPrompt("");
    setError(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      handleReset();
      onClose();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleReview = async () => {
    if (!selectedFile || !clientRole.trim()) {
      setError("Please upload a document and specify your client role.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onReview(selectedFile, clientRole.trim(), optionalPrompt.trim());
      handleReset();
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to start document review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canReview = selectedFile && clientRole.trim() && !isSubmitting;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0e16] p-6 text-white shadow-2xl">
                <Dialog.Title className="text-xl font-semibold">⚖️ Document Review</Dialog.Title>
                <p className="mt-1 text-sm text-slate-400">
                  Upload a document to review, specify your role, and optionally add context or questions.
                </p>

                {/* File Upload Area */}
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Document to Review <span className="text-red-400">*</span>
                    </label>
                    {selectedFile ? (
                      <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                            📄
                          </div>
                          <div>
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveFile}
                          disabled={isSubmitting}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition disabled:opacity-40"
                        >
                          <XMarkIcon className="h-5 w-5 text-slate-400" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`mt-2 rounded-2xl border border-dashed p-6 transition ${
                          isDragging
                            ? "border-indigo-400 bg-indigo-500/20"
                            : "border-white/15 bg-white/5"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-slate-300">
                          <span className="text-lg font-medium">Drop file or browse</span>
                          <span className="text-xs text-slate-500">PDF, DOCX, images. Up to 25 MB.</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={isSubmitting}
                            accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Client Role Input */}
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Your Role <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientRole}
                      onChange={(e) => setClientRole(e.target.value)}
                      placeholder="e.g., Founder, Investor, Employee, Contractor"
                      disabled={isSubmitting}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-[#0d0f16] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-40"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Helps us provide context-specific legal analysis
                    </p>
                  </div>

                  {/* Optional Prompt */}
                  <div>
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Additional Context or Questions (Optional)
                    </label>
                    <textarea
                      value={optionalPrompt}
                      onChange={(e) => setOptionalPrompt(e.target.value)}
                      placeholder="e.g., What are the key terms I should be aware of? Are there any red flags?"
                      disabled={isSubmitting}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-[#0d0f16] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-40"
                    />
                  </div>
                </div>

                {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="rounded-full border border-white/10 px-5 py-2 text-sm text-white transition hover:border-white/40 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={!canReview}
                    className={`rounded-full px-6 py-2 text-sm font-medium transition ${
                      canReview
                        ? "bg-indigo-500 text-white hover:bg-indigo-600"
                        : "bg-white/10 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? "Starting Review..." : "Review"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

