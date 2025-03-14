function makeTimelineBar(startYear, endYear){
    timeLineLeftCoord = 20
    timeLineRightCoord = 800
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

        
        
        const dragResult = d3.drag()

        
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
                if(mx < (timeLineRightCoord + 10) && mx >  leftLoc){
                    rightLoc = mx
                    endYearGlobal = timeScale(mx)
                    endText.attr("x", mx)
                           .text(timeScale(mx))
                    return "translate(" + mx + ",0)"
                    //d3.select(this).attr("transform", "translate(" +
                    //  mx + ",0)")
                    
                }else{
                    rightLoc = (timeLineRightCoord + 10)
                    endYearGlobal = timeScale(rightLoc)
                    endText.attr("x", rightLoc)
                           .text(timeScale(rightLoc))
                    return "translate(" + (timeLineRightCoord + 10) + ",0)";
                }    
            }else{
                if(mx < rightLoc && mx >  timeLineLeftCoord){
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

    timeLineLeftCoord = 20
    timeLineRightCoord = 800
    leftLoc = timeLineLeftCoord
    rightLoc = timeLineRightCoord

   
    
    const timelineGraph = lineGraphSvg.append("g");

    timelineGraph.attr('transform', ('translate( 0, 10)'))
    timelineGraph.attr("id", "TimelineGraph")

    
    xAxis = timelineGraph.append("line")
            .attr("x1", timeLineLeftCoord)
            .attr("x2", timeLineRightCoord + 20)
            .attr("y1", 300)
            .attr("y2", 300)
            .attr("stroke", "grey")
            .attr("stroke-width", 10)
    
    yAxis = timelineGraph.append("line")
            .attr("x1", timeLineLeftCoord+5)
            .attr("x2", timeLineLeftCoord+5)
            .attr("y1", 300)
            .attr("y2", 0)
            .attr("stroke", "grey")
            .attr("stroke-width", 10)
    dynamicGraph = timelineGraph.append("g")

    updateTimeGraph(startYear, endYear)
}
function updateTimeGraph(startYear, endYear){
    dynamicGraph.selectAll("*").remove()
    outputRange = []
    console.log(startYear)
    console.log(endYear)
    for(i = startYear; i <= endYear; i ++){
        outputRange.push(i)
    }

    const timeScale = d3.scaleQuantize([timeLineLeftCoord, timeLineRightCoord], outputRange)
    
    labelCount = 0
    outputIndex = -1
    lessDates = outputRange.filter(d => {
        outputIndex +=1
        return (outputIndex % 7) === 0
            
    })

    labelDistance = (timeLineRightCoord) / lessDates.length  

            
    xLabels = dynamicGraph.selectAll("text")
                    .data(lessDates)
                    .enter()
                    .append("text")
                    .attr("y", 350)
                    .attr("x", d => {
                        result =  labelCount * labelDistance + timeLineLeftCoord
                        labelCount += 1
                        return result;
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

    const yScale = d3.scaleLinear([0, d3.max(Object.entries(datesDict).map(entry => entry[1]))], [50, 300])
    

    const lineGraph = d3.path()
    lineGraphCount = 0
    lineGraph.moveTo((lineGraphCount+5) * (timeLineRightCoord / outputRange.length), 300)

    for(i = 0; i < outputRange.length; i ++){
        date = outputRange[i]
        count = datesDict[date]
        if(count === undefined){
            y = 0
        }else{
            
            y = yScale(count)
            
        }
        
        lineGraph.lineTo( (lineGraphCount+5) * (timeLineRightCoord / outputRange.length), (300 - y) - 6)
        lineGraphCount += 1
    }

    

    dynamicGraph.append("path")
                .style("stroke", "black")
                .style("fill", "none")
                .attr("d", lineGraph)
}
