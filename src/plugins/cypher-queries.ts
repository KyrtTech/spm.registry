import fs from "node:fs/promises";
import fp from "fastify-plugin";

type Queries = {
  "install-strategy": string;
  "get-runner": string;
  "single-strategy": string;
  "infra-providers": string;
  "infra-provider": string;
};

// Plugin to read cypher queries from fs
const cypherQueriesPlugin = fp(
  async (fastify, opts: Record<string, string>) => {
    const files = await fs.readdir("./src/queries", { withFileTypes: true });

    const queries: Queries = {
      "install-strategy": "",
      "get-runner": "",
      "single-strategy": "",
      "infra-providers": "",
      "infra-provider": "",
    };

    for await (const file of files) {
      const fileName = file.name;

      const content = await fs.readFile("./src/queries/" + fileName);
      (queries as unknown as Record<string, string>)[fileName.split(".")[0]] =
        content.toString("utf-8");
    }

    fastify.decorate("cypherQueries", { queries });
  }
);

export default cypherQueriesPlugin;

// Extend the FastifyInstance interface to include your custom decorator
declare module "fastify" {
  export interface FastifyInstance {
    cypherQueries: {
      queries: Queries;
    };
  }
}
