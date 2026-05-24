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

## Importing ontology data

Ontology data is loaded into Neo4j from the Turtle files in `spm.knowledge_domain` using the Neo4j neosemantics (`n10s`) plugin. A reusable Cypher script is available at `scripts/import-ontology.cypher`.

The ontology keeps semantic versions as domain values, for example `spm:hasSemanticVersion`, `spm:minSemanticVersion`, and `spm:maxSemanticVersion`. Neo4j import should enrich those values with query-only padded key properties so Cypher can compare versions efficiently.

After running the `n10s.rdf.import.fetch(...)` calls, run the following post-import step:

```cypher
// Concrete versioned applications, platforms, runners, etc.
MATCH (n)
WHERE n.`http://the-spm.org/schema#hasSemanticVersion` IS NOT NULL
WITH n, n.`http://the-spm.org/schema#hasSemanticVersion`[0] AS version
WHERE version =~ '^\\d+(\\.\\d+){0,2}$'
WITH n, split(version, '.') AS parts
WITH n,
     toInteger(parts[0]) AS major,
     toInteger(coalesce(parts[1], '0')) AS minor,
     toInteger(coalesce(parts[2], '0')) AS patch
SET n.semverMajor = major,
    n.semverMinor = minor,
    n.semverPatch = patch,
    n.semverKey =
      right('000000000000' + toString(major), 12) + '.' +
      right('000000000000' + toString(minor), 12) + '.' +
      right('000000000000' + toString(patch), 12);

// Dependency requirement minimum versions.
MATCH (req)
WHERE req.`http://the-spm.org/schema#minSemanticVersion` IS NOT NULL
WITH req, req.`http://the-spm.org/schema#minSemanticVersion`[0] AS version
WHERE version =~ '^\\d+(\\.\\d+){0,2}$'
WITH req, split(version, '.') AS parts
WITH req,
     toInteger(parts[0]) AS major,
     toInteger(coalesce(parts[1], '0')) AS minor,
     toInteger(coalesce(parts[2], '0')) AS patch
SET req.minSemverMajor = major,
    req.minSemverMinor = minor,
    req.minSemverPatch = patch,
    req.minSemverKey =
      right('000000000000' + toString(major), 12) + '.' +
      right('000000000000' + toString(minor), 12) + '.' +
      right('000000000000' + toString(patch), 12);

// Dependency requirement maximum versions.
MATCH (req)
WHERE req.`http://the-spm.org/schema#maxSemanticVersion` IS NOT NULL
WITH req, req.`http://the-spm.org/schema#maxSemanticVersion`[0] AS version
WHERE version =~ '^\\d+(\\.\\d+){0,2}$'
WITH req, split(version, '.') AS parts
WITH req,
     toInteger(parts[0]) AS major,
     toInteger(coalesce(parts[1], '0')) AS minor,
     toInteger(coalesce(parts[2], '0')) AS patch
SET req.maxSemverMajor = major,
    req.maxSemverMinor = minor,
    req.maxSemverPatch = patch,
    req.maxSemverKey =
      right('000000000000' + toString(major), 12) + '.' +
      right('000000000000' + toString(minor), 12) + '.' +
      right('000000000000' + toString(patch), 12);
```

The padded key format is:

```text
major.minor.patch -> 12-digit padded components
16.3           -> 000000000016.000000000003.000000000000
22631.2428     -> 000000022631.000000002428.000000000000
```

This treats missing minor or patch values as `0`, so `16.3` is keyed as `16.3.0`. Padded string keys avoid arbitrary per-component limits such as assuming minor and patch values are below `1000`; this matters for versions like Windows `22631.2428`. The import step currently supports plain numeric semantic versions only. Versions with prerelease/build metadata such as `1.0.0-beta.1` are intentionally skipped by the regex until the resolver supports those semantics.

With padded keys present, requirement matching can stay in Cypher:

```cypher
MATCH (svc {uri: $application})
MATCH (svc)-[:`http://the-spm.org/schema#dependsOnApplicationRequirement`]->(req)
MATCH (req)-[:`http://the-spm.org/schema#requiresApplicationFamily`]->(family)
MATCH (app)-[:`http://the-spm.org/schema#applicationBelongsToFamily`]->(family)
MATCH (strategy)-[:`http://the-spm.org/schema#targetsApplication`]->(app)
MATCH (strategy)-[:`http://the-spm.org/schema#usesInfrastructureProvider`]->(infra {uri: $infra})
WHERE app.semverKey >= req.minSemverKey
  AND app.semverKey < req.maxSemverKey
RETURN req, family, app, strategy
ORDER BY req.uri, app.semverKey DESC;
```
