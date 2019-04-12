// System functions and global initialisations

Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

// Array / Object holding the values of the selected nodes
var selectedO = {
  selectionMulti: false, // Bool for the selection mode
  obj: {},
  arr: [],
  mode: "Single",
  add: function(node) {
    // Checks if a node is already in the list and removes it or adds it
    if (this.arr.lastIndexOf(node) != -1) {
      this.arr.splice(this.arr.lastIndexOf(node), 1);
      delete this.obj[node.id];
    } else {
      this.arr = this.arr.concat(node);
      this.obj[node.id] = node;
    }
  },
  rm: function(node) {
    if (this.arr.lastIndexOf(node) != -1) {
      this.arr.splice(this.arr.lastIndexOf(node), 1);
      delete this.obj[node.id];
    } else {
      console.error("Undefined node");
    }
    console.log(rm);
  },
  reset: function() {
    this.obj = {};
    this.arr = [];
    console.log("Selection reset");
  }
};
// TODO: eliminate selected and put selectedO
//selected = [];

// Object holding information on the information needed for the time-display
// linked with the activity

var plotInfo = {
  startDate: new Date("2014-09-24"),
  endDate: new Date("2015-04-30"),
  selectedStartDate: new Date("2014-09-24"),
  selectedEndDate: new Date("2015-04-30")
};

// ---------------- Methods added to Sigma -------------------- //

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
  var idSArr = [];
  var idSObj = {};

  for (k in someIds) {
    //idSObj[someIds[k]] = this.nodesIndex[someIds[k]]; //object
    idSArr.push(this.nodesIndex[someIds[k]]); // array
  }
  return idSArr; // returns array
});

sigma.classes.graph.addMethod("activateFinal", function() {
  // nodes

  this.nodes().forEach(function(n) {
    if (selectedO.arr[n.id]) {
      n.color = n.originalColor;
    } else {
      n.color = "#eee";
    }
  });

  for (let i = 0; i < selectedO.arr.length; i++) {
    this.nodesIndex[selectedO.arr[i].id].color = this.nodesIndex[
      selectedO.arr[i].id
    ].originalColor;
  }

  // Edges
  this.edges().forEach(function(e) {
    if (selectedO.obj[e.source] && selectedO.obj[e.target]) {
      e.color = e.originalColor;
    } else {
      e.color = "#eee";
    }
  });
});

// Configuration of sigma
// Sigma settings: https://github.com/jacomyal/sigma.js/wiki/Settings
sigmaConfig = {
  renderer: {
    type: "WebGL",
    container: "sigma-container2"
  },
  settings: {
    //drawEdges: false,
    //drawLabels: false,
    scalingMode: "outside",
    //maxEdgeSize: 1,
    //minEdgeSize: 0.5,
    labelThreshold: 14
  }
};

// ------ Sigma object creation and graph inportation---------- //
var s2 = new sigma(sigmaConfig);

