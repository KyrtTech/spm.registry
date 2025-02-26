MATCH (s:`http://the-spm.org/schema#SoftwareService`)-[r:`http://the-spm.org/schema#dependsOnSemanticApp`]->(d)
OPTIONAL MATCH (s)-[:`http://schema.org/logo`]->(logo)
return s as service, d as depends, logo