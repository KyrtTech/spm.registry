export interface IFindStrategyQuery {
  application: string;
  infra: string;
}

export type StrategyOutput = {
  title: string;
  description: string;
  uri: string;
  downloadURL: string | undefined;
  scripts: string[] | undefined;
  optionalParams: {
    name: string;
    param: string;
    description?: string;
  }[];
  producesParams: string[];
  alternatives: StrategyOutput[];
  runner: string | undefined;
};

export const findInstallStrategySchema = {
  querystring: {
    type: "object",
    properties: {
      application: { type: "string" },
      infra: { type: "string" },
    },
    required: ["infra", "application"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
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
        },
        required: ["title", "description", "scripts", "optionalParams", "uri"],
      },
    },
  },
};
