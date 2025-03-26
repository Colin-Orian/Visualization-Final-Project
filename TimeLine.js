function makeTimelineBar(startYear, endYear){
    let timeLineLeftCoord = 20
    let timeLineRightCoord = 800
    leftLoc = timeLineLeftCoord
    rightLoc = timeLineRightCoord

    outputRange = []
    
    for(i = startYear; i <= endYear; i ++){
        outputRange.push(i)
    }
    const timeScale = d3.scaleQuantize([timeLineLeftCoord, timeLineRightCoord], outputRange)
    const timelineBar = svg.append("g")
        timelineBar.attr('transform', ('translate( 0, 0)'))
                   .attr("id", "Timeline Bar")
        timelineBar.append("rect")
                   .attr("x", timeLineLeftCoord)
                   .attr("y", 0)
                   .attr("width", timeLineRightCoord)
                   .attr("height", 50)
                   .attr("fill", "lightblue");

                
        startMargin = timelineBar.append("g");
        

        startMargin.append("rect")
                    .attr('transform', ('translate(' + timeLineLeftCoord +', 0)'))
                    .attr("class", "TimeMargin")
                    .attr("id", "leftMargin")
                    .attr("width", 10)
                    .attr("height", 75)
                    .attr("fill", "grey")
                    .style("cursor", "pointer")
                    
       startText = startMargin.append("text")
                    .attr("x", timeLineLeftCoord)
                    .attr("y", 90)
                    .style("fill", "black")
                    .style('text-anchor', "middle")
                    .text(startYear);
        
        endMargin = timelineBar.append("g");
        
                   
        endMargin.append("rect")
                    .attr('transform', ('translate(' + (timeLineRightCoord + 10) +', 0)'))
                    .attr("class", "TimeMargin")
                    .attr("id", "rightMargin")
                    .attr("width", 10)
                    .attr("height", 75)
                    .style("cursor", "pointer")
                    .attr("fill", "grey");
        endText = endMargin.append("text")
                    .attr("x", timeLineRightCoord)
                    .attr("y", 90)
                    .style("fill", "black")
                    .style('text-anchor', "middle")
                    .text(endYear);
         
        timelineBar.selectAll(".TimeMargin").call(d3.drag()
                                                    .on("start", dragstarted)
                                                    .on("drag", dragged)
                                                    .on("end", dragended))

    function dragstarted(event){
        d3.select(this).attr("stroke", "black")
       
    }
    
    function dragged(event){
        const [mx, my] = d3.pointer(event)
        d3.select(this).attr("transform", () =>{
            if(this.id === "rightMargin"){  
                if(mx <= (timeLineRightCoord+10) && mx >  leftLoc){
                    rightLoc = mx
                    endYearGlobal = timeScale(mx)
                    endText.attr("x", mx)
                           .text(timeScale(mx))
                    return "translate(" + mx + ",0)"
                    //d3.select(this).attr("transform", "translate(" +
                    //  mx + ",0)")
                    
                }else{
                    rightLoc = (timeLineRightCoord)
                    endYearGlobal = timeScale(rightLoc)
                    endText.attr("x", rightLoc)
                           .text(timeScale(rightLoc))
                    return "translate(" + (timeLineRightCoord+10) + ",0)";
                }    
            }else{
                if(mx < rightLoc && mx >=  timeLineLeftCoord){
                    leftLoc = mx
                    startYearGlobal = timeScale(mx)
                    startText.attr("x", mx)
                             .text(timeScale(mx))
                    return "translate(" + mx + ",0)"    
                }else{
                    leftLoc = timeLineLeftCoord
                    startText.attr("x", leftLoc)
                    startYearGlobal = timeScale(leftLoc)
                    startText.text(timeScale(leftLoc))
                    console.log(timeLineLeftCoord)
                    return "translate(" + timeLineLeftCoord + ",0)";
                }
            }
                
        })
         
    }
    
    function dragended(event){
        filterData()
        d3.select(this).attr("stroke", "none")
        
    }
        
}

