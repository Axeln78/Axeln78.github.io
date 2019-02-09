var fs = require('fs')
var gexf = require('ngraph.gexf')
var graph = gexf.load(fs.readFileSync('myfile.gexf', 'utf8'))
// graph is now normal grpah and can be used by ngraph modules
