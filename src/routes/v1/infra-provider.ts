import { FastifyInstance } from "fastify";
import { RecordShape, Record as Neo4jRecord } from "neo4j-driver";

import {
  InfraProviderSchema,
  InfraProvidersSchema,
} from "../../schemas/infra-provider";

type ProviderSource = {
  provider: RecordShape;
  config: Map<string, RecordShape[]>;
  logo: RecordShape;
};

const routes = async (fastify: FastifyInstance) => {
  fastify.get(
    "/infra-providers",
    { schema: InfraProvidersSchema },
    async () => {
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
                  logo: node.get("logo"),
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
    }
  );

  fastify.get(
    "/infra-provider/:name",
    { schema: InfraProviderSchema },
    async (request) => {
      const session = fastify.neo4j.driver.session();

      const response = await session.run(
        fastify.cypherQueries.queries["infra-provider"],
        {
          provider: `http://the-spm.org/entities/cloud_providers/${
            (request.params as any).name
          }`,
        }
      );

      const firstNode = response.records[0];

      const provider: ProviderSource = {
        provider: firstNode.get("provider"),
        config: new Map(),
        logo: firstNode.get("logo"),
      };

      response.records.forEach((node) => {
        if (!node.get("param")) {
          return;
        }

        provider.config.set(
          node.get("param").properties["uri"],
          node.get("values")
        );
      });

      return recordToProvider(provider);
    }
  );
};

const recordToProvider = (node: ProviderSource) => {
  return {
    name: node.provider.properties["http://purl.org/dc/terms/title"][0],
    description:
      node.provider.properties["http://purl.org/dc/terms/description"][0],
    logo: node.logo.properties["uri"],
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
