import dotenv from "dotenv";
import fastify from "fastify";

import neo4jPlugin from "./plugins/neo4j";

dotenv.config();

const app = fastify({ logger: true });

app.register(require("@fastify/swagger"), {
  openapi: {
    info: {
      title: "SPM Registry",
      description: "Doc for SPM REST API",
      version: "0.1.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {},
    },
  },
  hideUntagged: true,
});

app.register(require("@fastify/swagger-ui"), {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (request: any, reply: any, next: () => void) {
      next();
    },
    preHandler: function (request: any, reply: any, next: () => void) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header: any) => header,
  transformSpecification: (swaggerObject: any, request: any, reply: any) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

app.register(neo4jPlugin, {
  uri: process.env.NEO4J_URI || "",
  user: process.env.NEO4J_USER || "",
  password: process.env.NEO4J_PASSWORD || "",
});

app.register(import("./routes/v1/search"), { prefix: "v1" });

const start = async () => {
  try {
    await app.listen(
      { port: parseInt(process.env.PORT || "3000") },
      (err, address) => {
        if (err) {
          app.log.error(err);
          process.exit(1);
        }

        console.log(`Server listening on ${address}`);
      }
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
