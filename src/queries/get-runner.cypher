MATCH (runner)-[rel]->(app)
WHERE runner.uri= $runnerName
RETURN runner, `rel`, app;
