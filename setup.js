const width = 850;
const height = 750;
startYearGlobal = null
endYearGlobal = null
//each of the sections of the UI
const svg = d3.create("svg")
    
    .attr("width", width)
    .attr("height", height);

const lineGraphSvg = d3.create("svg")
        .attr("width", 900)
        .attr("height", 390)
        .attr("class", "linegraphsvg")

const networkSvg = d3.create("div")
            .attr("width", 900)
            .attr("height", 390)
            .attr("class", "networksvg")
currentRoot = null
filterData = null
currentData = null
currentLeaves = null
seedArticle = null
data = readHierachy("./data/hierachy.csv") //read the hiearchy data from the csv

data.then((d) => {

    openAlexData = readOpenAlex("./data/openalexworks.json") //read the openalex data
    //currentData = openAlexData
    openAlexData.then((o) =>
    { 
        //The current data is the data that all the vsulizations work on.
        //It will change depending on the filters, but right now it's the full dataset.
        currentData = o 

        startYearGlobal = d3.min(o, current => current.publication_year)
        
        endYearGlobal = d3.max(o, current => current.publication_year)
        
        //When there is a change to the topic filter or timeline filter, call this function to
        //filter the data.
        filterData = () => {
            
            currentLeaves = currentRoot.leaves()
            //are the leaves within the date range?
            result = o.filter((m) =>{
                return (m.publication_year >= startYearGlobal && m.publication_year <= endYearGlobal)
            })

            //are the leaves within the topic filter?
            topicFilter = result.filter((m) =>{
                entryTopics = m.topics.filter((t) =>{
                    return t.name == "topic"
                })
                
                for(leavesIndex = 0; leavesIndex < currentLeaves.length; leavesIndex ++) {
                    for(entryIndex = 0; entryIndex < entryTopics.length; entryIndex ++){
                        if(currentLeaves[leavesIndex].id == entryTopics[entryIndex].display_name){
                            return true
                        }
                    }
                }
                return false;
            })
            currentData = topicFilter
            //Since there was an update, update all visulizations
            updateTimeGraph(startYearGlobal, endYearGlobal)
            updateScrollable(currentData)
            updateOverview(currentData)
            
        }
        //make all the sections
        makeSunburst(d)
        currentLeaves = currentRoot.leaves()

        makeTimelineBar(startYearGlobal, endYearGlobal)
        makeTimelineGraph(startYearGlobal, endYearGlobal)
        makeScrollable(currentData)
        makeOverview(currentData)
        makeNetwork()
        
    }
    )
})


//This portion is to allow the user to toggle from the timeline graph to the network graph.
isTimeline = true
//d3.select("#timelineHeader").style("background-color", "lightblue")
    //                        .on("click", toggleTimeline)

//d3.select("#networkHeader").style("cursor", "pointer")
  //                         .on("click", toggleNetwork)


networkSvg.style("display", "none")
bottomHeaders = [d3.select("#timelineHeader"), d3.select("#networkHeader")]
bottomBodies = [lineGraphSvg, networkSvg]

setToggleHeaders(bottomHeaders, bottomBodies)
filterContainer.append(svg.node());
lineGraphContainer.append(lineGraphSvg.node())
lineGraphContainer.append(networkSvg.node())


function setToggleHeaders(headers, bodies){
    for(let i = 0; i < headers.length; i ++){
        headers[i].on("click", () => {
            for(let j = 0; j < bodies.length; j ++){
                if(j === i){
                    headers[j].attr("class", "headerSpacer-selected")
                    bodies[j].style("display", "initial")
                    
                }else{
                    headers[j].attr("class", "headerSpacer")
                    bodies[j].style("display", "none")
                    
                }
            }
        })
    }
}



function toggleNetwork(){
    if(isTimeline){
        d3.select("#networkHeader").style("background-color", "lightblue")
        d3.select("#networkHeader").style("cursor", "default")

        d3.select("#timelineHeader").style("background-color", "cadetblue")
        d3.select("#timelineHeader").style("cursor", "pointer")
        isTimeline = false
        lineGraphSvg.style("display", "none")
        networkSvg.style("display", "initial")
    }
    
}

function toggleTimeline(){
    if(!isTimeline){
        d3.select("#timelineHeader").style("background-color", "lightblue")
        d3.select("#timelineHeader").style("cursor", "default")

        d3.select("#networkHeader").style("cursor", "pointer")
        d3.select("#networkHeader").style("background-color", "cadetblue")
        d3.select("#networkHeader").style("cursor", "pointer")
        console.log("test")
        lineGraphSvg.style("display", "initial")
        networkSvg.style("display", "none")
        isTimeline = true
    }
    
}