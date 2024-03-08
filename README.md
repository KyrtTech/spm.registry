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
