const InfraProvider = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    logo: { type: "string" },
    config: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          values: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                uri: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export const InfraProvidersSchema = {
  response: {
    200: {
      type: "array",
      items: InfraProvider,
      required: ["name", "description"],
    },
  },
};

export const InfraProviderSchema = {
  params: {
    name: {
      type: "string",
    },
  },
  response: {
    200: InfraProvider,
  },
};
