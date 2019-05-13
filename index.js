// hyperparameters
// PlotInfo startDate and length

// System functions and global initialisations
var hyperparameters = {
  filename: "/data/LargeG/graph.json",
  startdate: "2014-09-23 02:00:00",
  //startdate: "2018-07-31 22:00:00",
  //activityDir: "./data/LargeG/activations_dict_unpacked.csv",
  activityDir: "./data/LargeG/activations_dict.csv",
  //activityDir: "./data/Data_hourly.csv",
  //nb_hours: 5278
  nb_hours: 743
};

// EXPORTABLE MODULE
//var nearest = require("nearest-date");
// Changes made to https://www.npmjs.com/package/nearest-date

// WE SHOULD BE ABLE TO CHANGE THIS SIMPLE LOOP TO A DICHOTOMY!
function nearest(dates, target) {
  if (!target) target = Date.now();
  else if (target instanceof Date) target = target.getTime();

  var nearest = Infinity;
  var winner = -1;

  dates.forEach(function(date, index) {
    date = new Date(date).getTime();
    let distance = Math.abs(date - target);
    if (distance < nearest) {
      nearest = distance;
      winner = index;
    }
  });
  if (winner == -1) {
    console.log("// DEBUG: Issue with the scope value of var 'winner'");
  }

  return winner;
}

// Returns the date with one added hour
Date.prototype.addHours = function(h) {
  let newDate = new Date(this);
  newDate.setHours(newDate.getHours() + h);
  return newDate;
};

// Array / Object holding the values of the selected nodes
var selected = {
  multi: true, // Bool for the selection mode
  linLog: false, // Bool for force atlas settings
  obj: {}, // Object holding the selected nodes
  arr: [], // Array ------- --- -------- -----
  disp: false, //
  add: function(node) {
    // Checks if a node is already in the list and removes it or adds it
    if (this.arr.lastIndexOf(node) != -1) {
      this.arr.splice(this.arr.lastIndexOf(node), 1);
      delete this.obj[node.id];
    } else {
      this.arr = this.arr.concat(node);
      this.obj[node.id] = node;
    }
  }, // Method for adding nodes to the selection
  rm: function(node) {
    if (this.arr.lastIndexOf(node) != -1) {
      this.arr.splice(this.arr.lastIndexOf(node), 1);
      delete this.obj[node.id];
    } else {
      console.error("Undefined node");
    }
    console.log("rm");
  }, // ------ --- removing ---- -- --- --------
  reset: function() {
    this.obj = {};
    this.arr = [];
    console.log("Selection reset");
  } // ------ --- resetting the selection of the nodes
};

// Object holding information on the information needed for the time-display
// linked with the activity
var plotInfo = {
  startDate: new Date(hyperparameters.startdate),
  nb_hours: hyperparameters.nb_hours,
  rangeStartI: 0,
  maxDisp: 10000,
  selectedTimeI: 0,
  nattribute: [],
  eAttributes: []
};

plotInfo.endDate = plotInfo.startDate.addHours(plotInfo.nb_hours);
plotInfo.rangeEndI = plotInfo.nb_hours;

// Make a time frame given the first timestamp and the number of hours
var time = [];
for (i = 0; i < plotInfo.nb_hours; i++) {
  time.push(plotInfo.startDate.addHours(i));
}

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
      n.color = "#444";
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
      let colour = e.originalColor;
      e.color = colour.replace(".1", ".4");
    } else {
      e.color = "rgba(68,68,68,.1)";
    }
  });
});

sigma.classes.graph.addMethod("storeEdgeLenght", function() {
  for (let i = 0; i < this.edgesArray.length; i++) {
    let e = this.edgesArray[i];
    let x1 = this.nodes(e.source).x;
    let y1 = this.nodes(e.source).y;
    let x2 = this.nodes(e.target).x;
    let y2 = this.nodes(e.target).y;
    e.length = Math.hypot(x2 - x1, y2 - y1);
  }
});

function drawEdges() {
  sigmaInstance.settings("drawEdges", true);
  sigmaInstance.refresh();
}
function hideEdges() {
  sigmaInstance.settings("drawEdges", false);
  sigmaInstance.refresh();
}

document.getElementById("CheckboxEdges").onchange = function() {
  if (this.checked == true) {
    drawEdges();
  } else {
    hideEdges();
  }
};

// Configuration of sigma
// Sigma settings: https://github.com/jacomyal/sigma.js/wiki/Settings
sigmaConfig = {
  renderer: {
    type: "WebGL",
    container: "sigma-container"
  },
  settings: {
    drawEdges: false,
    drawLabels: false,
    scalingMode: "outside",
    maxEdgeSize: 0.01,
    //maxEdgeSize: 1,
    //minEdgeSize: 0.5,
    labelThreshold: 5,

    // onnly for large graphs?
    hideEdgesOnMove: true
    //batchEdgesDrawing: true
  }
};

