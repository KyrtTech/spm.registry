import dotenv from "dotenv";
import fastify from "fastify";

dotenv.config();

const app = fastify({ logger: true });

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {
  try {
    await app.listen({ port: parseInt(process.env.PORT || "3000") }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }

      console.log(`Server listening on ${address}`);
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
