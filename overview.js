function makeOverview(data){
    //overviewWrapper = d3.create("div")
    totalPapers = overviewWrapper.append("div")
    totalPapers.style("display", "flex")
    //set up the overview
    totalPapers.append("span")
        .style("float", "left")
        .text("Distinct works: ")
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
             .text(currentRoot ? currentRoot.id : "All Topics")

    // This persistent row reports a work-based share after topic selection.
    // It stays hidden for All Topics so the existing default Overview is unchanged.
    const corpusShare = overviewWrapper.append("div")
        .attr("id", "corpusShareRow")
        .style("display", "none")
    corpusShare.append("span")
        .text("Share of date-filtered corpus: ")
        .style("font-weight", "bold")
        .style("padding-right", "2px")
    corpusShare.append("div")
        .attr("id", "corpusShare")
    
    //StatisticsContainer.append(overviewWrapper.node())
}

function updateOverview(data, dateFilteredWorkCount){
    //Update the total papers and filter name when there is change
    d3.select("#totalPapers").text(data.length)
    d3.select("#topicName").text(currentRoot ? currentRoot.id : "All Topics")

    const showShare = currentRoot &&
        currentRoot.id !== "All Topics" &&
        dateFilteredWorkCount > 0
    d3.select("#corpusShareRow").style("display", showShare ? "flex" : "none")

    if (showShare) {
        // data contains each work at most once; the denominator is captured
        // before the existing topic filter is applied.
        const percentage = data.length / dateFilteredWorkCount * 100
        d3.select("#corpusShare").text(`${percentage.toFixed(1)}%`)
    } else {
        d3.select("#corpusShare").text("")
    }
}
