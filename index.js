//import sigma from 'sigma_js'

// Add a method to the graph model that returns an
// object with every neighbors of a node inside:
sigma.classes.graph.addMethod('neighbors', function (nodeId) {
  var k

  var neighbors = {}

  var index = this.allNeighborsIndex[nodeId] || {}

  for (k in index) {
    neighbors[k] = this.nodesIndex[k]
  }

  return neighbors
})

/*  a function that takes as input a list of ids and outputs the list of node */

sigma.classes.graph.addMethod('listIDs', function (someIds) {
  // var someIds = ["159966", '81694', '157447']
  var k

  var idS = {}

  for (k in someIds) {
    idS[someIds[k]] = this.nodesIndex[someIds[k]]
  }

  return idS
})

sigma.classes.graph.addMethod('activate', function (toKeep) {
  this.nodes().forEach(function (n) {
    if (toKeep[n.id]) { n.color = n.originalColor } else { n.color = '#eee' }
  })

  this.edges().forEach(function (e) {
    if (toKeep[e.source] && toKeep[e.target]) { e.color = e.originalColor } else { e.color = '#eee' }
  })
})

sigma.parsers.gexf(
  '/data/VizWiki2.gexf',
  {
    container: 'sigma-container2'
  },
  function (s) {
    // We first need to save the original colors of our
    // nodes and edges, like this:
    s.graph.nodes().forEach(function (n) {
      n.originalColor = n.color
    })
    s.graph.edges().forEach(function (e) {
      e.originalColor = e.color
    })

    // When a node is clicked, we check for each node
    // if it is a neighbor of the clicked one. If not,
    // we set its color as grey, and else, it takes its
    // original color.
    // We do the same for the edges, and we only keep
    // edges that have both extremities colored.
    s.bind('clickNode', function (e) {
      let nodeId = e.data.node.id // This is only an integer

      let toKeep = s.graph.neighbors(nodeId)
      toKeep[nodeId] = e.data.node

      // Draw the nodes that should stay activated
      s.graph.activate(toKeep)

      // Since the data has been modified, we need to
      // call the refresh method to make the colors
      // update effective.
      s.refresh()
    })

    // When the stage is clicked, we just color each
    // node and edge with its original color.
    s.bind('clickStage', function (e) {
      s.graph.nodes().forEach(function (n) {
        n.color = n.originalColor
      })

      s.graph.edges().forEach(function (e) {
        e.color = e.originalColor
      })

      // Same as in the previous event:
      s.refresh()
    })
  }
)

// D3
var margin = { top: 100, right: 10, bottom: 100, left: 10 }

var width = 800 - margin.left - margin.right

var height = 300 - margin.top - margin.bottom

var x = d3.scaleTime()
  .domain([new Date(2014, 9, 23), new Date(2015, 1, 30) - 1]) // DATA VARIABLE ON SLIDER  new Date(2015, 4, 30)
  .rangeRound([0, width])

var svg = d3.select('body').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

// Grid /background
svg.append('g')
  .attr('class', 'axis axis--grid')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x)
    .ticks(d3.timeDay, 1)
    .tickSize(-height)
    .tickFormat(function () { return null }))
  .selectAll('.tick')
  .classed('tick--minor', function (d) { return d.getHours() })

// Axis info
svg.append('g')
  .attr('class', 'axis axis--x')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x)
    .ticks(d3.time)
    .tickPadding(0))
  .attr('text-anchor', null)
  .selectAll('text')
  .attr('x', 6)

// brush
svg.append('g')
  .attr('class', 'g')
  .call(d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('end', brushended)) // Here the callback for when the brush is let go

function brushended () {
  if (!d3.event.sourceEvent) return // Only transition after input.
  if (!d3.event.selection) return // Ignore empty selections.
  var d0 = d3.event.selection.map(x.invert)

  var d1 = d0.map(d3.timeDay.round)

  // If empty when rounded, use floor & ceil instead.
  if (d1[0] >= d1[1]) {
    d1[0] = d3.timeDay.floor(d0[0])
    d1[1] = d3.timeDay.offset(d1[0])
  }

  //sigma.classes.graph.nodes() // (["159966", '81694', '157447'])
  d3.select(this).transition().call(d3.event.target.move, d1.map(x))
}
