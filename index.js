// import sigma from 'sigma_js/sigma.min.js'

// Add a method to the graph model that returns an
// object with every neighbors of a node inside:
sigma.classes.graph.addMethod("neighbors", function(nodeId) {
  var k;

  var neighbors = {};

  var index = this.allNeighborsIndex[nodeId] || {};

  for (k in index) {
    neighbors[k] = this.nodesIndex[k];
  }

  return neighbors;
});

/*  a function that takes as input a list of ids and outputs the list of node */

sigma.classes.graph.addMethod("listIDs", function(someIds) {
  // var someIds = ["159966", '81694', '157447']
  var k;

  var idS = {};

  for (k in someIds) {
    idS[someIds[k]] = this.nodesIndex[someIds[k]];
  }
  return idS;
});

sigma.classes.graph.addMethod("activate", function(toKeep) {
  this.nodes().forEach(function(n) {
    if (toKeep[n.id]) {
      n.color = n.originalColor;
    } else {
      n.color = "#eee";
    }
  });

  this.edges().forEach(function(e) {
    if (toKeep[e.source] && toKeep[e.target]) {
      e.color = e.originalColor;
    } else {
      e.color = "#eee";
    }
  });
});

// MAKE A TEST FUNCTION
//new captor_constructor(target, camera, settings)

s2 = new sigma();
s2.addRenderer({
  type: "WebGL",
  container: "sigma-container2"
});
sigma.parsers.gexf("/data/VizWiki1.gexf", s2, function(s) {
  s.refresh();
  //Save the original colors
  s.graph.nodes().forEach(function(n) {
    n.originalColor = n.color;
  });
  s.graph.edges().forEach(function(e) {
    e.originalColor = e.color;
  });

  //document.getElementById('range').onchange = function() { called() }
  document.getElementById("range").onchange = function() {
    alert(this.value);
    //var someIds = ["159966", '81694', '157447']
    s.graph.nodes().forEach(function(n) {
      n.color = "#eee";
    });
  };

  // Listeners // try force atla afterwards
  var force = false;
  document.getElementById("layout").onclick = function() {
    if (!force) s.startForceAtlas2({ slowDown: 10 });
    else s.stopForceAtlas2();
    force = !force;
  };

  // When a node is clicked, we check for each node
  // if it is a neighbor of the clicked one. If not,
  // we set its color as grey, and else, it takes its
  // original color.
  // only keep edges that have both extremities colored.
  s.bind("clickNode", function(e) {
    let nodeId = e.data.node.id; // This is only an integer

    let toKeep = s.graph.neighbors(nodeId);
    toKeep[nodeId] = e.data.node;

    // Draw the nodes that should stay activated
    s.graph.activate(toKeep);

    s.refresh();
  });

  // When the stage is clicked, we just color each
  // node and edge with its original color.
  s.bind("clickStage", function(e) {
    s.graph.nodes().forEach(function(n) {
      n.color = n.originalColor;
    });

    s.graph.edges().forEach(function(e) {
      e.color = e.originalColor;
    });

    s.refresh();
  });
});
