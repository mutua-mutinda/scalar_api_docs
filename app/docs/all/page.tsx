"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { FileText, Plus, ArrowLeft, Clock, User, Calendar } from "lucide-react";
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

export default function AllDocs() {
  const [docs, setDocs] = useState<DatabaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndFetchDocs = async () => {
      const supabase = createClient();

      // Check authentication
      const { data: authData, error: authError } =
        await supabase.auth.getClaims();
      if (authError || !authData?.claims) {
        router.push("/auth/login");
        return;
      }

      setIsAuthenticated(true);

      // Fetch docs
      try {
        const { data, error } = await supabase
          .from("config_files")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setDocs(data);
        }
      } catch (error) {
        console.error("Error fetching docs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetchDocs();
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i}>
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
          </div>
        </div>
      </main>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    <main className="min-h-screen">
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
                  All Documentation
                </h1>
              </div>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Button asChild variant="outline">
                  <Link href="/docs/create" className="flex items-center">
                    <Plus className="h-4 w-4" />
                    <span>Create Docs</span>
                  </Link>
                </Button>
                <Button asChild onClick={() => supabase.auth.signOut()}>
                  Sign out
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link href="/auth/login" className="flex items-center -x-2">
                  <span>Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        {/* Documentation Grid */}
        {docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No documentation available
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Get started by creating your first API documentation.
            </p>
            <Button asChild>
              <Link href="/docs/create" className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create Your First Doc</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <Card
                key={doc.id}
                className="group hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
              >
                <Link href={`/docs?api=${slugify(doc.title, { lower: true })}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getFileTypeColor(doc.file_type)}>
                        {doc.file_type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                    <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {doc.file_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Updated {formatDate(doc.updated_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {doc.user_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Load More or Pagination could be added here if needed */}
        {docs.length > 0 && (
          <div className="text-center mt-12 text-sm text-slate-600 dark:text-slate-400">
            Showing {docs.length} documentation{docs.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </main>
  );
}
