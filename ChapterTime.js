function makeChapterTimeline(coreData, chapters){
    console.log(coreData)
    console.log(chapters)
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
         .attr("stroke", "grey")
         .attr("stroke-width", 10)

    yAxis = chapterGraph.append("line")
    yAxis.attr("x1", timeLineLeftCoord+5)
    yAxis.attr("x2", timeLineLeftCoord+5)
    yAxis.attr("y1", 310)
    yAxis.attr("y2", 0)
    .attr("stroke", "grey")
    .attr("stroke-width", 10)
    
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
                 .attr("stroke", "darkgreen")
                 .attr("stroke-width", 3)
                 .attr("x1", timeLineLeftCoord-30)
                 .attr("x2", timeLineLeftCoord)
                 .attr("y1", d => d)
                 .attr("y2", d => d)
    
    chapterGraph.selectAll("#yLabels")
                .data(yLabelLoc)
                .enter()
                .append("text")
                .attr("x", timeLineLeftCoord-30)
                .attr("y", d=>{
                    return d
                })
                .text(d =>{
                    return Math.floor(screenToCount(d))
                })

    
    

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
            
        }
    }

    
    legend = chapterGraph.append("g")
    legend.append("rect")
          .attr("x", timeLineLeftCoord)
          .attr("y", 360)
          .attr("height", 150)
          .attr("width", timeLineRightCoord)
          .attr("fill", "none")
          .attr("stroke", "black")
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
          .attr("fill", d =>{
            return chapterColor[d.woaii_chapter]
          })
          .on("mouseover", timelineMouseOver)
          .on("mouseout", timelineMouseOut)
          
    legend.selectAll("text")
          .data(chapters)
          .enter()
          .append("text")
          .attr("x", d =>{
            return legendLoc[d.woaii_chapter].x
          })
          .attr("y", d =>{
            return legendLoc[d.woaii_chapter].y + (boxWidth /2)
          })
          .text( d =>{
            return d.woaii_chapter
          })
          .style("fill", "black")
          .style("pointer-events", "none")


    const tooltip = legend.append('text')
                    .attr("class", "tooltip")
                    .attr("fill", "black")
                    .style("pointer-events", "none")
                    .style("font-size", "20px");
          
    /*
    for(i = 0; i < chapters.length; i ++){
        temp = (boxWidth + legendSpacing) * (i % itemsPerRow)
        
        yLoc = Math.floor(i / itemsPerRow)



        legend.append("rect")
            .data(chapters[i])
            .attr("x", temp + timeLineLeftCoord)
            .attr("y", 360 + (boxWidth  + legendSpacing) * (yLoc))
            .attr("fill", color(chapters[i].woaii_chapter))
            .attr("width", boxWidth)
            .attr("height", boxWidth)
            .attr("class", "legendEntries")
            .on("mouseover",timelineMouseOver)
            .on("mouseout",timelineMouseOut)

        legend.append('text')
            .attr("x", temp + timeLineLeftCoord)
            .attr("y", 360 + (boxWidth  + legendSpacing) * (yLoc) + (boxWidth / 2))
            .text(chapters[i].woaii_chapter)
            .style("fill", "black")
        
    }*/
 
    

    function timelineMouseOver(event, p){

        const [mx, my] = d3.pointer(event)
      
      tooltip
          .attr('x', timeLineLeftCoord + (timeLineRightCoord - timeLineLeftCoord) / 2)
          .attr('y', 140 + 360)
          .text(p.chapter_title)
          .style("text-anchor", "middle")
          

        timelineLines.selectAll("*").filter((d, t, nodes) =>{
            nodeId = nodes[t].id
            //console.log(nodeId)
            
            return nodeId.split("_")[2] != p.woaii_chapter
        }).transition().duration(350).style("opacity", 0.0)
    }
    
    function timelineMouseOut(event, p){
        tooltip.text("")
        timelineLines.selectAll("*").transition().duration(350).style("opacity", 1)
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

