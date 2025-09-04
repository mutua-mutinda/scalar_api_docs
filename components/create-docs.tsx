"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import slugify from "slugify";

interface FormData {
  title: string;
  file: File | null;
}

export function CreateDocs({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const supabase = createClient();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    file: null,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "File size must be less than 10MB" });
        return;
      }

      setFormData((prev) => ({ ...prev, file }));
      setMessage(null);
    }
  };

  // const uploadFile = async (file: File, fileName: string) => {
  //   const { data, error } = await supabase.storage
  //     .from("uploads")
  //     .upload(fileName, file, {
  //       cacheControl: "3600",
  //       upsert: false,
  //     });

  //   if (error)
  //     setMessage({
  //       type: "error",
  //       text:
  //         error instanceof Error
  //           ? error.message
  //           : "An error occurred uploading",
  //     });
  //   return data;
  // };

  // const saveToDatabase = async (
  //   title: string,
  //   filePath: string,
  //   fileName: string,
  //   fileSize: number,
  // ) => {
  //   const { data, error } = await supabase
  //     .from("file_uploads")
  //     .insert([
  //       {
  //         title,
  //         file_path: filePath,
  //         file_name: fileName,
  //         file_size: fileSize,
  //         uploaded_at: new Date().toISOString(),
  //       },
  //     ])
  //     .select();

  //   const { data, error } = await supabase
  //     .from("config_files")
  //     .insert({
  //       title,
  //       file_path: filePath,
  //       file_name: fileName,
  //       file_size: fileSize,
  //       uploaded_at: new Date().toISOString(),
  //       file_type: fileExt?.toLowerCase() || "unknown",
  //     })
  //     .select();

  //   if (error) throw error;
  //   return data[0];
  // };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage({ type: "error", text: "Please enter a title" });
      return;
    }

    if (!formData.file) {
      setMessage({ type: "error", text: "Please select a file" });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setMessage(null);

    try {
      // Generate unique filename
      const fileExt = formData.file.name.split(".").pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Simulate upload progress (Supabase doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("config-files")
        .upload(uniqueFileName, formData.file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log("Upload successful:", uploadData);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from("config_files")
        .insert({
          title: formData.title,
          file_path: uploadData.path,
          file_name: formData.file.name,
          file_size: formData.file.size,
          file_type: fileExt?.toLowerCase() || "unknown",
        })
        .select();

      if (dbError) {
        console.error("Database error:", dbError);
        // Try to delete the uploaded file if database save fails
        await supabase.storage.from("config-files").remove([uploadData.path]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log("Database save successful:", dbData);

      setUploadProgress(100);
      clearInterval(progressInterval);

      setMessage({
        type: "success",
        text: "File uploaded successfully!",
      });

      setInterval(() => {
        router.push(`/docs?api=${slugify(dbData[0].title)}`);
      }, 200);

      // Reset form
      setFormData({ title: "", file: null });

      // Reset file input
      const fileInput = document.getElementById(
        "file-input",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Upload failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Docs</CardTitle>
          <CardDescription>
            Enter your title below to create a new document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Enter file title"
                disabled={isLoading}
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="file-input">File</Label>
              <Input
                type="file"
                id="file-input"
                onChange={handleFileChange}
                disabled={isLoading}
                accept="*/*"
                required
              />

              {/* File Info */}
              {formData.file && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Selected:</span>{" "}
                    {formData.file.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Size:</span>{" "}
                    {formatFileSize(formData.file.size)}
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </div>
              ) : (
                "Upload File"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
