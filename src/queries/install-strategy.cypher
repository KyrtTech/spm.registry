MATCH (start)
WHERE start.uri = $application
MATCH (end)
WHERE end.uri = $infra
WITH start, COLLECT(end) AS end
CALL apoc.path.spanningTree(start, {
  relationshipFilter: "`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#dependsOnSemanticApp`",
  terminatorNodes: end
  } )
  YIELD path
  MATCH (n)
  WHERE n IN nodes(path)
  CALL apoc.path.expand(n, "`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#installScripts`|`http://the-spm.org/schema#optionalArgument`|`http://the-spm.org/schema#producesParam`|`http://the-spm.org/schema#requiresArgument`|`http://the-spm.org/schema#executedOnRunner`|`http://the-spm.org/schema#argumentType`" , null, 1, 3) YIELD path as finalPath
  RETURN finalPath AS path
