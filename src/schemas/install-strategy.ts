import { DepParam } from "../graph/dependency-params";

export interface IFindStrategyQuery {
  application: string;
  infra: string;
}

export type SupportFile = {
  accessUrl: string;
  localPath: string;
};

export type StrategyOutput = {
  title: string;
  description: string;
  uri: string;
  downloadURL: string | undefined;
  scripts: string[] | undefined;
  uninstallScripts: string[] | undefined;
  supportFiles: SupportFile[] | undefined;
  optionalParams: {
    name: string;
    param: string;
    values: string[];
    description?: string;
  }[];
  producesParams: string[];
  requirementParams: DepParam[];
  alternatives: StrategyOutput[];
  runner: string | undefined;
};

export const StrategyOutputSchema = {
  $id: "strategyOutput",
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
          values: { type: "array", items: { type: "string" } },
          description: { type: "string" },
        },
        required: ["name"],
      },
    },
    producesParams: { type: "array", items: { type: "string" } },
    requirementParams: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          minValue: { type: "string" },
          recommendedValue: { type: "string" },
          spmParam: { type: "string" },
        },
        required: ["type"],
      },
    },
    alternatives: {
      type: "array",
      items: { $ref: "strategyOutput" },
    },
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
      items: { $ref: "strategyOutput" },
    },
  },
};
