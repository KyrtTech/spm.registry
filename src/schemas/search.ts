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
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          labels: {
            type: "array",
          },
          uri: {
            type: "string",
          },
        },
      },
    },
  },
};
