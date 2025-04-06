function makeTimelineBar(startYear, endYear){
    let timeLineLeftCoord = 20
    let timeLineRightCoord = 800
    leftLoc = timeLineLeftCoord
    rightLoc = timeLineRightCoord

    outputRange = []
    
    for(i = startYear; i <= endYear; i ++){ //Make an array from start year to end year
        outputRange.push(i)
    }
    //used for when the user drags the bar across the timeline. Uses the coordinate of the bar to determine the
    // year that the bar is currently at.
    const timeScale = d3.scaleQuantize([timeLineLeftCoord, timeLineRightCoord], outputRange)
    //Make a bar from the left coord to the right coord
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
        
        //Make a vertical bar for the start year
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
        
        //Same as above, but for the end year
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
         
        //Allow the margins to move
        timelineBar.selectAll(".TimeMargin").call(d3.drag()
                                                    .on("start", dragstarted)
                                                    .on("drag", dragged)
                                                    .on("end", dragended))

    function dragstarted(event){
        d3.select(this).attr("stroke", "black") //make the bar change colour when moving
       
    }
    
    function dragged(event){
        const [mx, my] = d3.pointer(event)
        d3.select(this).attr("transform", () =>{
             //error checking to make sure the bar doesn't go off the timeline or pass the other bar
            if(this.id === "rightMargin"){ 
                if(mx <= (timeLineRightCoord+10) && mx >  leftLoc){
                    rightLoc = mx
                    endYearGlobal = timeScale(mx)
                    endText.attr("x", mx)
                           .text(timeScale(mx)) //what's the year that should be shown?
                    return "translate(" + mx + ",0)" //Move the bar
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
                             .text(timeScale(mx)) //what's the year to be shown
                    return "translate(" + mx + ",0)" //move the bar
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
    //Draw the x and y axis
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

    //Draw the ticks for the y labels
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
    dynamicGraph.selectAll("*").remove() //clean the graph
    outputRange = []
    
    for(i = startYear; i <= endYear; i ++){
        outputRange.push(i) 
    }

    
    //Where should the years be on the timeline?
    const timeScale = d3.scaleLinear([startYear, endYear], [timeLineLeftCoord, timeLineRightCoord])
    
    numDates = 10
    labelCount = 0
    outputIndex = -1
    dateStep = Math.floor(outputRange.length / numDates)
    console.log(dateStep)
    lessDates = []
    //Partition the dates in 10 boxes
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
    
    labelDistance = (timeLineRightCoord) / lessDates.length  

    //Labe the years        
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
    
    //Construct the linegraph.
    const lineGraph = d3.path()
    lineGraphCount = 0
    firstDate = outputRange[0]
    firstCount = datesDict[firstDate]
    if(firstCount === undefined){
        firstY = 0
    }else{
        firstY = yScale(firstCount)
    } //We do the first entry as a moveTo instead of a lineTo. 
    //This code determines the X location in the same way the dates locations are determine 
    // and uses the yScale to determine the height of the line graph
    lineGraph.moveTo( (lineGraphCount) * (timeLineRightCoord / outputRange.length) +timeLineLeftCoord +10, (300 - firstY) - 0)
    lineGraphCount += 1

    //Same as above but for all the other years
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
        
        yPos = step * i
        yLabelLoc.push(yPos)
        
    }
    //Make ticks for the y axis that represent the number of publications.  
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
