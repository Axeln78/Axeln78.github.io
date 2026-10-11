# Visualisation of time-varying large graphs for detection of activities in Wikipedia
This website has been built as an interactive tool to display and render the time-varying activity of graphs.
The graph is based on a subset of Wikipedia Pages which have not only a connection, but also a time dependence.

The aim of the project is to give the user a tool to visualise the correlation between the activities of the pages as well as the overall structure of wikipedia.

![Screenshot](Tool.png)
*Screenshot of the graph visualisation tool*

Via the tool users can:
- Select several different graphs corresponding to different weeks.
- Change the layout of the graph.
- Display / hide nodes on the basis of their degree and number of clicks per hour.
- Display / hide edges on the basis of their length.
- Save SVG pictures or Gexf of the graph.
- Save PNG pictures of the activities of the nodes over a period of time.

### Running locally

```
npm install
npm start
```

Then open http://localhost:8000.

### Packages:

Plotly JS:
https://plotly.com/javascript/

Sigma JS:
https://www.sigmajs.org

Prettier styling:
https://prettier.io/

### Context
This project is a student project of the LTS2 lab at EPFL, Switzerland.
