function makeOverview(data){
    //overviewWrapper = d3.create("div")
    totalPapers = overviewWrapper.append("div")
    totalPapers.style("display", "flex")
    //set up the overview
    totalPapers.append("span")
        .style("float", "left")
        .text("Total papers: ")
        .style("font-weight", "bold")
        .style("padding-right", "2px")
    //display the total papers in the filter
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
    
    //Display the current filter in use
    topicName.append("div")
             .attr("id", "topicName")
             .style("float", "right")
             .text(sunburstTitle.textContent)
    
    //StatisticsContainer.append(overviewWrapper.node())
}

function updateOverview(data){
    //Update the total papers and filter name when there is change
    d3.select("#totalPapers").text(data.length)
    d3.select("#topicName").text(sunburstTitle.textContent)
}