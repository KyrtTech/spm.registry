MATCH (n:`http://the-spm.org/schema#InstallStrategy`)
WHERE n.uri= $strategy 
WITH n
MATCH p = (n)-[:`http://the-spm.org/schema#usesInfrastructureProvider`|`http://the-spm.org/schema#installScripts`|`http://the-spm.org/schema#uninstallScripts`|`http://the-spm.org/schema#supportFiles`|`http://the-spm.org/schema#optionalArgument`|`http://the-spm.org/schema#producesParam`|`http://the-spm.org/schema#requiresArgument`|`http://the-spm.org/schema#executedOnRunner`|`http://the-spm.org/schema#argumentType`|`http://the-spm.org/schema#targetsApplication`]->(end)
RETURN p as path;