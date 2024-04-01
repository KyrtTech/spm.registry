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
          downloadURL: { type: "string" },
          optionalParams: { type: "array", items: { type: "string" } },
          scripts: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        required: ["title", "description", "scripts", "optionalParams"],
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
        fastify.cypherQueries.queries["install-strategy"],
        {
          application: "http://the-spm.org/entities/services/" + application,
          infra: "http://the-spm.org/entities/cloud_providers/" + infra,
        }
      );

      const reduced = neo4jResult.records.reduce((acc, current) => {
        for (const segment of current.get("path")?.segments) {
          const relId: string = segment.relationship?.elementId || "";

          if (!acc.has(relId)) {
            acc.set(relId, []);
          }

          acc.get(relId)?.push(segment);
        }

        return acc;
      }, new Map<string, any[]>());

      const deduped = Array(...reduced.values()).map((el) => el[0]);

      const installStrategiesAndScripts = deduped.filter((segment) =>
        segment.start.labels.find(
          (l: string) => l === "http://the-spm.org/schema#InstallStrategy"
        )
      );

      const installStrategiesWithScripts = installStrategiesAndScripts.reduce(
        (acc, segment) => {
          if (!acc.has(segment.start.elementId)) {
            acc.set(segment.start.elementId, segment.start);
          }

          const start = acc.get(segment.start.elementId);

          if (
            segment.relationship.type ===
            "http://the-spm.org/schema#installScripts"
          ) {
            if (!start.scripts) {
              start.scripts = [];
            }

            start.scripts.push(segment.end.properties["uri"]);
          }

          if (
            segment.relationship.type ===
            "http://the-spm.org/schema#optionalParam"
          ) {
            if (!start.optionalParams) {
              start.optionalParams = [];
            }

            start.optionalParams.push(segment.end.properties["uri"]);
          }

          return acc;
        },
        new Map<string, any>()
      );

      //  add downloadURL to install strategies if available
      const strategies = Array(...installStrategiesWithScripts.values());

      strategies.forEach((strategy) => {
        //  find a link between this strategy and the application
        const id = strategy.elementId;

        const targetAppSegment = deduped.find(
          (segment) =>
            segment.relationship.type ===
              "http://the-spm.org/schema#targetsApplication" &&
            (segment.start.elementId === id || segment.end.elementId === id)
        );

        strategy.downloadURL =
          targetAppSegment.start.properties[
            "http://the-spm.org/schema#downloadURL"
          ]?.[0] ||
          targetAppSegment.end.properties[
            "http://the-spm.org/schema#downloadURL"
          ]?.[0];
      });

      return strategies.map((strategy: any) => {
        return {
          title: strategy.properties["http://purl.org/dc/terms/title"],
          description:
            strategy.properties["http://purl.org/dc/terms/description"],
          downloadURL: strategy.downloadURL,
          scripts: strategy.scripts,
          optionalParams: strategy.optionalParams || [],
        };
      });
    }
  );
};

export default route;
