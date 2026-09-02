const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

// 1. Update openapi.json and documentation/openapi.json
const openapiJsonPath = path.join(rootDir, "openapi.json");
const docOpenapiJsonPath = path.join(rootDir, "documentation/openapi.json");

const openapiData = JSON.parse(fs.readFileSync(openapiJsonPath, "utf8"));

// Add tag if not present
if (!openapiData.tags.some((t) => t.name === "Audit")) {
  openapiData.tags.push({
    name: "Audit",
    description:
      "Automated weekly data validation pipeline, role-based model constraints enforcement, RTDB issue reporting, and one-time actionable user notification dispatching with retry on failure.",
  });
}

// Add paths
openapiData.paths["/api/audit/run"] = {
  post: {
    tags: ["Audit"],
    summary: "Run Weekly Data Audit",
    description:
      "Triggers a comprehensive read-only scan of user-generated data in Firestore (users, posts, events, chats), validates schema & role completion constraints, writes the report to RTDB (deleting previous week's report), and sends one-time notifications (with retry on failure) to non-compliant users.",
    parameters: [
      {
        name: "dryRun",
        in: "query",
        required: false,
        schema: {
          type: "boolean",
          default: false,
        },
        description:
          "If true, runs the audit without writing to RTDB or dispatching notifications.",
      },
    ],
    responses: {
      "200": {
        description: "Audit execution report",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AuditReportResponse",
            },
          },
        },
      },
      "500": {
        $ref: "#/components/responses/500InternalServerError",
      },
    },
  },
  get: {
    tags: ["Audit"],
    summary: "Run Weekly Data Audit (GET Alias)",
    description: "Browser-friendly alias to trigger the weekly data audit or dry-run.",
    parameters: [
      {
        name: "dryRun",
        in: "query",
        required: false,
        schema: {
          type: "boolean",
          default: false,
        },
        description:
          "If true, runs the audit without writing to RTDB or dispatching notifications.",
      },
    ],
    responses: {
      "200": {
        description: "Audit execution report",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AuditReportResponse",
            },
          },
        },
      },
      "500": {
        $ref: "#/components/responses/500InternalServerError",
      },
    },
  },
};

openapiData.paths["/api/audit/report"] = {
  get: {
    tags: ["Audit"],
    summary: "Get Latest Audit Report",
    description:
      "Retrieves the current active weekly data audit report from Firebase Realtime Database (audit_issues/).",
    responses: {
      "200": {
        description: "Current active audit report",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AuditReportResponse",
            },
          },
        },
      },
      "404": {
        description: "No active audit report found",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      "500": {
        $ref: "#/components/responses/500InternalServerError",
      },
    },
  },
  delete: {
    tags: ["Audit"],
    summary: "Clear Active Audit Report",
    description:
      "Deletes and clears the active weekly audit report from Realtime Database.",
    responses: {
      "200": {
        description: "Report cleared successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  example: "SUCCESS",
                },
                message: {
                  type: "string",
                  example:
                    "Audit report deleted from Realtime Database successfully.",
                },
              },
            },
          },
        },
      },
      "500": {
        $ref: "#/components/responses/500InternalServerError",
      },
    },
  },
};

openapiData.paths["/api/audit/history"] = {
  get: {
    tags: ["Audit"],
    summary: "Get Audit Notification History",
    description:
      "Returns the persistent notification history mapping (audit_notification_history/) from Realtime Database, showing delivered vs failed notification retry statuses.",
    responses: {
      "200": {
        description: "Notification dispatch history",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AuditNotificationHistoryResponse",
            },
          },
        },
      },
      "500": {
        $ref: "#/components/responses/500InternalServerError",
      },
    },
  },
};

// Add components schemas
openapiData.components.schemas.AuditReportResponse = {
  type: "object",
  properties: {
    status: {
      type: "string",
      example: "SUCCESS",
    },
    message: {
      type: "string",
      example:
        "Weekly data audit executed and persisted to Realtime Database successfully.",
    },
    meta: {
      type: "object",
      properties: {
        auditId: {
          type: "string",
          example: "audit_1788352169467",
        },
        timestamp: {
          type: "string",
          example: "2026-09-02T12:29:29.465Z",
        },
        isDryRun: {
          type: "boolean",
          example: false,
        },
        totalScanned: {
          type: "object",
          properties: {
            users: { type: "integer", example: 90 },
            posts: { type: "integer", example: 53 },
            events: { type: "integer", example: 17 },
            chats: { type: "integer", example: 19 },
          },
        },
        issueCounts: {
          type: "object",
          properties: {
            malformedIds: { type: "integer", example: 0 },
            incompleteUsers: { type: "integer", example: 63 },
            flaggedContent: { type: "integer", example: 57 },
            relationalAnomalies: { type: "integer", example: 10 },
            totalIssues: { type: "integer", example: 130 },
          },
        },
        notificationSummary: {
          type: "object",
          properties: {
            attempted: { type: "integer", example: 63 },
            sent: { type: "integer", example: 60 },
            failed: { type: "integer", example: 3 },
            skippedAlreadyNotified: { type: "integer", example: 0 },
          },
        },
      },
    },
    malformed_ids: {
      type: "object",
      additionalProperties: { type: "object" },
    },
    incomplete_users: {
      type: "object",
      additionalProperties: { type: "object" },
    },
    flagged_content: {
      type: "object",
      additionalProperties: { type: "object" },
    },
    relational_anomalies: {
      type: "object",
      additionalProperties: { type: "object" },
    },
  },
};

openapiData.components.schemas.AuditNotificationHistoryResponse = {
  type: "object",
  properties: {
    status: {
      type: "string",
      example: "SUCCESS",
    },
    data: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            example: "q3JbyQ6TxLdYQjmHqI5rAKcaTsp2",
          },
          status: {
            type: "string",
            enum: ["sent", "failed"],
            example: "sent",
          },
          sentAt: {
            type: "string",
            example: "2026-09-02T12:29:29.465Z",
          },
          lastAttemptAt: {
            type: "string",
            example: "2026-09-02T12:29:29.465Z",
          },
          missingFields: {
            type: "array",
            items: { type: "string" },
            example: ["roleData.position", "height"],
          },
          hadFcmToken: {
            type: "boolean",
            example: true,
          },
          error: {
            type: "string",
          },
        },
      },
    },
  },
};

// Write openapi.json and documentation/openapi.json
const formattedJson = JSON.stringify(openapiData, null, 2);
fs.writeFileSync(openapiJsonPath, formattedJson, "utf8");
fs.writeFileSync(docOpenapiJsonPath, formattedJson, "utf8");
console.log("✅ Updated openapi.json and documentation/openapi.json");