// ------ Sigma object creation and graph inportation---------- //
var sigmaInstance = new sigma(sigmaConfig);

//sigma.parsers.gexf("/data/VizWiki5.gexf", sigmaInstance, function(s) {
sigma.parsers.json(hyperparameters.filename, sigmaInstance, function(s) {
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

  s.graph.storeEdgeLenght();
  // --------------------- custom plugin tryout ---------------------- //

  plotInfo.nAttributes = Object.keys(sigmaInstance.graph.nodes()[0]);
  plotInfo.eAttributes = Object.keys(sigmaInstance.graph.edges()[0]);
  select = document.getElementById("attributeSelect");

  for (i in plotInfo.nAttributes) {
    var opt = document.createElement("option");
    opt.value = plotInfo.nAttributes[i];
    opt.innerHTML = plotInfo.nAttributes[i];
    select.appendChild(opt);
  }

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
    let updateLayout = {
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
          opacity: 0.9,
          line: {
            width: 0.2
          }
        }
      ]
    };
    Plotly.relayout(document.getElementById("Plot"), updateLayout);
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
    plotActivity(selected.arr);
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
    startSpinner();
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
    stopSpinner();
  };
  document.getElementById("CheckboxMultiselect").onchange = function() {
    console.log("Changing selection mode");
    if (this.checked) {
      selected.multi = false;
    } else {
      selected.multi = true;
    }
  };
  document.getElementById("CheckboxLayout").onchange = function() {
    console.log("Changing selection mode");
    if (this.checked) {
      selected.linLog = true;
    } else {
      selected.linLog = false;
    }
    // Restart Force Atlas 2
    if (s.isForceAtlas2Running()) {
      s.killForceAtlas2();
      s.startForceAtlas2({
        slowDown: 1,
        linLogMode: selected.linLog,
        iterationsPerRender: 2,
        scalingRatio: 40,
        worker: true,
        barnesHutOptimize: true
      });
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
    s.graph.activate();
    plotActivity(selected.arr);
    s.refresh();

    // pop up the plot when clicking on a node
    let plot = document.getElementById("plot-container");
    plot.children[1].style.display = "block"; // fuggly magic number here
  });

  // -------------------- FILTER -------------------- //

  function filterActivity() {
    timestamp = document.getElementById("range").value;
    lt = document.getElementById("lower-threshold").value;
    ht = document.getElementById("higher-threshold").value;
    //if (lt > 0) {
    // Otherwise no need to go through all of the graph
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

  function filterEdges() {
    length = document.getElementById("edge-threshold").value;
    filter
      .undo("Short edge cutting")
      .edgesBy(function(e) {
        return e.length > length;
      }, "Short edge cutting")
      .apply();
  }
  // Initialisations function call
  filterEdges();

  function filterAnything() {
    val = document.getElementById("customThresh").values;
    //document.getElementById("elementSelect").value
    filter
      .undo("AnythingFilter")
      .edgesBy(function(e) {
        return e[plotInfo.eAttributes[0]] > val;
      }, "AnythingFilter")
      .apply();
  }

  document.getElementById("edge-threshold").onchange = function() {
    // need to check if the label changes with the zoom!
    //length = this.value;
    filterEdges();
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
    // isDragging propriety : https://github.com/jacomyal/sigma.js/issues/342#issuecomment-58361925
    if (!e.data.captor.isDragging) {
      if (!selected.disp) {
        s.graph.activate();
        s.refresh();
        selected.disp = true;
      } else {
        restartGV();
        selected.disp = false;
      }
    }
  });

  document.getElementById("selectionR").onclick = function() {
    selected.reset();
    restartGV();
    plotActivity(selected.arr);
  };

  // -------------------- LAYOUT & plugins -------------------- //

  // Listeners Force Atlas 2 afterwards
  // TODO: add a timer to avoid getting stuck in the Force atlas calculus
  // Configure the noverlap layout:
  var noverlapListener = s.configNoverlap({
    nodeMargin: 0.01,
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
        linLogMode: selected.linLog,
        iterationsPerRender: 2,
        scalingRatio: 40,
        worker: true,
        barnesHutOptimize: true
      });
      this.textContent = "Stop";
    } else {
      s.stopForceAtlas2();
      this.textContent = "Start";
      s.graph.storeEdgeLenght();
      filterEdges();
    }
    force = !force;
  };

  document.getElementById("noverlap").onclick = function() {
    startSpinner();
    console.log("Noverlap Start");
    s.startNoverlap();
    stopSpinner();
  };
});

