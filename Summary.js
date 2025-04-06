function makeScrollable(data){
    
    publicationList = d3.create("ul")
    publicationList.attr("class", "SummaryList")
    
    //Modal to show more info https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_modal2
    
    //Create a modal that will appear above the rest of the system. This modal will provide more information about the article (such as the abstract)
    modalContent = d3.create("div")
    modalContent.attr("id", "modalContent")
    modalHeader = modalContent.append("div")
    modalHeader.attr("id", "modalHeader")
    
    closeButton = modalHeader.append("span").text("X")
    closeButton.attr("id", "closeButton")
    closeButton.on("click", closeMoreInfo);
    closeButton.style("cursor", "pointer");

    modalHeader.append("h3") //Title
               .attr("id", "articleTitle");
    modalBody = modalContent.append("div")
    modalBody.attr("id", "modalBody")

    modalBody.append("span") //Abstract
             .style("font-weight", "bold")
             .text("Abstract");
    modalBody.append("div")
             .attr("id", "abstractBody")


    modalBody.append("span") //authors
             .style("font-weight", "bold")
             .text("Author(s)");
    modalBody.append("div")
             .attr("id", "authorBody")
    
    
    modalFooter = modalContent.append("div") //DOI
    modalFooter.attr("id", "modalFooter")
    modalFooter.append("span")
               .style("font-weight", "bold")
               .text("DOI: ")
    modalFooter.append("a")
               .attr("id", "doiLink")
               .attr("target", "_blank"); //clicking on the DOI will open it in another tab
               
    modalRoot.append(modalContent.node())

    updateScrollable(data)
    

    listContainer.append(publicationList.node())

}
    function updateScrollable(currentData){
        
        sortedData = currentData.toSorted(function(a, b){
            return b.cited_by_count - a.cited_by_count; //sort the filtered data
        });
        
        publicationList.selectAll("li").remove() //clean the list
        //For each element make an article in the list
        sortedData.forEach(element => {
            let entry = publicationList.append("li")
            let temp = entry.append("div")
            temp.attr("class", "articleWrapper")
            let number = temp.append("div") //How many articles cited this article
            let summaryWrapper = temp.append("div")

            let title = summaryWrapper.append("div")
            let year = summaryWrapper.append("div")

            //Buttons the user can click
            let buttonWrapper = summaryWrapper.append("div")
            let moreInfoWrapper = buttonWrapper.append("div")
            let moreInfoButton = moreInfoWrapper.append("img")
            moreInfoWrapper.append("text").text("More Info")

            let tagWrapper = summaryWrapper.append("div")
            let seedWrapper = buttonWrapper.append("div")
            
            //Set the icons for the buttons
            let seedButton = seedWrapper.append("img")
            seedWrapper.append("text").text("Set Seed")
        
            seedButton.attr("src", "res/seed.svg")
            seedButton.style("cursor", "pointer")
            seedButton.attr("class", "button")
                     
            //set the on click functions
            moreInfoButton.on("click", function(){
                showMoreInfo(element)
            });
            
            seedButton.on("click", function(){
                setSeed(element)
            })
            
            //set the classes for the elements
            number.attr("class", "score")        
            title.attr("class", "articleTitle")
            year.attr("class", "yearInfo")
            buttonWrapper.attr("class", "buttonWrapper")
            tagWrapper.attr("class", "tagWrapper")

            //set the image for the more info button
            moreInfoButton.attr("src", "res/MoreDetails.svg")
            moreInfoButton.attr("class", "button")

            //Set the text for the elements
            number.append("text").text(element.cited_by_count)
            title.append("text").text(element.title)
            year.append("text").text(element.publication_year)

            //Taggging
            surveyThreashold = 100
            //If the article has refereenced more than 99 papers, it is tagged as a literature survey
            if(element.referenced_works.length >= surveyThreashold){ 
                let surveyWrapper = tagWrapper.append("div")
                let surveyButton = surveyWrapper.append("img")
                
                surveyWrapper.attr("class", "tag")
                surveyButton.attr("src", "res/litReview.svg")
                let survey = surveyWrapper.append("div")
                survey.text("Litearture Survey")
                   
            }

            if(element.counts_by_year.length > 0){
                
                //If a paper has been cited on average >= 10 time per year, tag as frequently cited
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
                //Otherwise the paper is unnoted
                let averageWrapper = tagWrapper.append("div")
                averageWrapper.attr("class", "tag")
                let averageButton = averageWrapper.append("img")
                averageButton.attr("src", "res/unnoted.svg")
                let average = averageWrapper.append("div")
                average.text("Unnoted")
            }
            
            //If a paper is 4 years or younger, tag as a new paper
            dateThreashold = 4
            if((new Date().getFullYear() - element.publication_year) <= dateThreashold){
                let novelWrapper = tagWrapper.append("div")
                novelWrapper.attr("class", "tag")
                let novelButton = novelWrapper.append("img")
                novelButton.attr("src", "res/new.svg")
                let novel = novelWrapper.append("div")
                novel.text("New Paper")
                
            }
            

        });
    }

//Get the elements abstract, author, and DOI. Use it to populate the modal
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

//Closes the modal
function closeMoreInfo(){
    d3.select(".modal").transition().style("opacity", 0.0)
    d3.select(".modal").style("display", "none")

}
//Set the seed for the network
function setSeed(article){
    seedArticle = article
    d3.select("#networkTitle").text(article.display_name)
}

