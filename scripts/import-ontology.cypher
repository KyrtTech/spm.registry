// Reload ontology data.
MATCH (n:!_GraphConfig) DETACH DELETE n;

// Replace path_to with the actual path to the ontology files.

CALL n10s.rdf.import.fetch("path_to/spm.knowledge_domain/ontology/entities/package_manager.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/platforms.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/cloud_service.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/cloud_provider.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/os.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/os_family.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/infra_provider.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/params.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/service.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/install_strategy.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/application.ttl", "Turtle");
CALL n10s.rdf.import.fetch("path_to/spm/spm.knowledge_domain/ontology/entities/runner.ttl", "Turtle");

// Keep the ontology semver values intact and add Neo4j-only padded keys for
// efficient lexical comparisons. Missing minor or patch values are treated as 0.
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
