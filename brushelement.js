// import d3 from 'd3'

var margin = { top: 200, right: 40, bottom: 200, left: 40 }

var width = 700 - margin.left - margin.right

var height = 500 - margin.top - margin.bottom

var x = d3.scaleTime()
  .domain([new Date(2013, 7, 1), new Date(2013, 7, 20) - 1]) // DATA VARIABLE ON SLIDER
  .rangeRound([0, width])

var svg = d3.select('body').append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

svg.append('g')
  .attr('class', 'axis axis--grid')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x)
    .ticks(d3.timeHour, 12)
    .tickSize(-height)
    .tickFormat(function () { return null }))
  .selectAll('.tick')
  .classed('tick--minor', function (d) { return d.getHours() })

svg.append('g')
  .attr('class', 'axis axis--x')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x)
    .ticks(d3.timeDay)
    .tickPadding(0))
  .attr('text-anchor', null)
  .selectAll('text')
  .attr('x', 6)

svg.append('g')
  .attr('class', 'brush')
  .call(d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('end', brushended))

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

  d3.select(this).transition().call(d3.event.target.move, d1.map(x))
}
