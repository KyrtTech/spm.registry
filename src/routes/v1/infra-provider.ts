import { FastifyInstance } from "fastify";
import { RecordShape, Record as Neo4jRecord } from "neo4j-driver";

type ProviderSource = {
  provider: RecordShape;
  config: Map<string, RecordShape[]>;
};

const routes = async (fastify: FastifyInstance) => {
  fastify.get("/infra-providers", async () => {
    const session = fastify.neo4j.driver.session();

    const response = await session.run(
      fastify.cypherQueries.queries["infra-providers"]
    );

    return [
      ...response.records
        .reduce(
          (
            acc: Map<string, ProviderSource>,
            node: Neo4jRecord<
              RecordShape,
              PropertyKey,
              RecordShape<PropertyKey, number>
            >
          ) => {
            const name =
              node.get("provider").properties[
                "http://purl.org/dc/terms/title"
              ][0];

            if (!acc.has(name)) {
              acc.set(name, {
                provider: node.get("provider"),
                config: new Map(),
              });
            }

            if (!node.get("param")) {
              return acc;
            }

            const bag = acc.get(name);

            bag?.config.set(
              node.get("param").properties["uri"],
              node.get("values")
            );

            return acc;
          },
          new Map<string, ProviderSource>()
        )
        .values(),
    ].map(recordToProvider);
  });
};

const recordToProvider = (node: ProviderSource) => {
  return {
    name: node.provider.properties["http://purl.org/dc/terms/title"][0],
    description:
      node.provider.properties["http://purl.org/dc/terms/description"][0],
    config: [...node.config.entries()].map((entry) => ({
      name: entry[0],
      values: entry[1].map((val) => ({
        name: val.properties["http://purl.org/dc/terms/title"],
        uri: val.properties["uri"],
      })),
    })),
  };
};

export default routes;
