

const width = 800;
const height = 3395;

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);


data = readHierachy("./data/hierachy.csv")

data.then((d) => {
    makeSunburst(d)
})


container.append(svg.node());