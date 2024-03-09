import dotenv from "dotenv";
import fastify from "fastify";

import neo4jPlugin from "./neo4jPlugin";

dotenv.config();

const app = fastify({ logger: true });

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
