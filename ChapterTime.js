function makeChapterTimeline(coreData, chapters){
    console.log(coreData)
    console.log(chapters)
    const rootStyle = getComputedStyle(document.documentElement)
    const cssColor = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback
    const theme = {
        primaryText: cssColor("--primary-text", "#3f465a"),
        secondaryText: cssColor("--secondary-text", "#667085"),
        border: cssColor("--border", "#ded6cf"),
        mutedStroke: cssColor("--muted-link-stroke", "#c6cdd3"),
        primaryAccent: cssColor("--primary-accent", "#2f8f6b"),
        secondaryAccent: cssColor("--secondary-accent", "#ae9176"),
        tooltipSurface: cssColor("--panel-header-background", "#f6eee7")
    }
    const defaultChapterOpacity = 0.62
    const fadedChapterOpacity = 0.1
    let timeLineLeftCoord = 40
    let timeLineRightCoord = 820
    leftLoc = timeLineLeftCoord
    rightLoc = timeLineRightCoord


    
    chapterGraph = chapterTimelineSVG.append("g")
    chapterGraph.attr('transform', ('translate( 0, 30)'))

    xAxis = chapterGraph.append("line")
    xAxis.attr("x1", timeLineLeftCoord)
         .attr("x2", timeLineRightCoord)
         .attr("y1", 310)
         .attr("y2", 310)
         .attr("stroke", theme.mutedStroke)
         .attr("stroke-width", 1.5)

    yAxis = chapterGraph.append("line")
    yAxis.attr("x1", timeLineLeftCoord+5)
    yAxis.attr("x2", timeLineLeftCoord+5)
    yAxis.attr("y1", 310)
    yAxis.attr("y2", 0)
    .attr("stroke", theme.mutedStroke)
    .attr("stroke-width", 1.5)
    
    timeResults = createHist(coreData)

    const timeScale = d3.scaleLinear([timeResults.minYear, timeResults.maxYear], [timeLineLeftCoord, timeLineRightCoord])
    const color = d3.scaleOrdinal().domain(chapters.map(d => {d.woaii_chapter}))
                                   .range(d3.schemeCategory10)
    const countScale = d3.scaleLinear([0, timeResults.maxCount], [0, 310])
    const screenToCount = d3.scaleLinear([300, 0], [0, timeResults.maxCount])    

    //timeStack = dictToStack(timeResults)
    //console.log(timeStack)
    numLabels = 10
    step = 300 / numLabels
    yLabelLoc = []
    countTics = []
    for(i = 0; i <= numLabels; i ++){
        //yPos = 300 - step * i
        yPos = step * i
        yLabelLoc.push(yPos)

    }
    chapterGraph.selectAll("#labelDashes")
                 .data(yLabelLoc)
                 .enter()
                 .append("line")
                 .attr("stroke", theme.primaryAccent)
                 .attr("stroke-width", 2)
                 .attr("x1", timeLineLeftCoord-30)
                 .attr("x2", timeLineLeftCoord)
                 .attr("y1", d => d)
                 .attr("y2", d => d)
    
    chapterGraph.selectAll("#yLabels")
                .data(yLabelLoc)
                .enter()
                .append("text")
                .attr("x", timeLineLeftCoord-30)
                // SVG text uses y as its baseline; lift the label clear of the tick line.
                .attr("y", d=>{
                    return d - 6
                })
                .text(d =>{
                    return Math.floor(screenToCount(d))
                })
                .attr("fill", theme.secondaryText)
                .style("font-size", "12px")

    
    

    outputRange = []
    dateStep = 4
    dateCounter = 0
    for(i = timeResults.minYear; i <= timeResults.maxYear; i ++){
        
        dateCounter ++ 
        if(dateCounter == dateStep){
            outputRange.push(i)
            dateCounter = 0
        }
    }
    

    //Labe the years        
    xLabels = chapterGraph.selectAll("#yearText")
                    .data(outputRange)
                    .enter()
                    .append("text")
                    .attr("y", 350)
                    .attr("x", d => {
                    
                        return timeScale(d)
                    })
                    .attr("fill", theme.secondaryText)
                    .style("font-size", "12px")
                    .text(d => d)
    
    
    
    timelineLines = chapterGraph.append("g")

    
    for (const [key, value] of Object.entries(timeResults)) {
        
        if(key != "maxYear" && key != "minYear" && key != "maxCount"){
            line = d3.path()
            currentCount = 0
            if(timeResults[key][timeResults.minYear] != undefined){
                currentCount = timeResults[key][timeResults.minYear]
            }
            line.moveTo(timeScale(parseInt(timeResults.minYear)), 300 - countScale(parseInt(currentCount)))

            for(i = (parseInt(timeResults.minYear) + 1); i <= parseInt(timeResults.maxYear); i ++){
                if(timeResults[key][i] != undefined){

                    currentCount = timeResults[key][i]
                    
                }else{
                    currentCount = 0
                }
                
                line.lineTo(timeScale(i), 300 - countScale(currentCount))  
            }

            timelineLines.append("path")
                        .attr("d", line)
                        .attr("stroke", chapterColor[key])
                        .attr("stroke-width", "4px")
                        .attr("id", "time_line_" + key)
                        .attr("fill", "none")
                        .attr("opacity", defaultChapterOpacity)
                        .attr("stroke-linecap", "round")
                        .attr("stroke-linejoin", "round")
            
        }
    }

    
    legend = chapterGraph.append("g")
    legend.append("rect")
          .attr("x", timeLineLeftCoord)
          .attr("y", 360)
          .attr("height", 150)
          .attr("width", timeLineRightCoord)
          .attr("rx", 8)
          .attr("ry", 8)
          .attr("fill", "none")
          .attr("stroke", theme.border)
          .attr("stroke-width", 1)
    /*
    legend.selectAll(".legendEntries")
          .data(chapters)
          .enter()
          .append("rect")
          .attr("x", d =>{
            temp = (legendStep * legendCount) + timeLineLeftCoord + legendSpacing
            legendCount ++
            return temp
          })
          .attr("y", 360 + legendSpacing)
          .attr("fill", d => color(d.woaii_chapter))
          .attr("width", 30)
          .attr("height", 30)
    */
    itemsPerRow =  23
    rows = 3
    legendSpacing = 4
    legendCount = 0
    boxWidth = 30
    legendWidth = (timeLineRightCoord - timeLineLeftCoord)

    legendLoc = {}
    for(i = 0; i < chapters.length; i ++){
        let legendX = (boxWidth + legendSpacing) * (i % itemsPerRow) + timeLineLeftCoord + legendSpacing
        let legendY = 360 + (boxWidth  + legendSpacing) * Math.floor(i / itemsPerRow) + legendSpacing
        
        legendLoc[chapters[i].woaii_chapter] = {x: legendX, y: legendY}
        
    }

    
    legend.selectAll(".legendEntries")
          .data(chapters)
          .enter()
          .append("rect")
          .attr("x", d =>{
            return legendLoc[d.woaii_chapter].x
          })
          .attr("y", d =>{
            return legendLoc[d.woaii_chapter].y
          })
          .attr("width", boxWidth)
          .attr("height", boxWidth)
          .attr("rx", 5)
          .attr("ry", 5)
          .attr("fill", d =>{
            return chapterColor[d.woaii_chapter]
          })
          .attr("fill-opacity", 0.82)
          .attr("stroke", theme.border)
          .attr("stroke-width", 1)
          .on("mouseover", timelineMouseOver)
          .on("mouseout", timelineMouseOut)
          
    legend.selectAll("text")
          .data(chapters)
          .enter()
          .append("text")
          .attr("x", d =>{
            return legendLoc[d.woaii_chapter].x + (boxWidth / 2)
          })
          .attr("y", d =>{
            return legendLoc[d.woaii_chapter].y + (boxWidth /2)
          })
          .text( d =>{
            return d.woaii_chapter
          })
          .style("fill", theme.primaryText)
          .style("font-size", "12px")
          .style("font-weight", 600)
          .style("text-anchor", "middle")
          .style("dominant-baseline", "middle")
          .style("pointer-events", "none")


    const tooltip = chapterTimelineSVG.append("g")
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
        const svgWidth = Number(chapterTimelineSVG.attr("width"))
        const svgHeight = Number(chapterTimelineSVG.attr("height"))
        const maxTextWidth = Math.min(360, svgWidth - 2 * (safeMargin + paddingX))
        const tooltipText = tooltip.select("text")

        // SVG text does not wrap itself, so measure candidate lines using the
        // active font before sizing the card around the resulting tspans.
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

        const [mx, my] = d3.pointer(event, chapterTimelineSVG.node())
        let x = mx + pointerOffset
        if(x + cardWidth > svgWidth - safeMargin) x = mx - cardWidth - pointerOffset
        x = Math.max(safeMargin, Math.min(svgWidth - cardWidth - safeMargin, x))

        let y = my - cardHeight - pointerOffset
        if(y < safeMargin) y = my + pointerOffset
        y = Math.max(safeMargin, Math.min(svgHeight - cardHeight - safeMargin, y))

        tooltip.attr("transform", `translate(${x}, ${y})`)
               .attr("aria-label", text)
               .attr("aria-hidden", "false")
               .style("opacity", 1)
    }


    function timelineMouseOver(event, p){

        const [mx, my] = d3.pointer(event)
      
      showTooltip(event, p.chapter_title)

        timelineLines.selectAll("*").filter((d, t, nodes) =>{
            return nodes[t].id.split("_")[2] == p.woaii_chapter
        }).interrupt().style("opacity", 1)
          

        timelineLines.selectAll("*").filter((d, t, nodes) =>{
            nodeId = nodes[t].id
            //console.log(nodeId)
            
            return nodeId.split("_")[2] != p.woaii_chapter
        }).transition().duration(350).style("opacity", fadedChapterOpacity)
    }
    
    function timelineMouseOut(event, p){
        tooltip.style("opacity", 0).attr("aria-hidden", "true")
        timelineLines.selectAll("*").transition().duration(350).style("opacity", defaultChapterOpacity)
    }
}

