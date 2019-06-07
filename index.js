// ------------- Gobal structures / variables -------------------
// --------------------------------------------------------------
// System functions and global initialisations
/*var Hyperparameters = {
  filename: "/data/final/2018_09_1q.json",
  startDate: "2018-08-31 22:00:00",
  //startDate: "2018-07-31 22:00:00",
  //activityDir: "./data/LargeG/activations_dict_unpacked.csv",
  activityDir: "./data/final/activations_2018_09_1q.json",
  //activityDir: "./data/Data_hourly.csv",
  nb_hours: 336,
  n_nodes: 0,
  n_edges: 0
};*/

var Hyperparameters = {
  filename: "",
  startDate: "",
  activityDir: "",
  nb_hours: 0,
  n_nodes: 0,
  n_edges: 0
};

// Object holding the values of the selected nodes
var Selected = {
  multi: true, // Bool for the selection mode
  linLog: false, // Bool for force atlas settings
  disp: false, //
  obj: {}, // Object holding the selected nodes
  arr: [], // Array ------- --- -------- -----
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
  }, // --------- removing -----------------
  reset: function() {
    this.obj = {};
    this.arr = [];
    console.log("Selection reset");
  } // ------- resetting the selection of the nodes
};

// Object holding information on the information needed for the time-display
// linked with the activity
var PlotInfo = {
  nb_hours: Hyperparameters.nb_hours,
  rangeStartI: 0,
  maxDisp: 10000,
  selectedTimeI: 0,
  nattribute: [],
  eAttributes: []
};

// Make a time frame given the first timestamp and the number of hours
var time = [];

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
    labelThreshold: 5,
    hideEdgesOnMove: true
    // Not working with the custom Sigma:
    //batchEdgesDrawing: true
  }
};

// --------------------------------------------------------------

function init() {
  startSpinner();

  var exportPromise = new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve("Success in loading the env.");

      selection = document.getElementById("WeekSelect");
      // Update all the Hyperparameters based on the selected week / time frame
      Hyperparameters.filename = "./data/final/" + selection.value + ".json";
      Hyperparameters.startDate = selection[
        selection.selectedIndex
      ].getAttribute("startDate");
      Hyperparameters.activityDir =
        "./data/final/activations_" + selection.value + ".json";
      Hyperparameters.nb_hours = selection[
        selection.selectedIndex
      ].getAttribute("hours");
      PlotInfo.nb_hours = Hyperparameters.nb_hours;

      // Update all the visuals and information on the graph based on that
      clearGraph();
      setTime();
      readActivity();
      updateGraph();
    }, 0);
  });

  exportPromise.then(function(result) {
    stopSpinner();
    console.log(result);
  });
}

function updateInfo(s) {
  Hyperparameters.n_nodes = s.nodes().length;
  document.getElementById("nnodes").innerHTML =
    Hyperparameters.n_nodes + " nodes";
  Hyperparameters.n_edges = s.edges().length;
  document.getElementById("nedges").innerHTML =
    Hyperparameters.n_edges + " edges";
}

document.getElementById("WeekSelect").oninput = function() {
  startSpinner(init);
  stopSpinner();
};

// Changes made to https://www.npmjs.com/package/nearest-date
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
    n.color = "#444";
  });

  for (let i = 0; i < Selected.arr.length; i++) {
    node = this.nodesIndex[Selected.arr[i].id];
    node.color = node.originalColor;
  }

  // Edges
  this.edges().forEach(function(e) {
    if (Selected.obj[e.source] && Selected.obj[e.target]) {
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
    Hyperparameters.filename,
    sigmaInstance,
    sigmaInitCallback
  );
  sigmaInstance.refresh();
}

function setTime(hours) {
  if (typeof hours === "undefined") {
    console.log("There is an issue with the number of hours");
    hours = Hyperparameters.nb_hours;
  }

  time = [];
  date = new Date(Hyperparameters.startDate);
  for (i = 0; i < hours; i++) {
    time.push(date.addHours(i));
  }
}

function restartGV() {
  // Color each node and edge with its original color.

  sigmaInstance.graph.nodes().forEach(function(n) {
    n.color = n.originalColor;
  });

  sigmaInstance.graph.edges().forEach(function(e) {
    e.color = e.originalColor;
  });

  sigmaInstance.refresh();
}

function changeMultiSelect(checked) {
  console.log("Changing selection mode");
  console.log(checked);
  if (checked) {
    Selected.multi = false;
  } else {
    Selected.multi = true;
  }
}

// ------ Sigma object creation and graph inportation---------- //
var sigmaInstance = new sigma(sigmaConfig);
var filter = new sigma.plugins.filter(sigmaInstance);

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
  // Store the lenght of eatch edge as an attriute of each edge
  s.graph.storeEdgeLenght();
  // --------------------- custom plugin tryout ---------------------- //

  PlotInfo.nAttributes = Object.keys(sigmaInstance.graph.nodes()[0]);
  PlotInfo.eAttributes = Object.keys(sigmaInstance.graph.edges()[0]);
  select = document.getElementById("attributeSelect");

  // TODO: DO This in a function to add the edges
  for (i in PlotInfo.nAttributes) {
    var opt = document.createElement("option");
    opt.value = PlotInfo.nAttributes[i];
    opt.innerHTML = PlotInfo.nAttributes[i];
    select.appendChild(opt);
  }

  // ---------------- ELEMENT linked functions -------------------- //
  // Needs to go and get the data information of the activity in order to compare it here. Otherwise the interaction is good

  //init time range filter
  document.getElementById("range").max = PlotInfo.rangeEndI - 1;

  // -------------------- Selection and more general functions -------------- //
  s.refresh();
  updateInfo(s.graph);
};

