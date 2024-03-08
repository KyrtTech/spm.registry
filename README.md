# Service Package Manager - Registry

The main registry for SPM.

## Structure
This is a NodeJS with TS project.

Source files are found under `src`.

## How does this work

Main database is an `neo4j` instance. 

The registry is a REST API that allows for:
- searching for `services` and `install strategies`
- resolving the deps for a particular `service` and/or `install strategies`

## How to run

### Dev

Copy `.env.example` to `.env`.

Fill in the env vars, you should see some pointers for some of them.

Run `npm run dev`.

> We are using `nodemon` so the development server is restarting when a change in the `src` folder is noticed.