function dictToStack(timeDict){
    tempArray = []
    minYear = parseInt(timeDict.minYear)
    maxYear = parseInt(timeDict.maxYear)

    for(const [key, value] of Object.entries(timeDict)){
        for(i = minYear; i <= maxYear; i ++){
            if(key != "maxYear" && key != "minYear" && key != "maxCount"){
                count = (value[i] == undefined) ? 0 : value[i]
                tempArray.push({year: i, chap: key, count: count})
            }
        }
    }

    const series = d3.stack()
            .keys(d3.union(tempArray.map(d => d.chap)))
            .value(([, group], key) => group.get(key).count)
            (d3.index(tempArray, d => d.year, d => d.chap))
    return series
}

function createHist(timeData){
    let result = {}
    let minYear = Infinity
    let maxYear = -Infinity
    let maxCount = -Infinity
    for(i = 0; i < timeData.length; i ++){
        let article = timeData[i]
        let id = article.woaii_chapter
        let year = article.publication_year
        if(year < minYear){
            minYear = year

        }
        if(year > maxYear){
            maxYear = year
        }
        if(result[id] == undefined){
            result[id] = {}
        }
        
        if(result[id][year] == undefined){
            
            result[id][year] = 1
        }else{
            result[id][year] ++
        }
        if(result[id][year] > maxCount){
            maxCount = result[id][year]
        }
    }
    result.maxYear = maxYear
    result.minYear = minYear
    result.maxCount = maxCount
    return result
}