// ----------------------------------------------------------------------------
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// ------------------------ Unpacking function for the dir -------------------//

function unpack_dict(d, length) {
  /* Unpacks dictionary `d` {list_index: value} into a list.
  `length` is total number of elements in the resulting list.

  Index corresponds to `list_index` and value at that index corresponds to `value`.
  I.e. list[list_index] = value
  Indexes missing in dictionary correspond to `0` values.


 l = [0] * length
 keys = list(d.keys())
 keys.sort()
 for key in keys:
     l[key] = d[key]
 return l
*/
}

// -------------------- Interactive plot part ------------------------ //
// TODO: go over to only use the list to have the spacial info of the color of
// the node, maybe with time it will prove more robust

var plot = document.getElementById("Plot");

document.getElementById("CheckboxPlot").onchange = function() {
  let update = { showlegend: this.checked };
  Plotly.relayout(document.getElementById("Plot"), update);
};

// Read the activity data
var gdata = [];
//var time = [];

function unpack(rows, key) {
  return rows.map(function(row) {
    return row[key];
  });
}

Plotly.d3.csv(hyperparameters.activityDir, function(err, rows) {
  gdata = rows;
  // TBR IF WE KEEP THIS TIME FORMAT
  //time = unpack(gdata, "Date");
  //(plotInfo.startDate = new Date(time[0])),
  //  (plotInfo.endDate = new Date(time[time.length - 1]));

  // THIS WORKS BUT IT SEEMS LIKE THE CSV FILE IS DOING ALL THE JOB!
  for (let i in gdata) {
    for (let j in gdata[i])
      if (gdata[i][j] == "") {
        gdata[i][j] = "0";
      }
  }
  plotActivity([]);
  stopSpinner();
});

//plot initial empty box
function plotActivity(nodes) {
  let plot = document.getElementById("Plot");
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
    paper_bgcolor: "#E2E2E2", // 646464
    plot_bgcolor: "#E2E2E2",

    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50,
      pad: 0
    },
    xaxis: {
      range: [time[plotInfo.rangeStartI], time[plotInfo.rangeEndI - 1]],
      type: "date"
    },
    yaxis: {
      autorange: true,
      //range: [87, 138],
      type: "linear"
    },

    // Here could be some indicative values for abs height and width
    //height: 500,
    width: 500,
    showlegend: document.getElementById("CheckboxPlot").checked,
    legend: {
      x: 0,
      y: 1,
      traceorder: "normal",
      font: {
        family: "sans-serif",
        size: 10,
        color: "#000"
      },
      bgcolor: "#E2E2E2",
      bordercolor: "#FFFFFF",
      borderwidth: 1
    }
  };

  //Plotly.newPlot(plot, data, layout);
  Plotly.react(plot, data, layout, { responsive: false });
  // When the user zooms on the plot, he modifies the selected time range,
  // this information is then sored in the global plotInfo

  plot.on("plotly_relayout", function(eventdata) {
    // Changes the global parameters for the
    //plotInfo.rangeStart = new Date(eventdata["xaxis.range[0]"]);
    if (eventdata["xaxis.range[0]"]) {
      plotInfo.rangeStartI = nearest(
        time,
        new Date(eventdata["xaxis.range[0]"])
      ); // THIS COULD BE SIMPLIFIED
      plotInfo.rangeEndI = nearest(time, new Date(eventdata["xaxis.range[1]"]));

      //-----------DND-----------
      // FUNCTION TO GET THE MAXIMA IS VERY COSTLY IN TIME
      plotInfo.maxDisp = 0;
      for (i = 0; i < selected.arr.length; i++) {
        let maxima = Math.max(
          ...unpack(gdata, selected.arr[i].id).slice(
            plotInfo.rangeStartI,
            plotInfo.rangeEndI
          )
        );
        plotInfo.maxDisp = Math.max(plotInfo.maxDisp, maxima);
      }
    } else {
      // ISSUR E WITH THIS STATEMENT
      //plotInfo.rangeStartI = 0;
      //plotInfo.rangeEndI = time.length - 1;
    }

    // Change the range of the slider
    document.getElementById("range").max =
      plotInfo.rangeEndI - plotInfo.rangeStartI - 1;
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

// ------------------ Spinner animation functions ---------------

function startSpinner() {
  roller = document.getElementById("roller");
  roller.style.display = "block";
  console.log("This might take some time...");
}
function stopSpinner() {
  roller = document.getElementById("roller");
  roller.style.display = "none";
}
