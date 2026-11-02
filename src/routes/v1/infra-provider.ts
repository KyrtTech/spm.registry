import { FastifyInstance } from "fastify";
import { RecordShape, Record as Neo4jRecord } from "neo4j-driver";

import {
  InfraProviderSchema,
  InfraProvidersSchema,
} from "../../schemas/infra-provider";
import { extractValueFromNodeProperty } from "../../utils/convert";

type ProviderSource = {
  provider: RecordShape;
  config: Map<string, { values: RecordShape[]; isBuildable: boolean }>;
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
                extractValueFromNodeProperty(node.get("provider").properties[
                  "http://purl.org/dc/terms/title"
                ]);

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

              bag?.config.set(node.get("param").properties["uri"], {
                values: node.get("values"),
                isBuildable:
                  extractValueFromNodeProperty(node.get("param").properties[
                    "http://the-spm.org/schema#isBuildable"
                  ]) || false,
              });

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
    async (request, reply) => {
      const session = fastify.neo4j.driver.session();

      const response = await session.run(
        fastify.cypherQueries.queries["infra-provider"],
        {
          provider: `http://the-spm.org/entities/cloud_providers#${
            (request.params as any).name
          }`,
        }
      );

      if (response.records.length === 0) {
        reply.code(404);
        return;
      }

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

        provider.config.set(node.get("param").properties["uri"], {
          values: node.get("values"),
          isBuildable:
            extractValueFromNodeProperty(node.get("param").properties[
              "http://the-spm.org/schema#isBuildable"
            ]) || false,
        });
      });

      return recordToProvider(provider);
    }
  );
};

const recordToProvider = (node: ProviderSource) => {
  return {
    title: extractValueFromNodeProperty(node.provider.properties["http://purl.org/dc/terms/title"]),
    name: node.provider.properties["uri"].split("#")[1],
    description:
      extractValueFromNodeProperty(node.provider.properties["http://purl.org/dc/terms/description"]),
    logo: node.logo.properties["uri"],
    config: [...node.config.entries()].map((entry) => ({
      name: entry[0],
      isBuildable: entry[1].isBuildable,
      values: entry[1].values.map((val) => ({
        name: extractValueFromNodeProperty(val.properties["http://purl.org/dc/terms/title"]),
        uri: val.properties["uri"],
      })),
    })),
  };
};

export default routes;
