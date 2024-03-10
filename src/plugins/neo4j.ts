import fp from "fastify-plugin";
import neo4j, { Driver } from "neo4j-driver";

// Plugin to connect to Neo4j
const neo4jPlugin = fp(async (fastify, opts: Record<string, string>) => {
  const uri = opts.uri || "bolt://localhost:7687";
  const user = opts.user || "neo4j";
  const password = opts.password || "neo4j";

  const driver: Driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  fastify.decorate("neo4j", { driver });

  fastify.addHook("onClose", async () => {
    await driver.close();
  });
});

export default neo4jPlugin;

// Extend the FastifyInstance interface to include your custom decorator
declare module "fastify" {
  export interface FastifyInstance {
    neo4j: {
      driver: Driver;
    };
  }
}
