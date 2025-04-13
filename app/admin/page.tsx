"use client";

import { Suspense } from "react";
import { AdminAuth } from "../components/AdminAuth";
import { AdminConfigForm } from "../components/AdminConfigForm";
import Link from "next/link";

// Create a separate component to be wrapped in Suspense
function AdminContent() {
  return (
    <AdminAuth>
      <AdminConfigForm />
    </AdminAuth>
  );
}

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link
            href="/"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
          >
            Back to Status Page
          </Link>
        </div>
        
        <Suspense fallback={
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
          </div>
        }>
          <AdminContent />
        </Suspense>
      </div>
    </div>
  );
} 