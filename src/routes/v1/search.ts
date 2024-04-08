import { FastifyInstance } from "fastify";

import {
  IFindStrategyQuery,
  findInstallStrategySchema,
} from "../../schemas/install-strategy";

import { ISearchQuery, searchSchema } from "../../schemas/search";
import { Node, PathSegment } from "neo4j-driver";

type StrategyAddOn = {
  scripts?: String[];
  optionalParams?: String[];
  requiredParams?: String[];
  producesParams?: String[];
  runner?: String[];
};
type Strategy = Node & StrategyAddOn & { downloadURL?: String };

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

const addExtraRelInfo = (
  relType: string,
  node: Strategy,
  segment: PathSegment,
  key: keyof StrategyAddOn
) => {
  if (segment.relationship.type === relType) {
    if (!node[key]) {
      node[key] = [];
    }

    const whereToPush = node[key] || [];

    whereToPush.push(segment.end.properties["uri"]);
  }
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
      }, new Map<string, PathSegment[]>());

      const deduped = Array(...reduced.values()).map((el) => {
        if (el[0].relationship.startNodeElementId !== el[0].start.elementId) {
          const tmp = el[0].start;
          el[0].start = el[0].end;
          el[0].end = tmp;
        }

        return el[0];
      });

      const installStrategiesAndScripts: PathSegment[] = deduped.filter(
        (segment) =>
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

          if (!start) {
            return acc;
          }

          addExtraRelInfo(
            "http://the-spm.org/schema#installScripts",
            start,
            segment,
            "scripts"
          );

          addExtraRelInfo(
            "http://the-spm.org/schema#optionalParam",
            start,
            segment,
            "optionalParams"
          );

          addExtraRelInfo(
            "http://the-spm.org/schema#requiresParam",
            start,
            segment,
            "requiredParams"
          );

          addExtraRelInfo(
            "http://the-spm.org/schema#executedOnRunner",
            start,
            segment,
            "runner"
          );

          addExtraRelInfo(
            "http://the-spm.org/schema#producesParam",
            start,
            segment,
            "producesParams"
          );

          return acc;
        },
        new Map<string, Strategy>()
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
          targetAppSegment?.start.properties[
            "http://the-spm.org/schema#downloadURL"
          ]?.[0] ||
          targetAppSegment?.end.properties[
            "http://the-spm.org/schema#downloadURL"
          ]?.[0];
      });

      return strategies.map((strategy) => {
        return {
          title: strategy.properties["http://purl.org/dc/terms/title"],
          description:
            strategy.properties["http://purl.org/dc/terms/description"],
          downloadURL: strategy.downloadURL,
          scripts: strategy.scripts,
          optionalParams: strategy.optionalParams || [],
          producesParams: strategy.producesParams || [],
          runner: strategy.runner?.[0],
        };
      });
    }
  );
};

export default route;
