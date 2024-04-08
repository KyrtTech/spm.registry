export interface IRunnerPath {
  runnerName: string;
}

export const runnerSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        url: { type: "string" },
        apps: { type: "array", items: { type: "string" } },
        oss: { type: "array", items: { type: "string" } },
      },
      required: ["url"],
    },
  },
};
