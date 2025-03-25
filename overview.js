function makeOverview(data){
    overviewWrapper = d3.create("div")
    totalPapers = overviewWrapper.append("div")
    totalPapers.style("display", "flex")
    totalPapers.append("span")
        .style("float", "left")
        .text("Total papers: ")
        .style("font-weight", "bold")
        .style("padding-right", "2px")
    totalPapers.append("div")
         .attr("id", "totalPapers")
         .style("float", "right")     
         .text(data.length) 


    topicName = overviewWrapper.append("div")
    topicName.style("display", "flex")
    topicName.append("span")
        .style("float", "left")
        .text("Topic: ")
        .style("font-weight", "bold")
        .style("padding-right", "2px")
    
    topicName.append("div")
             .attr("id", "topicName")
             .style("float", "right")
             .text(sunburstTitle.textContent)
    
    StatisticsContainer.append(overviewWrapper.node())
}

function updateOverview(data){
        
    d3.select("#totalPapers").text(data.length)
    d3.select("#topicName").text(sunburstTitle.textContent)
}