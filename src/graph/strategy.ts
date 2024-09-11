import { SupportFile } from "../schemas/install-strategy";
import { DepParam } from "./dependency-params";

export type StrategyArg = {
  name: string;
  param: string;
  description?: string;
};

export type StrategyAddOn = {
  scripts?: string[];
  uninstallScripts?: string[];
  producesParams?: string[];
  runner?: string[];
  supportFiles?: SupportFile[];
  requirementParams?: DepParam[];
};

export type StrategyArgs = {
  optionalArgs?: StrategyArg[];
  requiredArgs?: StrategyArg[];
};

export type Strategy = StrategyAddOn &
  StrategyArgs & {
    id: string;
  };

type Edge = {
  start: Node;
  end: Node;
  label: string;
};

type Required = {
  name: string;
  satisfiedBy: Node[];
};

type Node = {
  id: string;
  rank: number;
  required: Required[];
  optional: string[];
  produces: string[];
  visited: boolean;

  isSatisfying: Set<Node>;

  perfectAlternatives: Set<Node>;
  functionalAlternatives: Set<Node>;
};

function strategyToNode(strategy: Strategy): Node {
  const ret = {
    id: strategy.id,
    rank: 0,
    required: (strategy.requiredArgs || []).map((req) => ({
      name: req.param,
      satisfiedBy: [],
    })),
    optional: (strategy.optionalArgs || []).map((opt) => opt.param),
    produces: strategy.producesParams || [],
    visited: false,

    isSatisfying: new Set<Node>(),

    perfectAlternatives: new Set<Node>(),
    functionalAlternatives: new Set<Node>(),
  };

  return ret;
}

export function findPaths(source: Strategy, strategies: Strategy[]): Node[] {
  const sourceNode = strategyToNode(source);
  const nodes = strategies.map(strategyToNode);
  const edges: Edge[] = [];

  generatePerfectAlternatives(nodes);

  //  remove duplicates for perfect alternative
  //  we want some heuristic definition here
  //  for instance use self hosted vs managed services
  //  where possible
  let normalized = normalizeAlternatives(nodes);

  const currentNodes = [sourceNode];

  while (currentNodes.length) {
    const currentNode = currentNodes.shift();

    if (!currentNode) {
      continue;
    }

    //  search for nodes that produce the neccessary required outputs
    currentNode.required.forEach((required) => {
      const nodesWithProducer = normalized.filter((node) =>
        node.produces.find((p) => p === required.name)
      );

      nodesWithProducer.forEach((n) => {
        edges.push({
          start: currentNode,
          end: n,
          label: required.name,
        });

        required.satisfiedBy.push(n);

        if (n.visited === false) {
          n.visited = true;
          currentNodes.push(n);
        }

        //  set ranks no matter if was visited or not
        //  we may need to update ranks for other nodes
        n.rank = currentNode.rank + 1;

        n.isSatisfying.add(currentNode);
      });
    });
  }

  return normalized.sort((a, b) => b.rank - a.rank);
}

function doNodesProduceTheSame(a: Node, b: Node): boolean {
  if (a.produces.length !== b.produces.length) {
    return false;
  }

  const aSet = new Set(a.produces);
  const bSet = new Set(b.produces);

  return [...aSet].every((p) => bSet.has(p));
}

function doNodesNeedTheSame(a: Node, b: Node): boolean {
  if (a.required.length !== b.required.length) {
    return false;
  }

  const aSet = new Set(a.required.map((r) => r.name));
  const bSet = new Set(b.required.map((r) => r.name));

  return [...aSet].every((r) => bSet.has(r));
}

//  an alternative is a node that
//  * produces the same outputs
//  * needs the same inputs (requires)
function generatePerfectAlternatives(nodes: Node[]) {
  for (let node of nodes) {
    for (let friend of nodes) {
      if (node === friend) {
        continue;
      }

      if (
        doNodesProduceTheSame(node, friend) &&
        doNodesNeedTheSame(node, friend)
      ) {
        node.perfectAlternatives.add(friend);
        friend.perfectAlternatives.add(node);
      }
    }
  }
}

//  an alternative is a node that
//  * produces the same outputs needed by other nodes
//  * needs the same inputs (requires)
//  this is more lax than a perfect alternative
//  as this take into account a current InstallStrategy
function generateFunctionalAlternative(nodes: Node[]) {}

//  removes all
function normalizeAlternatives(nodes: Node[]): Node[] {
  const normalized: Node[] = [];

  const visited: Set<Node> = new Set<Node>();

  for (let node of nodes) {
    if (visited.has(node)) {
      continue;
    }

    //  we just keep the first one at this moment as the canonical node
    normalized.push(node);

    //  mark the rest
    for (let sibling of node.perfectAlternatives) {
      visited.add(sibling);
    }
  }

  return normalized;
}
