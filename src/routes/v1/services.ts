import { FastifyInstance } from "fastify";
import { RecordShape, Record as Neo4jRecord } from "neo4j-driver";
import { ServicesSchema } from "../../schemas/service";

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
          node.get("service").properties["http://purl.org/dc/terms/title"][0];

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
    name: node.service.properties["http://purl.org/dc/terms/title"][0],
    description:
      node.service.properties["http://purl.org/dc/terms/description"]?.[0],
    version:
      node.service.properties["http://the-spm.org/schema#hasSemanticVersion"]?.[0],
    logo: node.logo.properties["uri"],
    downloadUrl: node.service.properties["http://the-spm.org/schema#downloadURL"]?.[0],
    dependsOn: node.dependson.map(dep => ({
      name: dep.properties["http://purl.org/dc/terms/title"]?.[0],
      uri: dep.properties["uri"],
      version: dep.properties["http://the-spm.org/schema#hasSemanticVersion"]?.[0]
    }))
  };
};

export default routes;
