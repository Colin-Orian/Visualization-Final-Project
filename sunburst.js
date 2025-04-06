function makeSunburst(data){
    const sunburstWidth = 700
    const sunburstHeight = sunburstWidth
    const radius = sunburstWidth / 12
    //const radius = 100  / 2
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateSinebow, data.children.length + 1)) 
    
    data.sum((d) => d.paperCount) //Sum up all the number of papers to determine the radius of the arcs
    data.sort((a, b) => b.value - a.value);
    
    
    const root = d3.partition() //Partition determines the location of each nodes reletave to their parents
            .size([2 * Math.PI, data.height +1])
            (data);
    root.each(d => d.current = d);
    
    const arc = d3.arc() //function to draw the arcs. This will use the results from d3.partition()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        //.padAngle(d => Math.min((d.x1 - d.x0) / 2), 0.005)
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius -1))
    
    const sunburstContainer = svg.append("svg")
            .style("font", "10px sans-serif")
            .attr("class", "sunburst-background")
            
    const path = sunburstContainer.append('g')
            .attr('transform', ('translate( 400, 400)'))
            .selectAll("path")
            .data(root.descendants().slice(1))
            .join("path") //draw the arcs
                //determine the colour based off of the Domain parent.
                .style("fill", d => {while (d.depth > 1) d = d.parent; return color(d.data.name);}) 
                .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 1.0 : 0.8) : 0)
                .attr("pointer-events", d => arcVisible(d.current) ? "auto": "none")
                .attr("d", d => arc(d.current))
                .attr("id", d => d.id)
                .on("mousemove", mouseMove) //when the user mouses over the arc, display the name of the arc
                .on('mouseout', mouseOut);

      path.filter(d => d.children) //When the user clicks on the arc, filter the data and zoom into that arc
            .style("cursor", "pointer")
            .on("click", clicked);
      
    const dynamicContainer = sunburstContainer.append("circle") //Required to make the zoomable sunburst
                    .attr('transform', ('translate( 400, 400)'))
                    .datum(root)
                    .attr("r", radius)
                    .attr("fill", "none")
                    .attr("pointer-events", "all")
                    .attr("stroke", "black")
                    .on("click", clicked) //go up one parent
    
          
    //tool tip to provide information about the arc
    const tooltip = sunburstContainer.append('text')
                    .attr('transform', ('translate( 400, 400)'))
                    .attr("class", "tooltip")
                    .attr("fill", "black")
                    .style("pointer-events", "none")
                    .style("text-anchor", "middle")
                    .style("font-size", "20px");

    //used for the overview section
    sunBurstTitle = sunburstContainer.append("text")
                    .attr('transform', ('translate( 400, 400)'))
                    .attr("id", "sunburstTitle")
                    .style("font-size", "20px")
                    .style("display", "none")
                    .text("All Topics")
    
    function mouseMove(event, p){
        // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3
        
        const [mx, my] = d3.pointer(event)
        
        tooltip
            .attr('x', mx)
            .attr('y', my)
            .text(p.id)
    }
    function mouseOut(event, p){
        // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3
        tooltip.text("")
        
    }
    currentRoot = root
    function clicked(event, p) {
        //console.log(dynamicContainer)

        dynamicContainer.datum(p.parent || root)
        root.each(d => d.target = { //recalcualte the location of all the arcs.
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });

        const t = sunburstContainer.transition().duration(event.altKey ? 7500 : 750)
        currentRoot = p
        sunBurstTitle.text(p.id);
        
        path.transition(t) //zoom into the selected arc
            .tween("data", d => {
                const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function(d){
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            //change the opacity of the arcs if they are above the currently selected arc
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 1.0 : 0.8) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto": "none")

            .attrTween("d", d => () => arc(d.current));


            filterData() //filter the data based off of the topic.
    }
                    
           
}


function buttonClick(){
    
} 

// Handle zoom on click.


function arcVisible(d) {
    return d.y1 <= 5 && d.y0 >= 1 && d.x1 > d.x0;
    
}

function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
}

function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}