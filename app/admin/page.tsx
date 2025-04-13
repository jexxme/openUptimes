"use client";

import { AdminAuth } from "../components/AdminAuth";
import { AdminConfigForm } from "../components/AdminConfigForm";
import Link from "next/link";

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
        
        <AdminAuth>
          <AdminConfigForm />
        </AdminAuth>
      </div>
    </div>
  );
} 