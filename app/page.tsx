"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, ArrowRight, Clock } from "lucide-react";
import slugify from "slugify";

interface DatabaseRecord {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: "json" | "yaml" | "yml";
  uploaded_at: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [docs, setDocs] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndFetchDocs = async () => {
      try {
        const supabase = createClient();

        // Check authentication
        const { data: authData, error: authError } =
          await supabase.auth.getClaims();
        setIsAuthenticated(!!authData?.claims && !authError);
        const { data, error } = await supabase
          .from("config_files")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);

        if (!error && data) {
          setDocs(data);
        }
        // Fetch docs only if authenticated
        // if (authData?.claims && !authError) {

        // }
      } catch (error) {
        console.error("Error fetching docs:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchDocs();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case "json":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "yaml":
      case "yml":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="min-h-dvh flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-slate-700 dark:text-slate-300" />
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                API Documentation
              </h1>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Button asChild variant="outline">
                  <Link href="/docs/create" className="flex items-center">
                    <Plus className="h-4 w-4" />
                    <span>Create Docs</span>
                  </Link>
                </Button>
                <Button asChild>
                  <span role="button" onClick={() => supabase.auth.signOut()}>
                    Sign out
                  </span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button asChild>
                  <Link href="/auth/login" className="flex items-center -x-2">
                    <span>Sign In</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Beautiful API Documentation
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Create, manage, and share stunning API documentation with support
            for OpenAPI, Postman Collections, and more.
          </p>
        </div>

        {/* Documentation Grid */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Get Started
            </h3>
            {docs.length > 0 && (
              <Button variant="outline" asChild>
                <Link href="/docs/all" className="flex items-center space-x-2">
                  <span>View All</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!isLoading && docs.length === 0 && isAuthenticated && (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No documentation yet
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Get started by creating your first API documentation.
              </p>
              <Button asChild>
                <Link
                  href="/docs/create"
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Your First Doc</span>
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && docs.length === 6 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg" asChild>
                <Link href="/docs/all" className="flex items-center space-x-2">
                  <span>View All Documentation</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && docs.length && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {docs.map((doc) => (
                <Card
                  key={doc.id}
                  className="group hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                >
                  <Link
                    href={`/docs?api=${slugify(doc.title, { lower: true })}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {doc.title}
                        </CardTitle>
                        <Badge className={getFileTypeColor(doc.file_type)}>
                          {doc.file_type.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {doc.file_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-slate-600 dark:text-slate-300">
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