sigma.parsers.gexf("/data/VizWiki5.gexf", s2, function(s) {
  s.refresh();
  // ------- INIT --------- //
  var filter = new sigma.plugins.filter(s);
  var maxDegree = 0;

  // Set the maximum node degree
  s.graph.nodes().forEach(function(n) {
    maxDegree = Math.max(maxDegree, s.graph.degree(n.id));
  });
  document.getElementById("max-degree-value").textContent = maxDegree;
  document.getElementById("rangeDegree").max = maxDegree;

  //Save the original colors
  s.graph.nodes().forEach(function(n) {
    n.originalColor = n.color;
  });
  s.graph.edges().forEach(function(e) {
    e.originalColor = e.color;
  });

  // ---------------- ELEMENT linked functions -------------------- //
  // Needs to go and get the data information of the activity in order to compare it here. Otherwise the interaction is good

  /*document.getElementById("range").oninput = function() {
    let timestamp = this.value;
    lt = document.getElementById("lower-threshold").textContent;
    filter
      .undo("activity")
      .nodesBy(function(n) {
        return this.degree(n.id) > size;    // this is s.graph
      }, "activity")
      .apply();
  };*/

  // Export FUNCTION
  document.getElementById("export").onclick = function() {
    console.log("exporting...");
    var output = s.toSVG({
      download: true,
      filename: "mygraph.svg",
      size: 1000
    });
    // console.log(output);
  };

  document.getElementById("selectMode").onclick = function() {
    console.log("Changing selection mode");
    if (this.textContent == "Single Node") {
      this.textContent = "Multi Node";
      selectedO.selectionMulti = true;
    } else {
      this.textContent = "Single Node";
      selectedO.selectionMulti = false;
    }
  };

  s.bind("clickNode", function(e) {
    let nodeId = e.data.node.id; // This is only an integer

    // add the selected node to memory
    selectedO.add(e.data.node);

    // obj
    let toKeep = s.graph.neighbors(nodeId);
    toKeep[nodeId] = e.data.node; // handles and exeption on the clicked node

    // Draw the nodes that should stay activated
    s.graph.activateFinal();
    PlotI(selectedO.arr);
    s.refresh();
  });

  // -------------------- FILTER -------------------- //
  // TODO: Filter edge lenths '(1)'
  // TODO: Filter the viewed nodes

  // '(1)'  - - need to remove the label by hand here

  function filterEdges(length) {
    filter
      .undo("Short edge cutting")
      .edgesBy(function(e) {
        return e.label > length;
      }, "Short edge cutting")
      .apply();
  }
  document.getElementById("edge-threshold").onchange = function() {
    // need to check if the label changes with the zoom!
    length = this.value;
    filterEdges(length);
  };

  document.getElementById("rangeDegree").oninput = function() {
    let size = this.value;
    document.getElementById("min-degree-value").textContent = size;
    filter
      .undo("degree")
      .nodesBy(function(n) {
        return this.degree(n.id) > size;
      }, "degree")
      .apply();
  };

  // -------------------- Selection and more general functions -------------- //
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
    selectedO.reset();
    restartGV();
    PlotI(selectedO.arr);
  };

  // -------------------- LAYOUT & plugins -------------------- //

  // Listeners Force Atlas 2 afterwards
  // TODO: add a timer to avoid getting stuck in the Force atlas calculus
  // Configure the noverlap layout:
  var noverlapListener = s.configNoverlap({
    nodeMargin: 0.1,
    scaleNodes: 1.05,
    gridSize: 75,
    easing: "quadraticInOut", // animation transition function
    speed: 4, // 2 def
    duration: 400 // animation duration.
  });

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
      s.startNoverlap();
    }
    force = !force;
  };

  document.getElementById("noverlap").onclick = function() {
    s.startNoverlap();
  };
});

// -------------------- Interactive plot part ------------------------ //
// TODO: go over to only use the list to have the spacial info of the color of
// the node, maybe with time it will prove more robust

plot = document.getElementById("Plot");

// Read the activity data
var gdata = [];

Plotly.d3.csv("./data/Data_hourly.csv", function(err, rows) {
  gdata = rows;
});
//plot initial empty box
PlotI([]);

function unpack(rows, key) {
  return rows.map(function(row) {
    return row[key];
  });
}

function PlotI(nodes) {
  plot = document.getElementById("Plot");
  var data = [];
  nodes.forEach(function(n) {
    let trace = {
      type: "scatter",
      mode: "lines",
      name: n.label,
      x: unpack(gdata, "Date"),
      y: unpack(gdata, n.id),
      line: { color: n.color }
    };

    data.push(trace);
  });

  var layout = {
    title: "Custom Range",
    xaxis: {
      range: [plotInfo.startDate, plotInfo.endDate],
      type: "date"
    },
    yaxis: {
      autorange: true,
      range: [87, 138],
      type: "linear"
    }
  };

  Plotly.newPlot(plot, data, layout);
  // When the user zooms on the plot, he modifies the selected time range,
  // this information is then sored in the global plotInfo variable
  plot.on("plotly_relayout", function(eventdata) {
    plotInfo.selectedStartDate = eventdata["xaxis.range[0]"];
    console.log(plotInfo.selectedStartDate);
    plotInfo.selectedEndDate = eventdata["xaxis.range[1]"];
  });
}
