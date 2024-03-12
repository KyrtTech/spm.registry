import { FastifyInstance } from "fastify";

interface ISearchQuery {
  name: string;
  type: "platform" | "install-strategy" | "infra-provider";
}

const searchSchema = {
  querystring: {
    type: "object",
    properties: {
      name: { type: "string" },
      type: {
        type: "string",
        enum: ["platform", "install-strategy", "infra-provider"],
      },
    },
    required: ["name", "type"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          labels: {
            type: "array",
          },
          uri: {
            type: "string",
          },
        },
      },
    },
  },
};

interface IFindStrategyQuery {
  application: string;
  infra: string;
}

const findInstallStrategySchema = {
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
          scripts: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    },
  },
};

const searchParamsToNeo4j = (
  type: "platform" | "install-strategy" | "infra-provider",
  name: string
) => {
  const typeToFragment = {
    platform: "DevelopmentPlatform",
    "install-strategy": "InstallStrategy",
    "infra-provider": "CloudProvider",
  };

  const typeToURI = {
    platform: "platforms",
    "install-strategy": "install-strategies",
    "infra-provider": "cloud-providers",
  };

  return {
    uri: `http://the-spm.org/entities/${typeToURI[type]}/${name}`,
    label: `\`http://the-spm.org/schema#${typeToFragment[type]}\``,
  };
};

const route = async function (fastify: FastifyInstance) {
  fastify.get<{ Querystring: ISearchQuery }>(
    "/search",
    { schema: searchSchema },
    async (req, resp) => {
      const session = fastify.neo4j.driver.session();

      const { name, type } = req.query;

      const params = searchParamsToNeo4j(type, name);

      const result = await session.run(
        `MATCH (n:${params.label}) WHERE n.uri = $uri RETURN n LIMIT 20`,
        { uri: params.uri }
      );

      const mapped = result.records.map((record) => {
        const node = record.get("n");

        return {
          id: node.identity.toInt(),
          labels: node.labels,
          uri: node.properties.uri,
        };
      });

      return mapped;
    }
  );

  fastify.get<{ Querystring: IFindStrategyQuery }>(
    "/find-install-strategy",
    { schema: findInstallStrategySchema },
    async (req, resp) => {
      const session = fastify.neo4j.driver.session();

      const { application, infra } = req.query;

      const neo4jResult = await session.run(
        "MATCH (strategy)-[:`http://the-spm.org/schema#targetsApplication`]->(application), (strategy)-[:`http://the-spm.org/schema#usesInfrastructureProvider`]->(infra), (strategy)-[:`http://the-spm.org/schema#installScripts`]->(script) WHERE application.uri = $application AND infra.uri = $infra RETURN strategy, COLLECT(script) as scripts",
        {
          application: "http://the-spm.org/entities/platforms/" + application,
          infra: "http://the-spm.org/entities/cloud_providers/" + infra,
        }
      );

      const result = neo4jResult.records.map((result) => {
        const strategy = result.get("strategy");
        const scripts = result.get("scripts");

        return {
          title: strategy.properties["http://purl.org/dc/terms/title"],
          description:
            strategy.properties["http://purl.org/dc/terms/description"],
          scripts: scripts.map((script: any) => script.properties["uri"]),
        };
      });

      return result;
    }
  );
};

export default route;