function makeTimelineGraph(startYear, endYear){

    let timeLineLeftCoord = 40
    let timeLineRightCoord = 820
    leftLoc = timeLineLeftCoord
    rightLoc = timeLineRightCoord

    const timelineGraph = lineGraphSvg.append("g");

    timelineGraph.attr('transform', ('translate( 0, 30)'))
    timelineGraph.attr("id", "TimelineGraph")

    xAxis = timelineGraph.append("line")
            .attr("x1", timeLineLeftCoord)
            .attr("x2", timeLineRightCoord + timeLineLeftCoord)
            .attr("y1", 310)
            .attr("y2", 310)
            .attr("stroke", "grey")
            .attr("stroke-width", 10)
    
    yAxis = timelineGraph.append("line")
            .attr("x1", timeLineLeftCoord+5)
            .attr("x2", timeLineLeftCoord+5)
            .attr("y1", 310)
            .attr("y2", 0)
            .attr("stroke", "grey")
            .attr("stroke-width", 10)


    //Y labels
    numLabels = 10
    step = 300 / numLabels
    yLabelLoc = []
    for(i = 0; i <= numLabels; i ++){
        //yPos = 300 - step * i
        yPos = step * i
        yLabelLoc.push(yPos)
    }
    timelineGraph.selectAll("#labelDashes")
                 .data(yLabelLoc)
                 .enter()
                 .append("line")
                 .attr("stroke", "darkgreen")
                 .attr("stroke-width", 3)
                 .attr("x1", timeLineLeftCoord-30)
                 .attr("x2", timeLineLeftCoord)
                 .attr("y1", d => d)
                 .attr("y2", d => d)


    dynamicGraph = timelineGraph.append("g")

    updateTimeGraph(startYear, endYear)
}
function updateTimeGraph(startYear, endYear){
    let timeLineLeftCoord = 40
    let timeLineRightCoord = 820
    dynamicGraph.selectAll("*").remove()
    outputRange = []
    
    for(i = startYear; i <= endYear; i ++){
        outputRange.push(i)
    }

    //const timeScale = d3.scaleQuantize([timeLineLeftCoord, timeLineRightCoord], outputRange)
    const timeScale = d3.scaleLinear([startYear, endYear], [timeLineLeftCoord, timeLineRightCoord])

    numDates = 10
    labelCount = 0
    outputIndex = -1
    dateStep = Math.floor(outputRange.length / numDates)
    console.log(dateStep)
    lessDates = []
    
    if(dateStep === 0){
        for(i = startYear; i <= endYear; i ++){
            lessDates.push(i)
        }
    }else{
        for(i = startYear; i <= endYear; i += dateStep){
            if((i-startYear) % dateStep === 0){
                console.log(i)
                lessDates.push(i)
            }
            
        }
        
    }
    
    /*
    lessDates = outputRange.filter(d => {
        outputIndex +=1
        return (outputIndex % numDates) === 0
            
    })*/
   //lessDates = []
   

    labelDistance = (timeLineRightCoord) / lessDates.length  

            
    xLabels = dynamicGraph.selectAll("text")
                    .data(lessDates)
                    .enter()
                    .append("text")
                    .attr("y", 350)
                    .attr("x", d => {
                    
                        return timeScale(d)
                    })
                    .text(d => d)
    
                    
    publicationDates = currentData.map(d => d.publication_year)

    datesDict = {}
    publicationDates.forEach(element => {
        if(element in datesDict){
            datesDict[element] +=1
        }else{
            datesDict[element] = 1
        }
    });
    maxEntry = d3.max(Object.entries(datesDict).map(entry => entry[1]))
    const yScale = d3.scaleLinear([0, maxEntry], [0, 300])
    

    const lineGraph = d3.path()
    lineGraphCount = 0
    firstDate = outputRange[0]
    firstCount = datesDict[firstDate]
    if(firstCount === undefined){
        firstY = 0
    }else{
        firstY = yScale(firstCount)
    }
    lineGraph.moveTo( (lineGraphCount) * (timeLineRightCoord / outputRange.length) +timeLineLeftCoord +10, (300 - firstY) - 0)
    lineGraphCount += 1

    for(i = 1; i < outputRange.length; i ++){
        date = outputRange[i]
        count = datesDict[date]
        if(count === undefined){
            y = 0
            
        }else{
            
            y = yScale(count)
            
        }
        
        lineGraph.lineTo( (lineGraphCount) * (timeLineRightCoord / outputRange.length) +timeLineLeftCoord +10, (300 - y) - 0)
        lineGraphCount += 1
    }

    
    //Y labels
    numLabels = 10
    step = (maxEntry - 0) / numLabels 
    yLabelLoc = []
    
    for(i = 0; i <= numLabels; i ++){
        //yPos = 300 - step * i
        yPos = step * i
        yLabelLoc.push(yPos)
        
    }
    
    dynamicGraph.selectAll("#countText")
                .data(yLabelLoc)
                .enter()
                .append('text')
                .text((d) => Math.trunc(d))
                .attr("x", timeLineLeftCoord-30)
                .attr("y", (d) => 300 - (yScale(d)))


    dynamicGraph.append("path")
                .style("stroke", "black")
                .style("fill", "none")
                .attr("d", lineGraph)
}
