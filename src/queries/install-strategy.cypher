MATCH (start)-[:`http://the-spm.org/schema#targetsApplication`]->(install)
WHERE install.uri = $application
MATCH (end)
WHERE end.uri = $infra
WITH start, COLLECT(end) AS end
CALL apoc.path.spanningTree(start, {
  relationshipFilter: "`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#usesInfrastructureProvider`>|`http://the-spm.org/schema#dependsOnSemanticApp`>",
  terminatorNodes: end
  } )
  YIELD path
  WITH path, nodes(path) as originalNodes
  UNWIND originalNodes as node
  MATCH p=(node)-[:`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#installScripts`|`http://the-spm.org/schema#optionalArgument`|`http://the-spm.org/schema#producesParam`|`http://the-spm.org/schema#requiresArgument`|`http://the-spm.org/schema#executedOnRunner`|`http://the-spm.org/schema#argumentType`]->(additional)
  RETURN p as path
