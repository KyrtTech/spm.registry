MATCH (n:`http://the-spm.org/schema#CloudProvider`)-[r:`http://the-spm.org/schema#infrastructureHasConfigParameter`*0..1]->(m)
WITH n, CASE WHEN m = n THEN null ELSE m END as m, collect(m.uri) AS params
UNWIND params as param
CALL apoc.cypher.run('OPTIONAL MATCH (source)-[r]->(target:`'+param+'`) RETURN target', {source:n})
YIELD value
WITH n, m, collect(value.target) as values
RETURN n as provider, m as param, values