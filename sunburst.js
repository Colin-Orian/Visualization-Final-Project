function makeSunburst(data){
    const sunburstWidth = 700
    const sunburstHeight = sunburstWidth
    const radius = sunburstWidth / 12
    const rootStyle = getComputedStyle(document.documentElement)
    const cssColor = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback
    const theme = {
        panelBackground: cssColor("--panel-background", "#fdfdfd"),
        tooltipSurface: cssColor("--panel-header-background", "#f6eee7"),
        primaryText: cssColor("--primary-text", "#3f465a"),
        secondaryText: cssColor("--secondary-text", "#667085"),
        border: cssColor("--border", "#ded6cf"),
        primaryAccent: cssColor("--primary-accent", "#2f8f6b"),
        secondaryAccent: cssColor("--secondary-accent", "#ae9176"),
        hoverBackground: cssColor("--hover-background", "#f6eee7")
    }
    //const radius = 100  / 2
    const branchPalette = [
        "#5f7f9f", // muted blue
        "#4f9083", // teal
        "#83a36f", // sage green
        "#c29458", // sand
        "#b97062", // soft red
        "#876f91", // plum
        "#6f9da3", // blue-green
        "#9a806a", // taupe
        "#798bab", // slate blue
        "#a68b66", // warm ochre
        "#9a7584", // dusty rose
        "#6f8d78"  // muted forest
    ]
    const color = d3.scaleOrdinal()
        .domain(data.children.map(d => d.data.name))
        .range(branchPalette)

    // Descendants inherit their top-level branch hue. Mixing toward the panel
    // surface produces a restrained depth cue without adding a new data encoding.
    function branchColor(d){
        let branch = d
        while(branch.depth > 1) branch = branch.parent
        const base = color(branch.data.name)
        const depthSoftening = Math.min(0.42, Math.max(0, d.depth - 1) * 0.12)
        return d3.interpolateRgb(base, theme.panelBackground)(depthSoftening)
    }
    
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
            .style("font-family", '"Segoe UI", Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif')
            .style("font-size", "10px")
            .attr("class", "sunburst-background")
            
    const path = sunburstContainer.append('g')
            .attr('transform', ('translate( 400, 400)'))
            .selectAll("path")
            .data(root.descendants().slice(1))
            .join("path") //draw the arcs
                //determine the colour based off of the Domain parent.
                .style("fill", branchColor)
                .attr("stroke", theme.panelBackground)
                .attr("stroke-width", 0.75)
                .attr("stroke-linejoin", "round")
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
                    .attr("fill", theme.tooltipSurface)
                    .attr("pointer-events", "all")
                    .attr("stroke", theme.border)
                    .attr("stroke-width", 1.25)
                    .style("cursor", "pointer")
                    .on("mouseover", function(){
                        d3.select(this)
                            .attr("fill", theme.hoverBackground)
                            .attr("stroke", theme.primaryAccent)
                    })
                    .on("mouseout", function(){
                        d3.select(this)
                            .attr("fill", theme.tooltipSurface)
                            .attr("stroke", theme.border)
                    })
                    .on("click", clicked) //go up one parent
    
          
    //tool tip to provide information about the arc
    const tooltip = sunburstContainer.append("g")
                    .attr("class", "tooltip")
                    .attr("aria-hidden", "true")
                    .style("pointer-events", "none")
                    .style("opacity", 0)
                    .style("filter", "drop-shadow(0 3px 7px rgba(63, 70, 90, 0.16))")

    tooltip.append("rect")
           .attr("rx", 7)
           .attr("ry", 7)
           .attr("fill", theme.tooltipSurface)
           .attr("stroke", theme.secondaryAccent)
           .attr("stroke-width", 1)

    tooltip.append("text")
           .attr("fill", theme.primaryText)
           .style("font-size", "12px")
           .style("font-weight", 600)

    //used for the overview section
    sunBurstTitle = sunburstContainer.append("text")
                    .attr('transform', ('translate( 400, 400)'))
                    .attr("id", "sunburstTitle")
                    .attr("fill", theme.primaryText)
                    .style("font-size", "20px")
                    .style("display", "none")
                    .text("All Topics")
    
    function mouseMove(event, p){
        // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3

        d3.select(event.currentTarget)
            .interrupt()
            .attr("fill-opacity", 1)
            .attr("stroke", theme.primaryText)
            .attr("stroke-width", 1.25)

        showTooltip(event, p.id)
    }
    function mouseOut(event, p){
        // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3
        d3.select(event.currentTarget)
            .attr("fill-opacity", arcVisible(p.current) ? (p.children ? 1.0 : 0.8) : 0)
            .attr("stroke", theme.panelBackground)
            .attr("stroke-width", 0.75)
        tooltip.style("opacity", 0).attr("aria-hidden", "true")
    }

    function showTooltip(event, value){
        const text = String(value || "")
        if(!text){
            tooltip.style("opacity", 0).attr("aria-hidden", "true")
            return
        }

        const paddingX = 10
        const paddingY = 7
        const fontSize = 12
        const lineHeight = 16
        const safeMargin = 8
        const pointerOffset = 14
        const maxTextWidth = Math.min(360, sunburstWidth - 2 * (safeMargin + paddingX))
        const tooltipText = tooltip.select("text")

        // SVG text has no native wrapping. Measure candidate lines with the
        // active font so the background follows both short and long topic names.
        const probe = tooltipText.append("tspan").style("visibility", "hidden")
        const measure = candidate => {
            probe.text(candidate)
            return typeof probe.node().getComputedTextLength === "function"
                ? probe.node().getComputedTextLength()
                : candidate.length * 7
        }
        const words = text.split(/\s+/)
        const lines = []
        let currentLine = ""
        words.forEach(word => {
            const candidate = currentLine ? `${currentLine} ${word}` : word
            if(currentLine && measure(candidate) > maxTextWidth){
                lines.push(currentLine)
                currentLine = word
            }else{
                currentLine = candidate
            }
        })
        if(currentLine) lines.push(currentLine)
        probe.remove()

        const tspans = tooltipText.selectAll("tspan")
            .data(lines)
            .join("tspan")
            .attr("x", paddingX)
            .attr("y", (_, index) => paddingY + fontSize + index * lineHeight)
            .text(line => line)

        const measuredWidths = []
        tspans.each(function(line){
            measuredWidths.push(typeof this.getComputedTextLength === "function"
                ? this.getComputedTextLength()
                : line.length * 7)
        })
        const cardWidth = Math.ceil(Math.max(100, ...measuredWidths) + 2 * paddingX)
        const cardHeight = Math.ceil(lines.length * lineHeight + 2 * paddingY)
        tooltip.select("rect").attr("width", cardWidth).attr("height", cardHeight)

        const [mx, my] = d3.pointer(event, sunburstContainer.node())
        let x = mx + pointerOffset
        if(x + cardWidth > sunburstWidth - safeMargin) x = mx - cardWidth - pointerOffset
        x = Math.max(safeMargin, Math.min(sunburstWidth - cardWidth - safeMargin, x))

        let y = my - cardHeight - pointerOffset
        if(y < safeMargin) y = my + pointerOffset
        y = Math.max(safeMargin, Math.min(sunburstHeight - cardHeight - safeMargin, y))

        tooltip.attr("transform", `translate(${x}, ${y})`)
               .attr("aria-label", text)
               .attr("aria-hidden", "false")
               .style("opacity", 1)
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
