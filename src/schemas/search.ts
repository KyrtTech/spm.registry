export interface ISearchQuery {
  name: string;
  type: "platform" | "install-strategy" | "infra-provider";
}

export const searchSchema = {
  querystring: {
    type: "object",
    properties: {
      name: { type: "string" },
      type: {
        type: "string",
        enum: ["platform", "install-strategy", "infra-provider"],
      },
    },
    required: ["name", "type"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        uri: { type: "string" },
        downloadURL: { type: "string" },
        optionalParams: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              param: { type: "string" },
              description: { type: "string" },
            },
            required: ["name"],
          },
        },
        producesParams: { type: "array", items: { type: "string" } },
        runner: { type: "string" },
        scripts: {
          type: "array",
          items: {
            type: "string",
          },
        },
        uninstallScripts: {
          type: "array",
          items: {
            type: "string",
          },
        },
        supportFiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              accessUrl: { type: "string" },
              localPath: { type: "string" },
            },
          },
        },
      },
      required: ["title", "description", "scripts", "optionalParams", "uri"],
    },
  },
};
