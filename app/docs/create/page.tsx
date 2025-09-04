import { CreateDocs } from "@/components/create-docs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CreateDocsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const splitEmail = data.claims?.email?.split("@") || ["User", ""];
  const [username] = splitEmail;

  const user = username || "User";

  return (
    <main className="min-h-dvh flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Create Documentation
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-200">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Upload API Documentation
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Upload your OpenAPI, Swagger, or Postman Collection files to
              create beautiful, interactive documentation.
            </p>
          </div>

          <CreateDocs />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t  mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>
              Powered by{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                className="font-medium hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                rel="noreferrer"
              >
                Supabase
              </a>{" "}
              and{" "}
              <a
                href="https://scalar.com"
                target="_blank"
                className="font-medium hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                rel="noreferrer"
              >
                Scalar
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
