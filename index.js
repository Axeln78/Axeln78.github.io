// System functions and global initialisations
var hyperparameters = {
  filename: "/data/final/2018_09_1q.json",
  startDate: "2018-08-31 22:00:00",
  //startDate: "2018-07-31 22:00:00",
  //activityDir: "./data/LargeG/activations_dict_unpacked.csv",
  activityDir: "./data/final/activations_2018_09_1q.json",
  //activityDir: "./data/Data_hourly.csv",
  nb_hours: 336,
  n_nodes: 0,
  n_edges: 0
};

function init() {
  //startSpinner();

  selection = document.getElementById("WeekSelect");
  // Update all the hyperparameters based on the selected week / time frame
  hyperparameters.filename = "./data/final/" + selection.value + ".json";
  hyperparameters.startDate = selection[selection.selectedIndex].getAttribute(
    "startDate"
  );
  hyperparameters.activityDir =
    "./data/final/activations_" + selection.value + ".json";
  hyperparameters.nb_hours = selection[selection.selectedIndex].getAttribute(
    "hours"
  );
  plotInfo.nb_hours = hyperparameters.nb_hours;

  // Update all the visuals and information on the graph based on that
  clearGraph();
  setTime();
  readActivity();
  updateGraph();
}

function updateInfo() {
  hyperparameters.n_nodes = sigmaInstance.graph.nodes().length;
  document.getElementById("nnodes").innerHTML =
    hyperparameters.n_nodes + " nodes";
  hyperparameters.n_edges = sigmaInstance.graph.edges().length;
  document.getElementById("nedges").innerHTML =
    hyperparameters.n_edges + " edges";
}

document.getElementById("WeekSelect").oninput = function() {
  startSpinner(init);
  stopSpinner();
  //init();
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
  nb_hours: hyperparameters.nb_hours,
  rangeStartI: 0,
  maxDisp: 10000,
  selectedTimeI: 0,
  nattribute: [],
  eAttributes: []
};

//plotInfo.endDate = plotInfo.startDate.addHours(plotInfo.nb_hours);
plotInfo.rangeEndI = plotInfo.nb_hours;

// Make a time frame given the first timestamp and the number of hours
var time = [];
function setTime(hours) {
  if (typeof hours === "undefined") {
    hours = hyperparameters.nb_hours;
  }

  time = [];
  date = new Date(hyperparameters.startDate);
  for (i = 0; i < hours; i++) {
    time.push(date.addHours(i));
  }
}
setTime();

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

    // Only large graphs?
    hideEdgesOnMove: true
    //batchEdgesDrawing: true
  }
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

function drawEdges(bool) {
  sigmaInstance.settings("drawEdges", bool);
  sigmaInstance.refresh();
}
function clearGraph() {
  sigmaInstance.graph.clear();
  sigmaInstance.refresh();
}
function updateGraph() {
  sigma.parsers.json(
    hyperparameters.filename,
    sigmaInstance,
    sigmaInitCallback
  );
  sigmaInstance.refresh();
}

// When the stage is clicked, we just color each
// node and edge with its original color.
function restartGV() {
  sigmaInstance.graph.nodes().forEach(function(n) {
    n.color = n.originalColor;
  });

  sigmaInstance.graph.edges().forEach(function(e) {
    e.color = e.originalColor;
  });

  sigmaInstance.refresh();
}

// ------ Sigma object creation and graph inportation---------- //
var sigmaInstance = new sigma(sigmaConfig);
var filter = new sigma.plugins.filter(sigmaInstance);
//sigma.parsers.gexf("/data/VizWiki5.gexf", sigmaInstance, function(s) {

// // TODO: Break up into many fun
sigmaInitCallback = function(s) {
  s.refresh();
  // ------- INIT --------- //
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

  // -------------------- Selection and more general functions -------------- //
};

sigmaInstance.bind("clickStage", function(e) {
  // isDragging propriety : https://github.com/jacomyal/sigma.js/issues/342#issuecomment-58361925
  if (!e.data.captor.isDragging) {
    if (!selected.disp) {
      sigmaInstance.graph.activate();
      sigmaInstance.refresh();
      selected.disp = true;
    } else {
      restartGV();
      selected.disp = false;
    }
  }
});
sigmaInstance.bind("clickNode", function(e) {
  let nodeId = e.data.node.id; // This is only an integer

  // add the selected node to memory
  selected.add(e.data.node);

  // obj
  if (selected.multi) {
    let toKeep = sigmaInstance.graph.neighbors(nodeId);
    toKeep[nodeId] = e.data.node; // handles and exeption on the clicked node
    selected.reset();

    for (i in toKeep) {
      selected.add(toKeep[i]);
    }
  }
  // Draw the nodes that should stay activated
  sigmaInstance.graph.activate();
  plotActivity(selected.arr);
  sigmaInstance.refresh();

  // pop up the plot when clicking on a node
  let plot = document.getElementById("plot-container");
  plot.children[1].style.display = "block"; // fuggly magic number here
});

