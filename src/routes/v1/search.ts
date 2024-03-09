import { FastifyInstance } from "fastify";

const route = async function (fastify: FastifyInstance) {
  fastify.get("/search", async (req, resp) => {
    const session = fastify.neo4j.driver.session();
    const result = await session.run("MATCH (n) RETURN n LIMIT 10");

    return { data: result.records };
  });
};

export default route;
