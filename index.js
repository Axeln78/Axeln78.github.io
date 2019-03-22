// import sigma from 'sigma_js/sigma.min.js'

Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

var selected = [];
var plotInfo = {
  startDate: new Date("2014-09-24"),
  endDate: new Date("2015-04-30")
};

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

sigma.classes.graph.addMethod("nodeFromID", function(someIds) {
  var k;
  var idS = [];

  for (k in someIds) {
    //idS[someIds[k]] = this.nodesIndex[someIds[k]]; object
    idS.push(this.nodesIndex[someIds[k]]); // array
  }
  return idS; // returns array
});

// Change this function to array based
sigma.classes.graph.addMethod("activateInd", function(toKeep) {
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

sigma.classes.graph.addMethod("activateArr", function(toKeep) {
  // tokeep Takes array of nodes
  this.nodes().forEach(function(n) {
    n.color = "#eee";
  });

  for (let i = 0; i < toKeep.length; i++) {
    this.nodesIndex[toKeep[i].id].color = this.nodesIndex[
      toKeep[i].id
    ].originalColor;
  }

  // // TODO: turn this into an array liking FUNCTION
  for (let i = 0; i < toKeep.length; i++) {
    this.nodesIndex[toKeep[i].id].color = this.nodesIndex[
      toKeep[i].id
    ].originalColor;
  }

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

  document.getElementById("range").onchange = function() {
    var list = s.graph.nodeFromID(selected);
    // Update the graph activation visual
    s.graph.activateArr(list);

    plotInfo.endDate = plotInfo.startDate.addDays(parseInt(this.value));
    //var dateRange = [startDate, endDate];
    PlotI(list);

    s.refresh();
  };

  s.bind("clickNode", function(e) {
    let nodeId = e.data.node.id; // This is only an integer

    // if the node is not selected it will add it otherwise remove it from the array
    if (selected.lastIndexOf(nodeId) != -1) {
      selected.splice(selected.lastIndexOf(nodeId), 1);
    } else selected.push(nodeId);

    nlist = s.graph.nodeFromID(selected);

    //let toKeep = s.graph.neighbors(nodeId);
    //toKeep[nodeId] = e.data.node; // handles and exeption on the clicked node

    // Draw the nodes that should stay activated
    //s.graph.activateInd(toKeep);
    s.graph.activateArr(nlist);
    PlotI(nlist);
    s.refresh();
  });

  // When the stage is clicked, we just color each
  // node and edge with its original color.
  function restartGV() {
    s.graph.nodes().forEach(function(n) {
      n.color = n.originalColor;
    });

    s.graph.edges().forEach(function(e) {
      e.color = e.originalColor;
    });

    s.refresh();
  }

  s.bind("clickStage", function(e) {
    restartGV();
  });

  document.getElementById("selectionR").onclick = function() {
    selected = [];

    nlist = s.graph.nodeFromID(selected);
    restartGV();
    PlotI(nlist);
  };
  // Listeners Force Atlas 2 afterwards
  // TODO: add a timer to avoid getting stuck in the Force atlas calculus
  var force = false;
  document.getElementById("layout").onclick = function() {
    if (!force) {
      s.startForceAtlas2({
        slowDown: 1,
        linLogMode: true,
        iterationsPerRender: 1,
        scalingRatio: 2,
        worker: true,
        barnesHutOptimize: true
      });
      this.textContent = "Stop";
    } else {
      s.stopForceAtlas2();
      this.textContent = "Start";
    }
    force = !force;
  };
});

// ---------- Interactive plot part -------------- //
// TODO: go over to only use the list to have the spacial info of the color of the node, maybe with time it will prove more robust
function PlotI(nodes) {
  // CSV reading, need to be changed place right?
  Plotly.d3.csv("./data/Data2.csv", function(err, rows) {
    function unpack(rows, key) {
      return rows.map(function(row) {
        return row[key];
      });
    }

    var data = [];
    nodes.forEach(function(n) {
      let trace = {
        type: "scatter",
        mode: "lines",
        name: n.label,
        x: unpack(rows, "Date"),
        y: unpack(rows, n.id),
        line: { color: n.color }
      };

      data.push(trace);
    });

    var layout = {
      title: "Custom Range",
      xaxis: {
        //range: date, // Change this range to the new dates!
        range: [plotInfo.startDate, plotInfo.endDate],
        type: "date"
      },
      yaxis: {
        autorange: true,
        range: [87, 138],
        type: "linear"
      }
    };

    Plotly.newPlot("Plot", data, layout);
  });
}
