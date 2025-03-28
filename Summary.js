function makeScrollable(data){
    
    
    
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
        console.log(currentData[0])
        sortedData = currentData.toSorted(function(a, b){
            return b.cited_by_count - a.cited_by_count;
        });
        
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
            let buttonWrapper = summaryWrapper.append("div")
            let moreInfoButton = buttonWrapper.append("img")
            let tagWrapper = summaryWrapper.append("div")
            
            let seedButton = buttonWrapper.append("img")
            seedButton.attr("src", "res/seed.svg")
            seedButton.style("cursor", "pointer")
            seedButton.attr("class", "button")

            moreInfoButton.on("click", function(){
                showMoreInfo(element)
            });
            
            seedButton.on("click", function(){
                setSeed(element)
            })
            

            number.attr("class", "score")        
            title.attr("class", "articleTitle")
            year.attr("class", "yearInfo")
            buttonWrapper.attr("class", "buttonWrapper")
            tagWrapper.attr("class", "tagWrapper")
            moreInfoButton.attr("src", "res/MoreDetails.svg")
            moreInfoButton.attr("class", "button")
            number.append("text").text(element.cited_by_count)
            title.append("text").text(element.title)
            year.append("text").text(element.publication_year)

            //Taggging
            surveyThreashold = 100
            if(element.referenced_works.length >= surveyThreashold){
                let surveyWrapper = tagWrapper.append("div")
                let surveyButton = surveyWrapper.append("img")
                
                surveyWrapper.attr("class", "tag")
                surveyButton.attr("src", "res/litReview.svg")
                let survey = surveyWrapper.append("div")
                survey.text("Litearture Survey")
                   
            }
            if(element.counts_by_year.length > 0){
                
                let averageCited = 0
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
                for(let  i = 0; i < element.counts_by_year.length; i ++){
                    averageCited += element.counts_by_year[0].cited_by_count
                }
                averageCited = averageCited / element.counts_by_year.length
                
                if(Math.floor(averageCited) >= 10){
                    let averageWrapper = tagWrapper.append("div")
                    averageWrapper.attr("class", "tag")
                    let averageButton = averageWrapper.append("img")
                    averageButton.attr("src", "res/citedFrequently.svg")
                   let average = averageWrapper.append("div")
                   average.text("Cited Frequently")
                }
            }else{
                let averageWrapper = tagWrapper.append("div")
                averageWrapper.attr("class", "tag")
                let averageButton = averageWrapper.append("img")
                averageButton.attr("src", "res/unnoted.svg")
                let average = averageWrapper.append("div")
                average.text("Unnoted")
            }

            dateThreashold = 4
            if((new Date().getFullYear() - element.publication_year) <= dateThreashold){
                let novelWrapper = tagWrapper.append("div")
                novelWrapper.attr("class", "tag")
                let novel = novelWrapper.append("div")
                novel.text("New Paper")
            }
            

        });
    }

function showMoreInfo(element){
    
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

function setSeed(article){
    seedArticle = article
    d3.select("#networkTitle").text(article.display_name)
}