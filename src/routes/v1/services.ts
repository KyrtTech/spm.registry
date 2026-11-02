import { FastifyInstance } from "fastify";
import { RecordShape, Record as Neo4jRecord } from "neo4j-driver";
import { ServicesSchema } from "../../schemas/service";
import { extractValueFromNodeProperty } from "../../utils/convert";

type ServiceSource = {
  service: RecordShape;
  dependson: RecordShape[];
  logo: RecordShape;
};

const routes = async (fastify: FastifyInstance) => {
  fastify.get("/services", { schema: ServicesSchema }, async () => {
    const session = fastify.neo4j.driver.session();

    const response = await session.run(
      fastify.cypherQueries.queries["services"]
    );

    const agg = response.records.reduce(
      (
        acc: Map<string, ServiceSource>,
        node: Neo4jRecord<
          RecordShape,
          PropertyKey,
          RecordShape<PropertyKey, number>
        >
      ) => {
        const name =
          extractValueFromNodeProperty(node.get("service").properties["http://purl.org/dc/terms/title"]);

        if (!acc.has(name)) {
          acc.set(name, {
            service: node.get("service"),
            dependson: [],
            logo: node.get("logo"),
          });
        }

        if (!node.get("depends")) {
          return acc;
        }

        acc.get(name)?.dependson.push(node.get("depends"));

        return acc;
      },
      new Map<string, ServiceSource>()
    );

    return [...agg.values()].map(recordToService);
  });
};

const recordToService = (node: ServiceSource) => {
  return {
    name: extractValueFromNodeProperty(node.service.properties["http://purl.org/dc/terms/title"]),
    description:
      extractValueFromNodeProperty(node.service.properties["http://purl.org/dc/terms/description"]),
    version:
      extractValueFromNodeProperty(node.service.properties["http://the-spm.org/schema#hasSemanticVersion"]),
    logo: node.logo.properties["uri"],
    downloadUrl: extractValueFromNodeProperty(node.service.properties["http://the-spm.org/schema#downloadURL"]),
    dependsOn: node.dependson.map(dep => ({
      name: extractValueFromNodeProperty(dep.properties["http://purl.org/dc/terms/title"]),
      uri: dep.properties["uri"],
      version: extractValueFromNodeProperty(dep.properties["http://the-spm.org/schema#hasSemanticVersion"])
    }))
  };
};

export default routes;
