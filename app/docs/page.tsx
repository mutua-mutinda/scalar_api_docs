"use client";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import slugify from "slugify";
import yaml from "js-yaml";

interface Config {
  title: string;
  slug: string;
  content: Record<string, unknown>;
}

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

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    version?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  description?: string;
}

interface PostmanRequest {
  method: string;
  header?: Array<{ key: string; value: string }>;
  url:
    | {
        raw: string;
        host: string[];
        path: string[];
        query?: Array<{ key: string; value: string }>;
      }
    | string;
  body?: {
    mode: string;
    raw?: string;
    formdata?: Array<{ key: string; value: string }>;
  };
  description?: string;
}

interface PostmanVariable {
  key: string;
  value: string;
}

interface OpenApiOperation {
  summary: string;
  description: string;
  responses: Record<string, unknown>;
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    schema: {
      type: string;
      example: string;
    };
  }>;
  requestBody?: {
    content: {
      "application/json": {
        schema: {
          type: string;
          properties: Record<string, unknown>;
        };
      };
    };
  };
}

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, unknown>;
    parameters: Record<string, unknown>;
  };
}

function ReferencesContent() {
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiSpec, setApiSpec] = useState<Config | null>(null);
  const searchParams = useSearchParams();
  const apiParam = searchParams.get("api") || null;

  // Convert Postman Collection to OpenAPI
  const convertPostmanToOpenAPI = (
    postmanCollection: PostmanCollection,
  ): OpenApiSpec => {
    const openApiSpec: OpenApiSpec = {
      openapi: "3.0.3",
      info: {
        title: postmanCollection.info.name || "API Documentation",
        description:
          postmanCollection.info.description ||
          "Converted from Postman Collection",
        version: postmanCollection.info.version || "1.0.0",
      },
      servers: [
        {
          url: "https://api.example.com",
          description: "Base URL (extracted from Postman collection)",
        },
      ],
      paths: {},
      components: {
        schemas: {},
        parameters: {},
      },
    };

    // Extract base URL from first request if possible
    const extractBaseUrl = (items: PostmanItem[]): string => {
      for (const item of items) {
        if (item.request?.url) {
          const url =
            typeof item.request.url === "string"
              ? item.request.url
              : item.request.url.raw;

          try {
            const urlObj = new URL(url.replace(/{{.*?}}/g, "placeholder"));
            return `${urlObj.protocol}//${urlObj.host}`;
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setMessage({
              type: "error",
              text: `Invalid URL: ${errorMessage}`,
            });
          }
        }
        if (item.item) {
          const baseUrl = extractBaseUrl(item.item);
          if (baseUrl !== "https://api.example.com") return baseUrl;
        }
      }
      return "https://api.example.com";
    };

    // Update server URL
    openApiSpec.servers[0].url = extractBaseUrl(postmanCollection.item);

    // Convert items to paths
    const processItems = (items: PostmanItem[], basePath = "") => {
      items.forEach((item) => {
        if (item.request) {
          // This is an endpoint
          const method = item.request.method.toLowerCase();

          let path = `/${item.name.toLowerCase().replace(/\s+/g, "-")}`;

          // Try to extract path from URL
          if (item.request.url) {
            const url =
              typeof item.request.url === "string"
                ? item.request.url
                : item.request.url.raw;

            try {
              const urlObj = new URL(url.replace(/{{.*?}}/g, "placeholder"));
              path = urlObj.pathname || path;
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              setMessage({
                type: "error",
                text: `Invalid URL: ${errorMessage}`,
              });
            }
          }

          const fullPath = basePath + path;

          if (!openApiSpec.paths[fullPath]) {
            openApiSpec.paths[fullPath] = {};
          }

          // Build operation object
          const operation: OpenApiOperation = {
            summary: item.name,
            description:
              item.description ||
              item.request.description ||
              `${method.toUpperCase()} ${fullPath}`,
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "Success",
                        },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Bad request",
              },
              "500": {
                description: "Internal server error",
              },
            },
          };

          // Add parameters from query
          if (
            item.request.url &&
            typeof item.request.url === "object" &&
            item.request.url.query
          ) {
            operation.parameters = item.request.url.query.map(
              (q: { key: string; value: string }) => ({
                name: q.key,
                in: "query",
                required: false,
                schema: {
                  type: "string",
                  example: q.value,
                },
              }),
            );
          }

          // Add request body for POST/PUT/PATCH
          if (["post", "put", "patch"].includes(method) && item.request.body) {
            operation.requestBody = {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "string",
                        example: item.request.body.raw || "Request body data",
                      },
                    },
                  },
                },
              },
            };
          }

          openApiSpec.paths[fullPath][method] = operation;
        } else if (item.item) {
          // This is a folder, process recursively
          processItems(
            item.item,
            basePath + `/${item.name.toLowerCase().replace(/\s+/g, "-")}`,
          );
        }
      });
    };

    processItems(postmanCollection.item);

    return openApiSpec;
  };

  useEffect(() => {
    const supabase = createClient();

    const fetchData = async () => {
      setIsLoading(true);
      setMessage(null);

      try {
        const { data, error } = await supabase.from("config_files").select("*");

        if (error) {
          throw new Error(error.message);
        }

        const params = apiParam;
        let matchingRecord: DatabaseRecord | null = null;

        if (!params) {
          // If no API parameter is specified, use the first available record
          if (data && data.length > 0) {
            matchingRecord = data[0];
            setMessage({
              type: "success",
              text: `No API specified, loading first available: ${matchingRecord!.title}`,
            });
          } else {
            setMessage({
              type: "warning",
              text: "No API documentation available",
            });
            return;
          }
        } else {
          matchingRecord =
            data?.find(
              (item: DatabaseRecord) =>
                slugify(item.title, { lower: true }) === params.toLowerCase(),
            ) || null;

          if (!matchingRecord) {
            setMessage({
              type: "warning",
              text: `No API documentation found for: ${params}`,
            });
            return;
          }
        }

        if (!matchingRecord) {
          setMessage({
            type: "error",
            text: "Unable to load API documentation",
          });
          return;
        }

        // At this point we know matchingRecord is not null due to the checks above
        const validRecord = matchingRecord as DatabaseRecord;

        const { data: fileData, error: fileError } = await supabase.storage
          .from("config-files")
          .download(validRecord.file_path);

        if (fileError) {
          throw new Error(`Failed to download file: ${fileError.message}`);
        }

        const fileText = await fileData.text();
        console.log(
          "File content (first 200 chars):",
          fileText.substring(0, 200),
        );

        let parsedContent;
        try {
          if (validRecord.file_type === "json") {
            parsedContent = JSON.parse(fileText);
          } else if (
            validRecord.file_type === "yaml" ||
            validRecord.file_type === "yml"
          ) {
            parsedContent = yaml.load(fileText) as Record<string, unknown>;
          } else {
            throw new Error(`Unsupported file type: ${validRecord.file_type}`);
          }
        } catch (parseError) {
          throw new Error(
            `Failed to parse content: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
          );
        }

        // Check if it's a Postman collection and convert it
        let finalSpec;
        const parsedObj = parsedContent as Record<string, unknown>;
        if (
          (parsedObj.info as Record<string, unknown>)?.schema &&
          typeof (parsedObj.info as Record<string, unknown>).schema ===
            "string" &&
          (
            (parsedObj.info as Record<string, unknown>).schema as string
          ).includes("getpostman.com")
        ) {
          console.log("Detected Postman Collection, converting to OpenAPI...");
          finalSpec = convertPostmanToOpenAPI(
            parsedContent as PostmanCollection,
          );
          console.log("Converted OpenAPI spec:", finalSpec);
        } else if (parsedObj.openapi || parsedObj.swagger) {
          console.log("Detected OpenAPI/Swagger spec");
          finalSpec = parsedContent;
        } else {
          console.warn("Unknown format, trying to render as-is");
          finalSpec = parsedContent;
        }

        setApiSpec({
          title: validRecord.title,
          slug: slugify(validRecord.title),
          content: finalSpec,
        });

        // Only set success message if we haven't already set one (for the no-params case)
        const isPostmanCollection =
          (parsedObj.info as Record<string, unknown>)?.schema &&
          typeof (parsedObj.info as Record<string, unknown>).schema ===
            "string" &&
          (
            (parsedObj.info as Record<string, unknown>).schema as string
          ).includes("getpostman.com");

        const actionText = isPostmanCollection ? "converted " : "processed ";

        setMessage({
          type: "success",
          text: `Successfully loaded and ${actionText}${validRecord.title}`,
        });
      } catch (error) {
        console.error("Error in fetchData:", error);
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to fetch API documentation",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiParam]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg">
            Loading and processing API documentation...
          </div>
        </div>
      </div>
    );
  }

  if (message && message.type !== "success") {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div
          className={`p-4 rounded-md ${
            message.type === "warning"
              ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="font-medium">
            {message.type === "warning" ? "⚠️ Warning" : "❌ Error"}
          </div>
          <div className="mt-1">{message.text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {apiSpec && (
        <div className="w-full min-h-screen">
          <ApiReferenceReact
            configuration={{
              content: apiSpec.content,
              theme: "default",
              layout: "modern",
              showSidebar: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function References() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-lg">Loading API documentation...</div>
          </div>
        </div>
      }
    >
      <ReferencesContent />
    </Suspense>
  );
}
