import { FastifyInstance } from "fastify";

import {
  IFindStrategyQuery,
  StrategyOutput,
  StrategyOutputSchema,
  findInstallStrategySchema,
} from "../../schemas/install-strategy";

import { ISearchQuery, searchSchema } from "../../schemas/search";
import { Node, PathSegment } from "neo4j-driver";
import {
  findPaths,
  StrategyAddOn,
  StrategyArg,
  StrategyArgs,
} from "../../graph/strategy";
import { DepParam } from "../../graph/dependency-params";
import { extractValueFromNodeProperty } from "../../utils/convert";

type Strategy = Node &
  StrategyAddOn &
  StrategyArgs & { downloadURL?: string; id: string; targets: string };

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

const addSupportFileInfo = (node: Strategy, segment: PathSegment) => {
  if (segment.relationship.type !== "http://the-spm.org/schema#supportFiles") {
    return;
  }

  if (!node.supportFiles) {
    node.supportFiles = [];
  }

  node.supportFiles.push({
    accessUrl:
      segment.end.properties[
        "http://the-spm.org/entities/install-strategies/accessUrl"
      ],
    localPath:
      segment.end.properties[
        "http://the-spm.org/entities/install-strategies/localPath"
      ],
  });
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

const addArgInfo = (
  relType: string,
  node: Strategy,
  segment: PathSegment,
  key: keyof StrategyArgs,
  deduped: PathSegment[]
) => {
  if (segment.relationship.type === relType) {
    if (!node[key]) {
      node[key] = [];
    }

    const whereToPush = node[key] || [];

    const argNode = segment.end;

    //  find param rel
    const paramLink = deduped.filter(
      (s) =>
        s.relationship.type === "http://the-spm.org/schema#argumentType" &&
        (s.start.elementId === argNode.elementId ||
          s.end.elementId === argNode.elementId)
    );

    //  find allowedValues
    const allowedValues = deduped.filter(
      (s) =>
        s.relationship.type === "http://the-spm.org/schema#allowedValues" &&
        (s.start.elementId === argNode.elementId ||
          s.end.elementId === argNode.elementId)
    );

    const newElem: StrategyArg = {
      name: segment.end.properties["uri"],
      values: allowedValues.map((s) => {
        const paramNode =
          s.start.elementId === argNode.elementId ? s.end : s.start;

        return paramNode.properties["uri"];
      }),
      param: "",
    };

    if (paramLink[0]) {
      const paramNode =
        paramLink[0].start.elementId === argNode.elementId
          ? paramLink[0].end
          : paramLink[0].start;

      newElem.param = paramNode.properties["uri"];
      newElem.description =
        argNode.properties[
          "http://the-spm.org/schema#argumentDescription"
        ]?.[0];
    }

    whereToPush.push(newElem);
  }
};

const route = async function (fastify: FastifyInstance) {
  fastify.addSchema(StrategyOutputSchema);

  fastify.get<{ Querystring: ISearchQuery }>(
    "/search",
    { schema: searchSchema },
    async (req, resp) => {
      const session = fastify.neo4j.driver.session();

      const { name, type } = req.query;

      const params = searchParamsToNeo4j(type, name);

      const neo4jResult = await session.run(
        fastify.cypherQueries.queries["single-strategy"],
        { strategy: params.uri }
      );

      if (neo4jResult.records.length === 0) {
        return resp.code(404).send("");
      }

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

      const installStrategy: Strategy = {
        ...deduped[0].start,
        id: params.uri,
        targets: "",
      };

      deduped.forEach((segment) => {
        enrichStrategyWithInfo(installStrategy, segment, deduped);
      });

      return strategyToOutput(installStrategy);
    }
  );

  fastify.get<{ Querystring: IFindStrategyQuery }>(
    "/find-install-plan",
    { schema: findInstallStrategySchema },
    async (req, resp) => {
      const session = fastify.neo4j.driver.session();

      const { application, infra } = req.query;

      const appFullName = "http://the-spm.org/entities/services/" + application;
      const infraFullName =
        "http://the-spm.org/entities/cloud_providers/" + infra;

      const neo4jResult = await session.run(
        fastify.cypherQueries.queries["install-strategy"],
        {
          application: appFullName,
          infra: infraFullName,
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

      if (reduced.size === 0) {
        return [];
      }

      const deduped = Array(...reduced.values()).map((el) => {
        if (el[0].relationship.startNodeElementId !== el[0].start.elementId) {
          const tmp = el[0].start;
          el[0].start = el[0].end;
          el[0].end = tmp;
        }

        return el[0];
      });

      const serviceLinks = deduped.filter(
        (seg) =>
          seg.start.properties.uri === appFullName ||
          seg.end.properties.uri === appFullName
      );

      //  get deps
      const serviceParamDeps = serviceLinks.filter(
        (seg) =>
          seg.relationship.type ===
          "http://the-spm.org/schema#serviceHasDependencyParameter"
      );

      const params: DepParam[] = [];

      serviceParamDeps.forEach((serviceParam) => {
        const node = serviceParam.end.labels.some(
          (l) => l === "http://the-spm.org/schema#ParameterDependency"
        )
          ? serviceParam.end
          : serviceParam.start;

        //  search for apps that the params are working on
        const appRel = deduped.find(
          (path) =>
            path.relationship.type ===
              "http://the-spm.org/schema#onApplication" &&
            (path.end.elementId === node.elementId ||
              path.start.elementId === node.elementId)
        );

        let appURI = "";

        if (appRel) {
          const app =
            appRel.end.elementId === node.elementId ? appRel.start : appRel.end;

          appURI = app.properties.uri;
        }

        const originalParam = deduped.find(
          (path) =>
            path.relationship.type ===
              "http://the-spm.org/schema#onParameter" &&
            (path.start.elementId === node.elementId ||
              path.end.elementId === node.elementId)
        );

        params.push({
          type: node.properties.uri,
          forApp: appURI,
          minValue: extractValueFromNodeProperty(
            node.properties["http://the-spm.org/schema#minValue"]
          ),
          recommendedValue: extractValueFromNodeProperty(
            node.properties["http://the-spm.org/schema#recommendedValue"]
          ),
          spmParam:
            originalParam?.end.elementId === node.elementId
              ? originalParam?.start.properties.uri
              : originalParam?.end.properties.uri,
        });
      });

      const strategiesToParams: Map<string, DepParam[]> = params.reduce(
        (acc, param) => {
          if (!acc.has(param.forApp)) {
            acc.set(param.forApp, []);
          }

          acc.get(param.forApp)?.push(param);

          return acc;
        },
        new Map()
      );

      const installStrategiesAndScripts: PathSegment[] = deduped.filter(
        (segment) =>
          segment.start.labels.find(
            (l: string) => l === "http://the-spm.org/schema#InstallStrategy"
          )
      );

      const installStrategiesWithScripts = installStrategiesAndScripts.reduce(
        (acc, segment) => {
          const id = segment.start.elementId;

          if (!acc.has(id)) {
            acc.set(id, {
              ...segment.start,
              id: segment.start.properties.uri,
              targets: "",
            });
          }

          const start = acc.get(segment.start.elementId);

          if (!start) {
            return acc;
          }

          enrichStrategyWithInfo(start, segment, deduped);

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
            segment.start.elementId === id
        );

        if (
          targetAppSegment?.start.properties[
            "http://the-spm.org/schema#downloadURL"
          ]?.[0]
        ) {
          strategy.downloadURL =
            targetAppSegment?.start.properties[
              "http://the-spm.org/schema#downloadURL"
            ]?.[0];
          strategy.targets = targetAppSegment?.start.properties["uri"];
        } else {
          strategy.downloadURL =
            targetAppSegment?.end.properties[
              "http://the-spm.org/schema#downloadURL"
            ]?.[0];
          strategy.targets = targetAppSegment?.end.properties["uri"];
        }
      });

      const startStrategy = strategies.find((s) => s.targets === appFullName);

      if (!startStrategy) {
        return [];
      }

      const nodes = findPaths(startStrategy, strategies);

      //  add dep params to each strategy
      strategies.forEach((strategy) => {
        const depParams = strategiesToParams.get(strategy.targets);

        if (!depParams) {
          return;
        }

        strategy.requirementParams = depParams;
      });

      const strategiesOutput = strategies.map(strategyToOutput);

      const filteredStrategies: StrategyOutput[] = [];

      for (let node of nodes) {
        const strategy = strategiesOutput.find((s) => s.uri === node.id);

        if (!strategy) {
          continue;
        }

        //  lets populate with the alternatives
        for (let alternative of node.perfectAlternatives) {
          const altStrategy = strategiesOutput.find(
            (s) => s.uri === alternative.id
          );

          if (!altStrategy) {
            continue;
          }

          strategy.alternatives.push(altStrategy);
        }

        filteredStrategies.push(strategy);
      }

      return filteredStrategies;
    }
  );
};

function enrichStrategyWithInfo(
  start: Strategy,
  segment: PathSegment,
  extra: PathSegment[]
) {
  addExtraRelInfo(
    "http://the-spm.org/schema#installScripts",
    start,
    segment,
    "scripts"
  );

  addExtraRelInfo(
    "http://the-spm.org/schema#uninstallScripts",
    start,
    segment,
    "uninstallScripts"
  );

  addSupportFileInfo(start, segment);

  addArgInfo(
    "http://the-spm.org/schema#optionalArgument",
    start,
    segment,
    "optionalArgs",
    extra
  );

  addArgInfo(
    "http://the-spm.org/schema#requiresArgument",
    start,
    segment,
    "requiredArgs",
    extra
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
}

function strategyToOutput(strategy: Strategy): StrategyOutput {
  return {
    title: strategy.properties["http://purl.org/dc/terms/title"][0],
    description: strategy.properties["http://purl.org/dc/terms/description"][0],
    uri: strategy.id,
    downloadURL: strategy.downloadURL,
    scripts: strategy.scripts || [],
    uninstallScripts: strategy.uninstallScripts,
    supportFiles: strategy.supportFiles || [],
    optionalParams: strategy.optionalArgs || [],
    producesParams: strategy.producesParams || [],
    requirementParams: strategy.requirementParams || [],
    alternatives: [],
    runner: strategy.runner?.[0],
  };
}

export default route;
