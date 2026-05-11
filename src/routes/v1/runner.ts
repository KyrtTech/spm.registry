import { FastifyInstance } from "fastify";
import { IRunnerPath, runnerSchema } from "../../schemas/runner";

type RunnerInfo = {
  url: string;
  apps: string[];
  oss: string[];
};

const route = async function (fastify: FastifyInstance) {
  fastify.get<{ Params: IRunnerPath }>(
    "/runner/:runnerName",
    { schema: runnerSchema },
    async (req, resp) => {
      const session = fastify.neo4j.driver.session();

      const response = await session.run(
        fastify.cypherQueries.queries["get-runner"],
        {
          runnerName:
            "http://the-spm.org/entities/runners#" + req.params.runnerName,
        }
      );

      if (response.records.length === 0) {
        return resp.status(404).send("");
      }

      const toRet: RunnerInfo = {
        url: "",
        apps: [],
        oss: [],
      };

      response.records.forEach((node) => {
        const rel = node.get("rel");
        if (!rel) {
          return;
        }

        const connected = node.get("app");
        if (!connected) {
          return;
        }

        if (rel.type === "http://the-spm.org/schema#runsOnOperatingSystem") {
          toRet.oss.push(connected.properties.uri || "");
        }

        if (rel.type === "http://the-spm.org/schema#supportsApplication") {
          toRet.apps.push(connected.properties.uri || "");
        }
      });

      //  add the url for this
      toRet.url = response.records[0].get("runner").properties.uri;

      return toRet;
    }
  );
};

export default route;
