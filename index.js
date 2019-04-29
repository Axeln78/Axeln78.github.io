// System functions and global initialisations

// EXPORTABLE MODULE
//var nearest = require("nearest-date");
// Changes made to https://www.npmjs.com/package/nearest-date
function nearest(dates, target) {
  if (!target) target = Date.now();
  else if (target instanceof Date) target = target.getTime();

  var nearest = Infinity;
  var winner = -1;

  dates.forEach(function(date, index) {
    date = new Date(date).getTime();
    var distance = Math.abs(date - target);
    if (distance < nearest) {
      nearest = distance;
      winner = index;
    }
  });
  return winner;
}

// Date add addDays proto TBR?
/*Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};*/

// Array / Object holding the values of the selected nodes
var selected = {
  multi: false, // Bool for the selection mode
  obj: {},
  arr: [],
  //mode: "Single",
  disp: false,
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
    console.log("rm");
  },
  reset: function() {
    this.obj = {};
    this.arr = [];
    console.log("Selection reset");
  }
};

// Object holding information on the information needed for the time-display
// linked with the activity
// TODO: This need to be changed at some point
var plotInfo = {
  startDate: new Date("2014-09-24"),
  endDate: new Date("2015-04-30"),
  rangeStartI: 0,
  rangeEndI: 5278,
  maxDisp: 10000,
  selectedTimeI: this.rangeStartI
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

sigma.classes.graph.addMethod("activate", function() {
  // nodes

  this.nodes().forEach(function(n) {
    if (selected.arr[n.id]) {
      n.color = n.originalColor;
    } else {
      n.color = "#eee";
    }
  });

  for (let i = 0; i < selected.arr.length; i++) {
    this.nodesIndex[selected.arr[i].id].color = this.nodesIndex[
      selected.arr[i].id
    ].originalColor;
  }

  // Edges
  this.edges().forEach(function(e) {
    if (selected.obj[e.source] && selected.obj[e.target]) {
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
    container: "sigma-container"
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

  // Activity filtering :

  //init time range filter
  document.getElementById("range").max = plotInfo.rangeEndI - 1;
  document.getElementById("range").oninput = function() {
    filterActivity();
    plotInfo.selectedTimeI = plotInfo.rangeStartI + parseInt(this.value);

    document.getElementById("DateIndicator").innerHTML =
      "selected Time: " + time[plotInfo.selectedTimeI];
    // Update a second trace of the plot where the bar is stored to move it at y = "selected time"
    PlotI(selected.arr);
  };

  document.getElementById("lower-threshold").oninput = function() {
    filterActivity();
  };

  document.getElementById("higher-threshold").oninput = function() {
    filterActivity();
  };

  document.getElementById("ResetTimeRange").onclick = function() {
    document.getElementById("lower-threshold").value = 0;
    document.getElementById("higher-threshold").value = 100000;
    filterActivity();
  };

  // Export FUNCTIONS
  document.getElementById("exportSVG").onclick = function() {
    console.log("exporting to SVG...");
    var output = s.toSVG({
      download: true,
      filename: "mygraph.svg",
      size: 1000
    });
    // console.log(output);
  };
  document.getElementById("exportGEXF").onclick = function() {
    console.log("exporting to GEXF...");
    s.toGEXF({
      download: true,
      filename: "myGraph.gexf",
      nodeAttributes: null, // "data",
      edgeAttributes: null, // "data.properties",
      renderer: s.renderers[0],
      creator: "Wikimedia",
      description: "Generated graph from the Wikipedia dataset"
    });
  };
  document.getElementById("Checkbox").onchange = function() {
    console.log("Changing selection mode");
    if (this.checked) {
      selected.multi = true;
    } else {
      selected.multi = false;
    }
  };

  s.bind("clickNode", function(e) {
    let nodeId = e.data.node.id; // This is only an integer

    // add the selected node to memory
    selected.add(e.data.node);

    // obj
    if (selected.multi) {
      let toKeep = s.graph.neighbors(nodeId);
      toKeep[nodeId] = e.data.node; // handles and exeption on the clicked node
      selected.reset();

      for (i in toKeep) {
        selected.add(toKeep[i]);
      }
    }
    // Draw the nodes that should stay activated
    // TODO: pop the plot open
    s.graph.activate();
    PlotI(selected.arr);
    s.refresh();

    // pop up the plot when clicking on a node
    plot = document.getElementById("plot-container");
    plot.children[1].style.display = "block"; // fuggly magic number here
  });

  // -------------------- FILTER -------------------- //
  // TODO: Filter edge lenths '(1)'
  // TODO: Filter the viewed nodes

  // '(1)'  - - need to remove the label by hand here

  function filterActivity() {
    timestamp = document.getElementById("range").value;
    lt = document.getElementById("lower-threshold").value;
    ht = document.getElementById("higher-threshold").value;
    filter
      .undo("activity")
      .nodesBy(function(n) {
        let val = parseInt(
          gdata[plotInfo.rangeStartI + parseInt(timestamp)][n.id]
        );
        return val >= lt && val <= ht;
      }, "activity")
      .apply();
  }

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
    // POTOOOOOOOOOO
    if (selected.disp == false) {
      s.graph.activate();
      s.refresh();
      selected.disp = true;
    } else {
      restartGV();
      selected.disp = false;
    }
  });

  document.getElementById("selectionR").onclick = function() {
    selected.reset();
    restartGV();
    PlotI(selected.arr);
  };

  // -------------------- LAYOUT & plugins -------------------- //

  // Listeners Force Atlas 2 afterwards
  // TODO: add a timer to avoid getting stuck in the Force atlas calculus
  // Configure the noverlap layout:
  var noverlapListener = s.configNoverlap({
    nodeMargin: 0.1,
    scaleNodes: 1.05,
    gridSize: 75, //75
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
      // Possible automatic no-overlap here
      //s.startNoverlap();
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
var time = [];

function unpack(rows, key) {
  return rows.map(function(row) {
    return row[key];
  });
}

Plotly.d3.csv("./data/Data_hourly.csv", function(err, rows) {
  gdata = rows;
  time = unpack(gdata, "Date");
  (plotInfo.startDate = new Date(time[0])),
    (plotInfo.endDate = new Date(time[time.length - 1]));
});

//plot initial empty box
PlotI([]);
function PlotI(nodes) {
  plot = document.getElementById("Plot");
  var data = [];
  nodes.forEach(function(n) {
    let trace = {
      type: "scatter",
      mode: "lines",
      name: n.label,
      x: time,
      y: unpack(gdata, n.id)
      //  line: {
      //      color: n.color
      //    }
    };

    data.push(trace);
  });

  var layout = {
    autosize: true,
    //width: 500,
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 0
    },
    //height: 200,
    // HERE MAKE AN IF FOR STARTDATE AND endDate
    xaxis: {
      range: [time[plotInfo.rangeStartI], time[plotInfo.rangeEndI]],
      type: "date" //,
      //rangeslider: { range: [plotInfo.startDate, plotInfo.endDate] },
      //type: "date"
    },
    yaxis: {
      autorange: true,
      //range: [87, 138],
      type: "linear"
    },

    shapes: [
      // 1st highlight during Feb 4 - Feb 6
      {
        type: "rect",
        // x-reference is assigned to the x-values
        xref: "x",
        // y-reference is assigned to the plot paper [0,1]
        yref: "paper",
        x0: time[plotInfo.selectedTimeI],
        y0: 0,
        x1: time[plotInfo.selectedTimeI + 1],
        y1: 1,
        fillcolor: "#F9812A",
        opacity: 0.8,
        line: {
          width: 0
        }
      }
    ]
    // Here could be some indicative values for abs height and width
    //height: 500,
    //width: 500
  };

  Plotly.newPlot(plot, data, layout);
  // When the user zooms on the plot, he modifies the selected time range,
  // this information is then sored in the global plotInfo

  plot.on("plotly_relayout", function(eventdata) {
    // Changes the global parameters for the
    //plotInfo.rangeStart = new Date(eventdata["xaxis.range[0]"]);
    plotInfo.rangeStartI = nearest(time, new Date(eventdata["xaxis.range[0]"])); // THIS COULD BE SIMPLIFIED
    plotInfo.rangeEndI = nearest(time, new Date(eventdata["xaxis.range[1]"]));

    // Change the range of the slider
    document.getElementById("range").max =
      plotInfo.rangeEndI - plotInfo.rangeStartI;
    // TODO: Make  a nearest search

    // Update the max value on the graph

    // FUNCTION TO GET THE MAXIMA IS VERY COSTLY IN TIME
    plotInfo.maxDisp = 0;
    //-----------DND-----------

    /*for (i = 0; i < selected.arr.length; i++) {
      let maxima = Math.max(
        ...unpack(gdata, selected.arr[i].id).slice(
          plotInfo.rangeStartI,
          plotInfo.rangeEndI
        )
      );
      plotInfo.maxDisp = Math.max(plotInfo.maxDisp, maxima);
    }*/

    //console.log(plotInfo.maxDisp);
    // DEBUG
    //console.log(document.getElementById("range").max);
  });
}

// ---------------- Some JS for collapsible -------------------
var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
}

//------ SPINNER.JS TEST ----
//import Spinner from "./lib/spin.js";
/*
var opts = {
  lines: 13, // The number of lines to draw
  length: 38, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: "#ffffff", // CSS color or array of colors
  fadeColor: "transparent", // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: "spinner-line-fade-quick", // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: "spinner", // The CSS class to assign to the spinner
  top: "50%", // Top position relative to parent
  left: "50%", // Left position relative to parent
  shadow: "0 0 1px transparent", // Box-shadow for the lines
  position: "absolute" // Element positioning
};

var target = document.getElementById("sigma-container");
var spinner = new Spinner(opts).spin(target);*/
