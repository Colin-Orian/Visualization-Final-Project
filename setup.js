const width = 850;
const height = 750;
startYearGlobal = null
endYearGlobal = null

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
data = readHierachy("./data/hierachy.csv")

data.then((d) => {

    openAlexData = readOpenAlex("./data/openalexworks.json")
    //currentData = openAlexData
    openAlexData.then((o) =>
    { 
        currentData = o
        startYearGlobal = d3.min(o, current => current.publication_year)
        
        endYearGlobal = d3.max(o, current => current.publication_year)

        filterData = () => {
            
            currentLeaves = currentRoot.leaves()
            //console.log(currentRoot.leaves());
            result = o.filter((m) =>{
                return (m.publication_year >= startYearGlobal && m.publication_year <= endYearGlobal)
            })

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
            updateTimeGraph(startYearGlobal, endYearGlobal)
            updateScrollable(currentData)
            updateOverview(currentData)
            
        }
        
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


isTimeline = true
d3.select("#timelineHeader").style("background-color", "lightblue")
                            .on("click", toggleTimeline)

d3.select("#networkHeader").style("cursor", "pointer")
                           .on("click", toggleNetwork)
networkSvg.style("display", "none")

filterContainer.append(svg.node());
lineGraphContainer.append(lineGraphSvg.node())
lineGraphContainer.append(networkSvg.node())

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