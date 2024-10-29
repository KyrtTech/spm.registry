export const InfraProvidersSchema = {
  response: {
    200: {
      type: "array",
      items: {
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
      },
      required: ["name", "description"],
    },
  },
};
