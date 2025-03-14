function makeScrollable(data){
    
    console.log(data[0])
    
    /*
    summaryListContainer.append("rect")
                        .attr("width", 500)
                        .attr("height", 840)
                        .attr("fill", "lightblue")*/
    publicationList = d3.create("ul")
    publicationList.attr("class", "SummaryList")
    

    //Modal to show more info https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_modal2
    
    modalContent = d3.create("div")
    modalContent.attr("id", "modalContent")
    modalHeader = modalContent.append("div")
    modalHeader.attr("id", "modalHeader")
    
    closeButton = modalHeader.append("span").text("X")
    closeButton.attr("id", "closeButton")
    closeButton.on("click", closeMoreInfo);
    closeButton.style("cursor", "pointer");

    modalHeader.append("h3")
               .attr("id", "articleTitle");
    modalBody = modalContent.append("div")
    modalBody.attr("id", "modalBody")

    modalBody.append("span")
             .style("font-weight", "bold")
             .text("Abstract");
    modalBody.append("div")
             .attr("id", "abstractBody")


    modalBody.append("span")
             .style("font-weight", "bold")
             .text("Author(s)");
    modalBody.append("div")
             .attr("id", "authorBody")
    
    
    modalFooter = modalContent.append("div")
    modalFooter.attr("id", "modalFooter")
    modalFooter.append("span")
               .style("font-weight", "bold")
               .text("DOI: ")
    modalFooter.append("a")
               .attr("id", "doiLink")
               .attr("target", "_blank");
               
    modalRoot.append(modalContent.node())

    updateScrollable(data)
    

    listContainer.append(publicationList.node())

}
    function updateScrollable(currentData){

        sortedData = currentData.toSorted(function(a, b){
            return b.cited_by_count - a.cited_by_count;
        });
        console.log(sortedData.length)
        publicationList.selectAll("li").remove()
        //publicationList.attr("height", 840)
        //publicationList.style("overflow", "auto")
        sortedData.forEach(element => {
            let entry = publicationList.append("li")
            let temp = entry.append("div")
            temp.attr("class", "articleWrapper")
            let number = temp.append("div")
            let summaryWrapper = temp.append("div")
            let title = summaryWrapper.append("div")
            let year = summaryWrapper.append("div")

            entry.on("click", function(){
                showMoreInfo(element)
            });
            entry.style("cursor", "pointer");

            number.attr("class", "score")        
            title.attr("class", "articleTitle")
            year.attr("class", "yearInfo")
            number.append("text").text(element.cited_by_count)
            title.append("text").text(element.title)
            year.append("text").text(element.publication_year)
            
        });
    }

function showMoreInfo(element){
    console.log(element)
    d3.select("#articleTitle").text(element.display_name)

    if(element.ab === undefined){
        d3.select("#abstractBody").text("No abstract found.")
    }else{
        d3.select("#abstractBody").text(element.ab)
    }
    

    authors = ""
    element.author.forEach((a) =>{
        authors += a.au_display_name + ", "
    })
    d3.select("#authorBody").text(authors)

    d3.select("#doiLink").text(element.doi)
                         .attr("href", element.doi);


    d3.select(".modal").style("display", "block")
    d3.select(".modal").transition().style("opacity", 1.0)
}

function closeMoreInfo(){
    d3.select(".modal").transition().style("opacity", 0.0)
    d3.select(".modal").style("display", "none")

}