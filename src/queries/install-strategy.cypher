MATCH (start)-[:`http://the-spm.org/schema#targetsApplication`]->(install)
WHERE install.uri = $application
MATCH (end)
WHERE end.uri = $infra
WITH start, end
CALL apoc.path.spanningTree(start, {
  relationshipFilter: "`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#usesInfrastructureProvider`>|`http://the-spm.org/schema#dependsOnSemanticApp`>"
  } )
YIELD path
WITH [node in nodes(path) WHERE NOT EXISTS {(node)-[:`http://the-spm.org/schema#usesInfrastructureProvider`]-(neigh) WHERE neigh.uri <> $infra} ] as originalNodes
UNWIND originalNodes as node
MATCH p=(node)-[:`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#installScripts`|`http://the-spm.org/schema#uninstallScripts`|`http://the-spm.org/schema#supportFiles`|`http://the-spm.org/schema#optionalArgument`|`http://the-spm.org/schema#producesParam`|`http://the-spm.org/schema#requiresArgument`|`http://the-spm.org/schema#executedOnRunner`|`http://the-spm.org/schema#argumentType`|`http://the-spm.org/schema#targetsApplication`|`http://the-spm.org/schema#serviceHasDependencyParameter`|`http://the-spm.org/schema#onParameter`|`http://the-spm.org/schema#onApplication`*1..2]->(additional)
RETURN p as path