sigmaInstance.bind("clickStage", function(e) {
  // isDragging propriety : https://github.com/jacomyal/sigma.js/issues/342#issuecomment-58361925
  if (!e.data.captor.isDragging) {
    if (!Selected.disp) {
      sigmaInstance.graph.activate();
      sigmaInstance.refresh();
      Selected.disp = true;
    } else {
      restartGV();
      Selected.disp = false;
    }
  }
});
sigmaInstance.bind("clickNode", function(e) {
  let nodeId = e.data.node.id; // This is only an integer

  // add the selected node to memory
  Selected.add(e.data.node);

  // obj
  if (Selected.multi) {
    let toKeep = sigmaInstance.graph.neighbors(nodeId);
    toKeep[nodeId] = e.data.node; // handles and exeption on the clicked node
    Selected.reset();

    for (i in toKeep) {
      Selected.add(toKeep[i]);
    }
  }
  // Draw the nodes that should stay activated
  sigmaInstance.graph.activate();
  plotActivity(Selected.arr);
  sigmaInstance.refresh();

  // pop up the plot when clicking on a node
  let plot = document.getElementById("plot-container");
  plot.children[1].style.display = "block"; // fuggly magic number here
});

// -------------------- LAYOUT & plugins -------------------- //

document.getElementById("layout").onclick = function() {
  if (!sigmaInstance.isForceAtlas2Running()) {
    sigmaInstance.startForceAtlas2({
      slowDown: 1,
      linLogMode: Selected.linLog,
      iterationsPerRender: 3,
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
  //force = !force;
};

document.getElementById("noverlap").onclick = function() {
  startSpinner();

  var exportPromise = new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve("Success. NoOverlap.");
      console.log("Noverlap Start");
      sigmaInstance.startNoverlap();
    }, 0);
  });

  exportPromise.then(function(result) {
    stopSpinner();
    console.log(result);
  });
};

//  -------------- interactions between the lay out and Sigma ----------

function resetTimeRange() {
  document.getElementById("lower-threshold").value = 0;
  document.getElementById("higher-threshold").value = 100000;
  //Undo all filters
  filter
    .undo("activity", "degree", "Short edge cutting", "AnythingFilter")
    .apply();

  plotActivity(Selected.arr);
}
document.getElementById("range").oninput = function() {
  filterActivity();
  PlotInfo.selectedTimeI = PlotInfo.rangeStartI + parseInt(this.value);

  document.getElementById("DateIndicator").innerHTML =
    "selected Time: " + time[PlotInfo.selectedTimeI].toUTCString();
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
        x0: time[PlotInfo.selectedTimeI],
        y0: 0,
        x1: time[PlotInfo.selectedTimeI + 1],
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
  plotActivity(Selected.arr);
};

// -------------------- FILTER -------------------- //
function filterActivity() {
  timestamp = document.getElementById("range").value;
  lt = document.getElementById("lower-threshold").value;
  ht = document.getElementById("higher-threshold").value;
  filter
    .undo("activity")
    .nodesBy(function(n) {
      let val = 0;
      try {
        val = parseInt(gdata[n.id][PlotInfo.rangeStartI + parseInt(timestamp)]);
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

function filterDegree(minDegree) {
  filter
    .undo("degree")
    .nodesBy(function(n) {
      return this.degree(n.id) > minDegree;
    }, "degree")
    .apply();
}

function attributefilter(obj, val) {
  attribute = document.getElementById("attributeSelect").value;
  switch (document.getElementById("comparisonSelect").value) {
    case "0":
      return obj[attribute] > val;

      break;
    case "1":
      return obj[attribute] == val;
      break;
    case "2":
      return obj[attribute] < val;
      break;

    default:
      console.log("Unknown comparison element");
  }
}

function filterAnything() {
  let val = document.getElementById("customThresh").value;

  if (document.getElementById("elementSelect").value == "edges") {
    filter
      .undo("AnythingFilter")
      .edgesBy(function(e) {
        return attributefilter(e, val);
      }, "AnythingFilter")
      .apply();
  } else {
    filter
      .undo("AnythingFilter")
      .nodesBy(function(n) {
        return attributefilter(n, val);
      }, "AnythingFilter")
      .apply();
  }
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

  var exportPromise = new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve("Success. Exported GEXF.");
      sigmaInstance.toGEXF({
        download: true,
        filename: "myGraph.gexf",
        nodeAttributes: null, // "data",
        edgeAttributes: null, // "data.properties",
        renderer: sigmaInstance.renderers[0],
        creator: "Wikimedia",
        description: "Generated graph from the Wikipedia dataset"
      });
    }, 0);
  });

  exportPromise.then(function(result) {
    stopSpinner();
    console.log(result);
  });
};