// -------------------- LAYOUT & plugins -------------------- //

var force = false;

document.getElementById("layout").onclick = function() {
  if (!force) {
    sigmaInstance.startForceAtlas2({
      slowDown: 1,
      linLogMode: selected.linLog,
      iterationsPerRender: 2,
      scalingRatio: 40,
      worker: true,
      barnesHutOptimize: true
    });
    this.textContent = "Stop";
  } else {
    sigmaInstance.stopForceAtlas2();
    this.textContent = "Start";
    sigmaInstance.graph.storeEdgeLenght();
    filterEdges();
  }
  force = !force;
};

document.getElementById("noverlap").onclick = function() {
  startSpinner();
  console.log("Noverlap Start");
  sigmaInstance.startNoverlap();
  stopSpinner();
};

//  -------------- interactions between the lay out and Sigma

function resetTimeRange() {
  document.getElementById("lower-threshold").value = 0;
  document.getElementById("higher-threshold").value = 100000;
  filterActivity();
  plotActivity(selected.arr);
}
document.getElementById("range").oninput = function() {
  filterActivity();
  plotInfo.selectedTimeI = plotInfo.rangeStartI + parseInt(this.value);

  document.getElementById("DateIndicator").innerHTML =
    "selected Time: " + time[plotInfo.selectedTimeI].toUTCString();
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

document.getElementById("selectionR").onclick = function() {
  selected.reset();
  restartGV();
  plotActivity(selected.arr);
};
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
      let val = 0;
      try {
        val = parseInt(gdata[n.id][plotInfo.rangeStartI + parseInt(timestamp)]);
      } catch (err) {
        console.log(n.id);
      }
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

// Export FUNCTIONS
document.getElementById("exportSVG").onclick = function() {
  console.log("exporting to SVG...");
  var output = sigmaInstance.toSVG({
    download: true,
    filename: "mygraph.svg",
    size: 1000
  });
  // console.log(output);
};
document.getElementById("exportGEXF").onclick = function() {
  startSpinner();
  console.log("exporting to GEXF...");
  sigmaInstance.toGEXF({
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

// TEST
//document.getElementById("edge-threshold").onchange = function() {
// need to check if the label changes with the zoom!
//length = this.value;
//  filterEdges();
//};

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

// Configure the noverlap layout:
var noverlapListener = sigmaInstance.configNoverlap({
  nodeMargin: 0.01,
  scaleNodes: 1.05,
  gridSize: 75, //75
  easing: "quadraticInOut", // animation transition function
  speed: 2, // 2 def
  duration: 400 // animation duration.
});

// ------------------------------------------------------------------------
// ------------------------ Unpacking function for the dir -------------------//

function unpack_dict(d, hours) {
  /* Unpacks dictionary `d` {list_index: value} into an object.
  Hyper-parameter  is total number of elements in the resulting list. */
  if (typeof hours === "undefined") {
    hours = hyperparameters.nb_hours;
  }

  l = {};
  // Fill with 0s
  for (let i = 0; i < hours; i++) {
    l[i] = 0;
  }
  // Fill with sparse data
  for (i in d) {
    l[i] = d[i];
  }
  return l;
}

// -------------------- Interactive plot part ------------------------ //
// TODO: go over to only use the list to have the spacial info of the color of
// the node, maybe with time it will prove more robust

var plot = document.getElementById("Plot");

document.getElementById("CheckboxPlot").onchange = function() {
  let update = { showlegend: this.checked };
  Plotly.relayout(document.getElementById("Plot"), update);
};

var gdata = {};
function readActivity() {
  // Read the activity data
  gdata = {};
  Plotly.d3.json(hyperparameters.activityDir, function(err, rows) {
    gdata = rows;

    for (i in rows) {
      gdata[i] = unpack_dict(rows[i]);
    }

    plotActivity([]);
    //stopSpinner();
  });
}

function unpack(rows, key) {
  return Object.values(rows[key]);
}

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
      type: "linear",
      automargin: true
    },

    // Here could be some indicative values for abs height and width
    //height: 500,
    // width:
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
  Plotly.react(plot, data, layout, { responsive: true });
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

function startSpinner(callback) {
  roller = document.getElementById("roller");
  roller.style.display = "block";
  console.log("This might take some time...");
  if (typeof callback === "function") {
    // Call it, since we have confirmed it is callable
    callback();
  }
}
function stopSpinner() {
  roller = document.getElementById("roller");
  roller.style.display = "none";
  updateInfo();
}

// Initialisation of the first graph at the opening of the page
init();
stopSpinner();
