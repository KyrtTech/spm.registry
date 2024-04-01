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
  CALL apoc.path.expand(n, "`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#installScripts`|`http://the-spm.org/schema#optionalParam`" , null, 1, 2) YIELD path as finalPath
  RETURN finalPath AS path