document.getElementById("CheckboxLayout").onchange = function() {
  console.log("Changing selection mode");
  if (this.checked) {
    Selected.linLog = true;
  } else {
    Selected.linLog = false;
  }
  // Restart Force Atlas 2
  if (sigmaInstance.isForceAtlas2Running()) {
    sigmaInstance.killForceAtlas2();
    sigmaInstance.startForceAtlas2({
      slowDown: 1,
      linLogMode: Selected.linLog,
      iterationsPerRender: 2,
      scalingRatio: 40,
      worker: true,
      barnesHutOptimize: true
    });
  }
};

document.getElementById("rangeDegree").oninput = function() {
  let size = this.value;
  document.getElementById("min-degree-value").textContent = size;
  filterDegree(size);
};

// Configure the noverlap layout:
var noverlapListener = sigmaInstance.configNoverlap({
  nodeMargin: 0.01,
  scaleNodes: 1.05,
  gridSize: 75,
  easing: "quadraticInOut", // animation transition function
  speed: 2, // 2 def
  duration: 400 // animation duration.
});

// ------------------------------------------------------------------------
// ------------------------ Unpacking function for the dir -------------------//
// ------------------------------------------------------------------------

function unpack_dict(d, hours) {
  /* Unpacks dictionary `d` {list_index: value} into an object.
  Hyper-parameter  is total number of elements in the resulting list. */
  if (typeof hours === "undefined") {
    hours = Hyperparameters.nb_hours;
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

// -------------------- Interactive plot ------------------------ //

var plot = document.getElementById("Plot");

document.getElementById("CheckboxPlot").onchange = function() {
  let update = { showlegend: this.checked };
  Plotly.relayout(document.getElementById("Plot"), update);
};

var gdata = {};
function readActivity() {
  // Read the activity data
  gdata = {};
  Plotly.d3.json(Hyperparameters.activityDir, function(err, rows) {
    gdata = rows;

    for (i in rows) {
      gdata[i] = unpack_dict(rows[i]);
    }

    plotActivity([]);
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
    paper_bgcolor: "#000000", // 646464
    plot_bgcolor: "#000000", //#E2E2E2

    margin: {
      l: 50,
      r: 10,
      b: 50,
      t: 50,
      pad: 0
    },
    xaxis: {
      range: [time[PlotInfo.rangeStartI], time[PlotInfo.rangeEndI - 1]],
      type: "date",
      autorange: true,
      automargin: true,
      //tickcolor: "#999"
      color: "#999",
      gridcolor: "#333"
    },
    yaxis: {
      autorange: true,
      type: "linear",
      automargin: true,
      color: "#999",
      gridcolor: "#333"
    },
    // Here could be some indicative values for abs height and width
    //height: 500,
    width: document.getElementById("plot-container").offsetWidth,
    height: document.getElementById("plot-container").offsetWidth,
    showlegend: document.getElementById("CheckboxPlot").checked,
    legend: {
      x: 0,
      y: 1,
      traceorder: "normal",
      font: {
        family: "sans-serif",
        size: 10,
        color: "#999"
      },
      //bgcolor: "#FFFFFF", //"#E2E2E2"
      bordercolor: "#111111",
      borderwidth: 1
    }
  };

  //Plotly.newPlot(plot, data, layout);
  Plotly.react(plot, data, layout, { responsive: false });
  // When the user zooms on the plot, he modifies the selected time range,
  // this information is then sored in the global PlotInfo

  plot.on("plotly_relayout", function(eventdata) {
    // Changes the global parameters for the
    //PlotInfo.rangeStart = new Date(eventdata["xaxis.range[0]"]);
    if (eventdata["xaxis.range[0]"]) {
      PlotInfo.rangeStartI = nearest(
        time,
        new Date(eventdata["xaxis.range[0]"])
      ); // THIS COULD BE SIMPLIFIED
      PlotInfo.rangeEndI = nearest(time, new Date(eventdata["xaxis.range[1]"]));
      // function that saves to memory the maxima of the displayed chart
      PlotInfo.maxDisp = 0;
      for (i = 0; i < Selected.arr.length; i++) {
        let maxima = Math.max(
          ...unpack(gdata, selected.arr[i].id).slice(
            PlotInfo.rangeStartI,
            PlotInfo.rangeEndI
          )
        );
      }
    } else {
      console.log("Issue with the relayout!");
      //PlotInfo.rangeStartI = 0;
      //  PlotInfo.rangeEndI = Hyperparameters.nb_hours;
    }

    PlotInfo.maxDisp = Math.max(PlotInfo.maxDisp, maxima);

    // Change the range of the slider
    document.getElementById("range").max =
      PlotInfo.rangeEndI - PlotInfo.rangeStartI - 1;
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
}

// Initialisation of the first graph at the opening of the page

init();
//stopSpinner();
